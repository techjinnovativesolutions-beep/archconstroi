/**
 * Arch Constroi – Engenharia e Construção Civil
 * Aplicação principal (Cloudflare Workers + Durable Objects + D1)
 * Desenvolvido por: Tech J Innovative Solutions
 *
 * Migração fiel do antigo app/main.py (FastAPI/Uvicorn, Python):
 *  - mesmas rotas, páginas e API (/, /sobre-nos, /nossos-servicos,
 *    /contactos, /painel/*, /api/*, /robots.txt, /ws/*);
 *  - mesmo middleware de segurança (flood 240 req/min, detecção de
 *    injecção, modo de manutenção, cabeçalhos CSP/HSTS);
 *  - sessões assinadas com expiração de 4 h, CSRF por token de sessão,
 *    login com PBKDF2 e bloqueio anti força bruta;
 *  - tempo real via WebSocket num Durable Object (src/hub.js).
 */
import {
  cfg, SERVICES, SITE_NAME, SITE_FULL_NAME,
  SESSION_COOKIE, SESSION_MAX_AGE,
  getSecret, getAdminCreds, getSmtp,
} from "./config.js";
import * as db from "./db.js";
import {
  SECURITY_HEADERS, clean, csrfOk, isMalicious, newCsrf,
  validateLead, verifyPassword, hashPassword, loadSession, dumpSession,
} from "./security.js";
import { renderTemplate } from "./render.js";
import { IMAGENS } from "./manifest.js";
import { sendEmail } from "./smtp.js";

export { ChatHub } from "./hub.js";
export { RateLimiter } from "./limiter.js";

/* Templates Jinja2 (mantidos sem alterações; renderizados por src/render.js) */
import baseHtml from "../templates/base.html";
import indexHtml from "../templates/index.html";
import sobreHtml from "../templates/sobre.html";
import servicosHtml from "../templates/servicos.html";
import contactosHtml from "../templates/contactos.html";
import adminLoginHtml from "../templates/admin_login.html";
import adminDashboardHtml from "../templates/admin_dashboard.html";
import manutencaoHtml from "../templates/manutencao.html";

const TEMPLATES = {
  "base.html": baseHtml,
  "index.html": indexHtml,
  "sobre.html": sobreHtml,
  "servicos.html": servicosHtml,
  "contactos.html": contactosHtml,
  "admin_login.html": adminLoginHtml,
  "admin_dashboard.html": adminDashboardHtml,
  "manutencao.html": manutencaoHtml,
};

const NEUTRAL_MSG = "Em breve estaremos disponíveis — estamos com problemas de conexão.";
const ESTADOS_VALIDOS = new Set(["novo", "em_andamento", "concluido", "arquivado"]);

/* ------------------------------------------------------------------ */
/* Utilitários HTTP                                                    */
/* ------------------------------------------------------------------ */

class HttpError extends Error {
  constructor(status, body) {
    super(typeof body === "string" ? body : body?.detail || "erro");
    this.status = status;
    this.body = body;
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function html(content, status = 200) {
  return new Response(content, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function text(content, status = 200) {
  return new Response(content, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

function redirect(location, status = 302, setCookies = []) {
  const headers = new Headers({ Location: location });
  for (const c of setCookies) headers.append("Set-Cookie", c);
  return new Response(null, { status, headers });
}

function clientIp(request) {
  const fwd = request.headers.get("x-forwarded-for") || "";
  if (fwd) return fwd.split(",")[0].trim().slice(0, 45);
  return request.headers.get("cf-connecting-ip") || "0.0.0.0";
}

function parseCookies(header) {
  const out = {};
  for (const part of (header || "").split(";")) {
    const idx = part.indexOf("=");
    if (idx < 0) continue;
    out[part.slice(0, idx).trim()] = part.slice(idx + 1).trim();
  }
  return out;
}

function readSession(request, env) {
  return loadSession(
    parseCookies(request.headers.get("cookie"))[SESSION_COOKIE],
    getSecret(env),
    SESSION_MAX_AGE
  );
}

async function sessionCookie(env, data) {
  const value = await dumpSession(data, getSecret(env), SESSION_MAX_AGE);
  return `${SESSION_COOKIE}=${value}; Path=/; Max-Age=${SESSION_MAX_AGE}; HttpOnly; SameSite=Strict; Secure`;
}

const deleteSessionCookie = () =>
  `${SESSION_COOKIE}=deleted; Path=/; Max-Age=0; HttpOnly; SameSite=Strict; Secure`;

function render(name, context, status = 200, setCookies = []) {
  const resp = html(renderTemplate(name, context, TEMPLATES), status);
  for (const c of setCookies) resp.headers.append("Set-Cookie", c);
  return resp;
}

const ctx = (extra) => Object.assign({ cfg, services: SERVICES }, extra);
const gallery = (folder) => IMAGENS[folder] || [];

/* Rate limiter (Durable Object) — mesma API do RateLimiter do Python. */
async function limiterOp(env, payload) {
  try {
    const stub = env.RATE_LIMITER.get(env.RATE_LIMITER.idFromName("global"));
    const r = await stub.fetch("https://rate-limiter.archconstroi.internal/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return await r.json();
  } catch {
    return { ok: true, secs: 0 };
  }
}

/* Notificação do hub de tempo real (Durable Object). */
async function hubNotify(env, payload) {
  try {
    const stub = env.CHAT_HUB.get(env.CHAT_HUB.idFromName("hub"));
    await stub.fetch("https://hub.archconstroi.internal/notify", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch (e) { console.error("[hubNotify] falha:", e); /* nunca partir o pedido */ }
}

function requireAdmin(sess) {
  if (!sess?.admin) throw new HttpError(401, { detail: "Sessão expirada" });
  return sess;
}

/* ------------------------------------------------------------------ */
/* Middleware de segurança + router                                    */
/* ------------------------------------------------------------------ */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const ip = clientIp(request);

    /* Flood global — 240 pedidos/min por IP (bloqueio 120 s) */
    const flood = await limiterOp(env, {
      op: "check", key: `glob:${ip}`, limit: 240, window: 60, block: 120,
    });
    if (!flood.ok) {
      await db.addAlert(
        env.DB, "aviso", "waf", "Excesso de requisições bloqueado",
        `O IP ${ip} ultrapassou o limite de 240 pedidos/minuto.`,
        "Verifique os registos de auditoria; considere bloquear o IP na firewall da Cloudflare."
      ).catch(() => {});
      return text(NEUTRAL_MSG, 429);
    }

    /* Query string / caminho maliciosos.
     * Nota: o runtime normaliza/percent-codifica o URL; verifica-se também
     * a forma descodificada para apanhar payloads enviados em bruto,
     * exactamente como o middleware Python verificava a query crua. */
    const rawQuery = url.search.slice(1);
    let decodedQuery = rawQuery;
    try { decodedQuery = decodeURIComponent(rawQuery); } catch { /* mantém */ }
    if (isMalicious(rawQuery) || isMalicious(decodedQuery) || isMalicious(path)) {
      await Promise.all([
        db.addAlert(
          env.DB, "critico", "waf", "Tentativa de injecção bloqueada",
          `IP ${ip} enviou payload suspeito em ${path}${url.search}`,
          "Payload rejeitado automaticamente. Reveja regras de WAF se for recorrente."
        ),
        db.logAudit(env.DB, "waf_block", ip, url.toString()),
      ]).catch(() => {});
      return text(NEUTRAL_MSG, 400);
    }

    /* Modo de manutenção (painel e estáticos continuam acessíveis).
     * Nota: /api/admin/* mantém-se acessível para o painel poder gerir a
     * manutenção (no backend Python o estado reiniciava com o processo;
     * aqui é persistido no D1, pelo que o painel precisa sempre de o
     * conseguir desactivar). */
    if (!path.startsWith("/painel") && !path.startsWith("/static") &&
        !path.startsWith("/api/admin")) {
      const manut = await db.getMaintenance(env.DB);
      if (manut.on) {
        return render("manutencao.html", ctx({ motivo: manut.reason }), 503);
      }
    }

    let response;
    try {
      response = await route(request, env, url, path, ip);
    } catch (exc) {
      if (exc instanceof HttpError) return json(exc.body, exc.status);
      await db.addAlert(
        env.DB, "critico", "runtime", "Erro interno na aplicação",
        `${exc?.constructor?.name || "Error"}: ${exc?.message || exc} em ${path}`,
        "Corrigir manualmente no código-fonte indicado pelo traceback."
      ).catch(() => {});
      return text(NEUTRAL_MSG, 500);
    }

    /* Cabeçalhos de segurança — aplicados às respostas do router,
     * tal como o middleware do backend Python fazia após call_next.
     * (Copia-se a resposta porque as respostas dos Assets têm cabeçalhos
     * imutáveis.) */
    const final = new Response(response.body, response);
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
      final.headers.set(k, v);
    }
    final.headers.set("Server", "ArchConstroi");
    return final;
  },
};

async function route(request, env, url, path, ip) {
  const method = request.method;

  /* ---------------- ficheiros estáticos ----------------
   * Os ficheiros vivem em ./static (assets do Worker); o URL público
   * mantém o prefixo /static/..., exactamente como no backend Python. */
  if (path.startsWith("/static/")) {
    const u = new URL(request.url);
    u.pathname = path.slice("/static".length);
    u.search = url.search;
    return env.ASSETS.fetch(new Request(u.toString(), { method: "GET" }));
  }

  /* ---------------- páginas públicas ---------------- */
  if (method === "GET" && path === "/") {
    return render("index.html", ctx({
      hero: gallery("hero"),
      history: gallery("history"),
      obras: gallery("obras").slice(0, 9),
      page: "home",
    }));
  }
  if (method === "GET" && path === "/sobre-nos") {
    return render("sobre.html", ctx({ obras: gallery("obras"), page: "sobre" }));
  }
  if (method === "GET" && path === "/nossos-servicos") {
    return render("servicos.html", ctx({ obras: gallery("obras"), page: "servicos" }));
  }
  if (method === "GET" && path === "/contactos") {
    const token = newCsrf();
    const sess = await readSession(request, env);
    sess.csrf = token;
    return render("contactos.html", ctx({ csrf: token, page: "contactos" }), 200,
      [await sessionCookie(env, sess)]);
  }

  /* ---------------- API pública ---------------- */
  if (path === "/api/solicitacao") {
    if (method !== "POST") throw new HttpError(405, { detail: "Method Not Allowed" });
    return novaSolicitacao(request, env, ip);
  }

  /* ---------------- painel administrativo ---------------- */
  if (method === "GET" && path === "/painel") {
    const sess = await readSession(request, env);
    return redirect(sess.admin ? "/painel/dashboard" : "/painel/login");
  }
  if (path === "/painel/login") {
    if (method === "GET") return loginPage(request, env, url);
    if (method === "POST") return loginAction(request, env, ip);
    throw new HttpError(405, { detail: "Method Not Allowed" });
  }
  if (method === "GET" && path === "/painel/logout") {
    const resp = redirect("/painel/login", 302, [deleteSessionCookie()]);
    await db.logAudit(env.DB, "logout", ip).catch(() => {});
    return resp;
  }
  if (method === "GET" && path === "/painel/dashboard") {
    return dashboard(request, env);
  }

  /* ---------------- API administrativa ---------------- */
  if (method === "GET" && path === "/api/admin/leads") {
    const sess = requireAdmin(await readSession(request, env));
    const estado = url.searchParams.get("estado") || "todos";
    const q = url.searchParams.get("q") || "";
    return json({
      leads: await db.listLeads(env.DB, estado, clean(q, 60) || null),
      stats: await db.stats(env.DB),
    });
  }

  let m;
  if ((m = path.match(/^\/api\/admin\/lead\/(\d+)$/)) && method === "GET") {
    requireAdmin(await readSession(request, env));
    const leadId = parseInt(m[1], 10);
    const lead = await db.getLead(env.DB, leadId);
    if (!lead) throw new HttpError(404, { detail: "Solicitação não encontrada" });
    return json({ lead, mensagens: await db.listMessages(env.DB, leadId) });
  }
  if ((m = path.match(/^\/api\/admin\/lead\/(\d+)\/estado$/)) && method === "POST") {
    return apiEstado(request, env, ip, parseInt(m[1], 10));
  }
  if ((m = path.match(/^\/api\/admin\/lead\/(\d+)\/responder$/)) && method === "POST") {
    return apiResponder(request, env, parseInt(m[1], 10));
  }
  if (method === "POST" && path === "/api/admin/manutencao") {
    return apiManutencao(request, env, ip);
  }
  if (method === "POST" && path === "/api/admin/alertas/lidos") {
    requireAdmin(await readSession(request, env));
    await db.markAlertsRead(env.DB);
    return json({ ok: true });
  }
  if (method === "GET" && path === "/api/admin/diagnostico") {
    return apiDiagnostico(env);
  }

  /* ---------------- tempo real (WebSocket → Durable Object) ------- */
  if ((path === "/ws/painel" || /^\/ws\/cliente\/\d+$/.test(path)) &&
      (request.headers.get("Upgrade") || "").toLowerCase() === "websocket") {
    const stub = env.CHAT_HUB.get(env.CHAT_HUB.idFromName("hub"));
    return stub.fetch(request);
  }

  /* ---------------- robots.txt ---------------- */
  if (method === "GET" && path === "/robots.txt") {
    return text("User-agent: *\nDisallow: /painel\nDisallow: /api\nAllow: /\n");
  }

  throw new HttpError(404, { detail: "Not Found" });
}

/* ------------------------------------------------------------------ */
/* Submissão de solicitação (equivalente a nova_solicitacao)           */
/* ------------------------------------------------------------------ */
async function novaSolicitacao(request, env, ip) {
  const lim = await limiterOp(env, {
    op: "check", key: `lead:${ip}`, limit: 5, window: 600, block: 900,
  });
  if (!lim.ok) {
    return json({ ok: false, erro: "Demasiadas submissões. Tente novamente mais tarde." }, 429);
  }

  const payload = await request.json();
  const sess = await readSession(request, env);
  if (!csrfOk(sess.csrf, payload?.csrf)) {
    await db.logAudit(env.DB, "csrf_fail", ip, "/api/solicitacao").catch(() => {});
    return json({ ok: false, erro: "Sessão inválida. Recarregue a página." }, 403);
  }

  const v = validateLead(payload);
  if (!v.ok) return json({ ok: false, erro: v.erro }, 400);

  const leadId = await db.insertLead(env.DB, v.dados, ip);
  await db.addMessage(env.DB, leadId, "cliente", "painel", v.dados.mensagem);
  await db.logAudit(env.DB, "nova_solicitacao", ip, `lead #${leadId} – ${v.dados.email}`);
  await hubNotify(env, {
    scope: "admins",
    payload: {
      tipo: "novo_lead",
      lead: { id: leadId, ...v.dados, created_at: db.now() },
    },
  });

  return json({
    ok: true,
    id: leadId,
    mensagem: "Solicitação recebida com sucesso. A nossa equipa responde em até 24 horas úteis.",
  });
}

/* ------------------------------------------------------------------ */
/* Login / dashboard                                                   */
/* ------------------------------------------------------------------ */
async function loginPage(request, env, url) {
  const token = newCsrf();
  const sess = await readSession(request, env);
  sess.csrf = token;
  const erro = clean(url.searchParams.get("erro") || "", 200);
  return render("admin_login.html", ctx({ csrf: token, erro }), 200,
    [await sessionCookie(env, sess)]);
}

async function loginAction(request, env, ip) {
  const lim = await limiterOp(env, {
    op: "check", key: `login:${ip}`, limit: 5, window: 300, block: 600,
  });
  if (!lim.ok) {
    const bf = await limiterOp(env, { op: "blocked_for", key: `login:${ip}` });
    await db.addAlert(
      env.DB, "critico", "auth", "Possível ataque de força bruta",
      `5+ tentativas falhadas de login a partir do IP ${ip}.`,
      "IP bloqueado temporariamente. Considere bloqueio permanente na firewall da Cloudflare."
    ).catch(() => {});
    return redirect(`/painel/login?erro=Bloqueado por ${bf.secs}s (força bruta)`);
  }

  const fd = await request.formData();
  const username = String(fd.get("username") ?? "");
  const password = String(fd.get("password") ?? "");
  const csrf = String(fd.get("csrf") ?? "");

  const sess = await readSession(request, env);
  if (!csrfOk(sess.csrf, csrf)) {
    return redirect("/painel/login?erro=Sessão inválida, tente novamente");
  }

  // garante a conta definida por ARCH_ADMIN_USER/ARCH_ADMIN_PASS
  // (equivale ao init_db() executado no arranque do backend Python)
  const creds = getAdminCreds(env);
  await db.ensureAdmin(env.DB, creds.user, creds.pass, hashPassword).catch(() => {});

  const admin = await db.getAdmin(env.DB, clean(username, 60));
  if (!admin || !(await verifyPassword(password, admin.password_hash))) {
    await db.logAudit(env.DB, "login_falhado", ip, `user=${username.slice(0, 40)}`).catch(() => {});
    return redirect("/painel/login?erro=Credenciais inválidas");
  }

  await limiterOp(env, { op: "reset", key: `login:${ip}` });
  await db.logAudit(env.DB, "login_ok", ip, `user=${admin.username}`);
  return redirect("/painel/dashboard", 302, [
    await sessionCookie(env, { admin: admin.username, csrf: newCsrf() }),
  ]);
}

async function dashboard(request, env) {
  const sess = await readSession(request, env);
  if (!sess.admin) return redirect("/painel/login");
  const token = sess.csrf || newCsrf();
  sess.csrf = token;
  return render("admin_dashboard.html", ctx({
    admin: sess.admin,
    csrf: token,
    stats: await db.stats(env.DB),
    leads: await db.listLeads(env.DB),
    alertas: await db.listAlerts(env.DB),
    auditoria: await db.listAudit(env.DB),
    manutencao: await db.getMaintenance(env.DB),
  }), 200, [await sessionCookie(env, sess)]);
}

/* ------------------------------------------------------------------ */
/* API administrativa                                                  */
/* ------------------------------------------------------------------ */
async function apiEstado(request, env, ip, leadId) {
  const sess = requireAdmin(await readSession(request, env));
  const body = await request.json();
  if (!csrfOk(sess.csrf, body?.csrf)) throw new HttpError(403, { detail: "CSRF inválido" });
  const estado = clean(body?.estado || "", 20);
  if (!ESTADOS_VALIDOS.has(estado)) throw new HttpError(400, { detail: "Estado inválido" });
  await db.updateLeadState(env.DB, leadId, estado);
  await db.logAudit(env.DB, "estado_alterado", ip, `lead #${leadId} -> ${estado}`);
  return json({ ok: true, stats: await db.stats(env.DB) });
}

async function apiResponder(request, env, leadId) {
  const sess = requireAdmin(await readSession(request, env));
  const body = await request.json();
  if (!csrfOk(sess.csrf, body?.csrf)) throw new HttpError(403, { detail: "CSRF inválido" });

  const lead = await db.getLead(env.DB, leadId);
  if (!lead) throw new HttpError(404, { detail: "Solicitação não encontrada" });

  const corpo = clean(body?.corpo || "", 4000);
  let canal = clean(body?.canal || "painel", 10);
  if (!["painel", "email", "sms"].includes(canal)) canal = "painel";
  if (corpo.length < 2) throw new HttpError(400, { detail: "Mensagem vazia" });

  await db.addMessage(env.DB, leadId, "admin", canal, corpo);

  let nota = "Guardado no painel.";
  if (canal === "email") {
    const [ok, resultado] = await sendEmail(
      getSmtp(env), lead.email,
      `${SITE_NAME} – resposta à sua solicitação #${leadId}`, corpo
    );
    nota = resultado;
    if (!ok && nota.startsWith("Falha SMTP")) {
      await db.addAlert(
        env.DB, "aviso", "smtp", "Falha no envio de e-mail", nota,
        "Verifique as credenciais SMTP nas variáveis de ambiente."
      ).catch(() => {});
    }
  } else if (canal === "sms") {
    nota = `Ligação/SMS preparada para ${lead.telefone} (tel:${lead.telefone.replace(/ /g, "")}).`;
  }

  const created = db.now();
  await hubNotify(env, {
    scope: "both",
    lead_id: leadId,
    payloadClient: { tipo: "msg_admin", corpo, created_at: created },
    payloadAdmins: { tipo: "msg_admin", lead_id: leadId, corpo, canal, created_at: created },
  });

  return json({
    ok: true,
    nota,
    links: {
      mailto: `mailto:${lead.email}?subject=Arch%20Constroi%20%23${leadId}`,
      tel: `tel:${lead.telefone.replace(/ /g, "")}`,
    },
  });
}

async function apiManutencao(request, env, ip) {
  const sess = requireAdmin(await readSession(request, env));
  const body = await request.json();
  if (!csrfOk(sess.csrf, body?.csrf)) throw new HttpError(403, { detail: "CSRF inválido" });
  const manut = await db.setMaintenance(env.DB, {
    on: Boolean(body?.on),
    reason: clean(body?.reason || "", 200),
  });
  await db.logAudit(env.DB, "manutencao", ip, `on=${manut.on ? "True" : "False"}`);
  return json({ ok: true, manutencao: manut });
}

/**
 * Diagnóstico — equivalente a api_diagnostico do Python, agora para a pilha
 * JavaScript/Cloudflare: verifica os bindings/componentes de que a aplicação
 * depende e regista alertas com a acção correctiva quando algo falta.
 */
async function apiDiagnostico(env) {
  const resultados = [];
  const verifica = (pacote, presente, versao, minimo, accao) => {
    const estado = presente ? "ok" : "actualizar";
    resultados.push({ pacote, versao, estado, minimo });
    if (!presente) {
      db.addAlert(
        env.DB, "aviso", "dependencias", `${pacote} em falta`,
        `Componente ${pacote} não está disponível neste ambiente.`, accao
      ).catch(() => {});
    }
  };

  verifica("cloudflare-d1", Boolean(env.DB), env.DB ? "SQLite (D1)" : "—",
    "binding DB", "Associe a base D1 ao binding DB no wrangler.jsonc.");
  verifica("durable-object-chat", Boolean(env.CHAT_HUB), env.CHAT_HUB ? "WebSocket" : "—",
    "binding CHAT_HUB", "Defina a classe ChatHub em durable_objects.");
  verifica("durable-object-waf", Boolean(env.RATE_LIMITER), env.RATE_LIMITER ? "activo" : "—",
    "binding RATE_LIMITER", "Defina a classe RateLimiter em durable_objects.");
  verifica("static-assets", Boolean(env.ASSETS), env.ASSETS ? "activos" : "—",
    "binding ASSETS", "Configure assets.directory no wrangler.jsonc.");
  resultados.push({
    pacote: "javascript", versao: "ES2022 · Workers runtime",
    estado: "ok", minimo: "ES2020",
  });

  return json({ ok: true, resultados, alertas: await db.listAlerts(env.DB, 20) });
}
