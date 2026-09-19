/**
 * Arch Constroi – Teste ponta-a-ponta da migração Python → JavaScript/Cloudflare
 * Desenvolvido por: Tech J Innovative Solutions
 *
 * Verifica, contra o servidor local (`npm run dev` em http://localhost:8080):
 *   páginas públicas, estáticos, robots.txt, cabeçalhos de segurança,
 *   login/logout com sessões assinadas + CSRF + PBKDF2,
 *   submissão de solicitação (formulário), API administrativa,
 *   modo de manutenção, WAF anti-injecção e rate limiting,
 *   comunicação em tempo real por WebSocket (cliente ↔ painel)
 *   com os dados históricos preservados no D1.
 *
 * Uso: node tests/e2e.mjs
 */
import WebSocket from "ws";

const BASE = process.env.BASE || "http://localhost:8080";
let pass = 0, fail = 0;

function ok(cond, nome, extra = "") {
  if (cond) { pass++; console.log(`  ✔ ${nome}`); }
  else { fail++; console.log(`  ✘ ${nome}${extra ? " — " + extra : ""}`); }
}

/* Gestão simples de cookies por "jarra" */
function newJar() { return new Map(); }
function cookieHeader(jar) {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}
function storeCookies(jar, resp) {
  for (const sc of resp.headers.getSetCookie?.() || []) {
    const [pair] = sc.split(";");
    const idx = pair.indexOf("=");
    const name = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1);
    if (sc.toLowerCase().includes("max-age=0") || value === "deleted") jar.delete(name);
    else jar.set(name, value);
  }
}
async function get(jar, path, headers = {}) {
  const resp = await fetch(BASE + path, {
    headers: { cookie: cookieHeader(jar), ...headers }, redirect: "manual",
  });
  storeCookies(jar, resp);
  return resp;
}
async function post(jar, path, body, type = "json", headers = {}) {
  const init = { method: "POST", redirect: "manual", headers: { cookie: cookieHeader(jar), ...headers } };
  if (type === "json") {
    init.headers["content-type"] = "application/json";
    init.body = JSON.stringify(body);
  } else {
    init.body = new URLSearchParams(body).toString();
    init.headers["content-type"] = "application/x-www-form-urlencoded";
  }
  const resp = await fetch(BASE + path, init);
  storeCookies(jar, resp);
  return resp;
}
const csrfFrom = (html) =>
  html.match(/name="csrf" value="([^"]+)"/)?.[1] ||
  html.match(/id="csrf" value="([^"]+)"/)?.[1];

/** Normaliza acentos vindos de cabeçalhos HTTP (latin1 ↔ utf-8). */
function norm(s) {
  try { return decodeURIComponent(escape(s)); } catch { return s; }
}

function connectWs(path, headers = {}) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(BASE.replace(/^http/, "ws") + path, { headers });
    const inbox = [];
    const waiters = [];
    ws.on("message", (data) => {
      const msg = JSON.parse(String(data));
      if (waiters.length) waiters.shift()(msg);
      else inbox.push(msg);
    });
    ws.on("open", () => resolve({
      ws, inbox,
      next: (timeout = 6000) => new Promise((res, rej) => {
        if (inbox.length) return res(inbox.shift());
        const t = setTimeout(() => rej(new Error("timeout à espera de mensagem WS")), timeout);
        waiters.push((m) => { clearTimeout(t); res(m); });
      }),
      send: (o) => ws.send(JSON.stringify(o)),
      close: () => ws.close(),
    }));
    ws.on("error", reject);
  });
}

const admin = newJar();
let adminCsrf = "";

console.log("== Páginas públicas e estáticos ==");
{
  const anon = newJar();
  for (const p of ["/", "/sobre-nos", "/nossos-servicos", "/contactos"]) {
    const r = await get(anon, p);
    const body = await r.text();
    ok(r.status === 200 && body.includes("ARCH"), `GET ${p} → 200 HTML`);
  }
  const css = await get(anon, "/static/css/estilo.css");
  ok(css.status === 200 && (css.headers.get("content-type") || "").includes("text/css"),
     "CSS servido pelos Assets");
  const robots = await (await get(anon, "/robots.txt")).text();
  ok(robots.includes("Disallow: /painel"), "robots.txt correcto");
  const home = await get(anon, "/");
  ok(home.headers.get("content-security-policy")?.includes("frame-ancestors 'self'"), "CSP activo");
  ok(home.headers.get("strict-transport-security")?.includes("max-age=31536000"), "HSTS activo");
  ok(home.headers.get("server") === "ArchConstroi", "Cabeçalho Server mascarado");
  const api = await get(anon, "/api/admin/leads");
  ok(api.status === 401, "API admin exige sessão (401 sem login)");
}

console.log("== Autenticação (sessões assinadas, CSRF, PBKDF2) ==");
{
  const html = await (await get(admin, "/painel/login")).text();
  const loginCsrf = csrfFrom(html);
  ok(Boolean(loginCsrf) && admin.has("arch_sid"), "página de login devolve csrf + cookie de sessão");

  const bad = await post(admin, "/painel/login",
    { username: "arch", password: "errada", csrf: loginCsrf }, "form");
  ok(bad.status === 302 && norm(bad.headers.get("location") || "").includes("Credenciais"),
     "palavra-passe errada rejeitada");

  const noCsrf = await post(admin, "/painel/login",
    { username: "arch", password: "A4cc@", csrf: "invalido" }, "form");
  ok(noCsrf.status === 302 && norm(noCsrf.headers.get("location") || "").includes("Sessão inválida"),
     "CSRF inválido rejeitado");

  const good = await post(admin, "/painel/login",
    { username: "arch", password: "A4cc@", csrf: loginCsrf }, "form");
  ok(good.status === 302 && good.headers.get("location") === "/painel/dashboard",
     "login com conta histórica 'arch' (hash PBKDF2 do SQLite original)");

  const dashHtml = await (await get(admin, "/painel/dashboard")).text();
  ok(dashHtml.includes("Bem-vindo, arch"), "dashboard acessível após login");
  adminCsrf = csrfFrom(dashHtml);
  ok(Boolean(adminCsrf), "csrf do painel renovado");

  const dados = await (await get(admin, "/api/admin/leads")).json();
  ok(dados.leads.length >= 6 && dados.stats.total >= 6,
     `dados históricos preservados (${dados.stats.total} solicitações, ${dados.stats.mensagens} mensagens)`);
  ok(dados.leads.some((l) => l.nome === "João Silva" && l.empresa === "Home Live"),
     "registo histórico íntegro (lead #7 João Silva / Home Live)");
}

console.log("== Tempo real: WebSocket do painel ==");
let adminWs;
{
  adminWs = await connectWs("/ws/painel", { cookie: cookieHeader(admin) });
  const ligado = await adminWs.next();
  ok(ligado.tipo === "ligado" && ligado.stats, "WebSocket autenticado recebe 'ligado' + stats");

  adminWs.send({ tipo: "ping" });
  const pong = await adminWs.next();
  ok(pong.tipo === "pong" && pong.stats, "ping/pong mantém a ligação viva");

  // ligação sem sessão deve ser recusada (código 4401, como no Python)
  const semSessao = await new Promise((resolve) => {
    const ws = new WebSocket(BASE.replace(/^http/, "ws") + "/ws/painel");
    ws.on("close", (code) => resolve(code));
    ws.on("error", () => resolve(-1));
  });
  ok(semSessao === 4401, "WebSocket do painel sem sessão fechado com 4401");
}

console.log("== Formulário de solicitação + chat cliente↔painel ==");
let novoLeadId = 0;
{
  const visitante = newJar();
  const csrfV = csrfFrom(await (await get(visitante, "/contactos")).text());
  ok(Boolean(csrfV), "página de contactos devolve csrf ao visitante");

  const semCsrf = await post(visitante, "/api/solicitacao",
    { nome: "Teste E2E", email: "e2e@teste.ao", telefone: "923000000",
      mensagem: "mensagem de teste sem csrf para ser bloqueada", servico: "Geral", empresa: "" });
  ok(semCsrf.status === 403, "submissão sem CSRF bloqueada (403)");

  const mal = await post(visitante, "/api/solicitacao",
    { csrf: csrfV, nome: "X<script>", email: "a@b.co", telefone: "923000000",
      mensagem: "mensagem com conteudo malicioso para a validacao rejeitar",
      servico: "Geral", empresa: "" });
  ok(mal.status === 400, "conteúdo malicioso rejeitado pela validação");

  const sub = await post(visitante, "/api/solicitacao", {
    csrf: csrfV,
    nome: "Teste Migração E2E",
    empresa: "Arena Testes Lda",
    email: "e2e@teste.ao",
    telefone: "+244 923 000 001",
    servico: "Remodelação e Acabamentos",
    mensagem: "Solicitação criada pelo teste de migração Python → Cloudflare.",
  });
  const subJ = await sub.json();
  ok(sub.status === 200 && subJ.ok && subJ.id > 7, `nova solicitação aceite (id=${subJ.id})`);
  novoLeadId = subJ.id;

  const novoLead = await adminWs.next();
  ok(novoLead.tipo === "novo_lead" && novoLead.lead?.id === novoLeadId,
     "painel notificado em tempo real (evento novo_lead)");

  const cliWs = await connectWs(`/ws/cliente/${novoLeadId}`);
  const hist = await cliWs.next();
  ok(hist.tipo === "historico" && hist.msg.autor === "cliente",
     "cliente recebe histórico da conversa ao ligar");

  cliWs.send({ corpo: "Olá! Alguém disponível?" });
  const msgCliente = await adminWs.next();
  ok(msgCliente.tipo === "msg_cliente" && msgCliente.lead_id === novoLeadId,
     "mensagem do cliente chega ao painel via WebSocket");

  const resp = await post(admin, `/api/admin/lead/${novoLeadId}/responder`,
    { csrf: adminCsrf, corpo: "Olá! Respondido pelo teste E2E.", canal: "painel" });
  const respJ = await resp.json();
  ok(resp.status === 200 && respJ.ok && respJ.nota === "Guardado no painel.",
     "resposta do painel aceite");
  ok(respJ.links?.mailto?.startsWith("mailto:e2e@teste.ao"), "links mailto/tel gerados");

  const noCliente = await cliWs.next();
  ok(noCliente.tipo === "msg_admin" && noCliente.corpo.includes("E2E"),
     "cliente recebe a resposta em tempo real");

  // canal chat alternativo do painel (evento "chat" dentro do WS)
  adminWs.send({ tipo: "chat", lead_id: novoLeadId, corpo: "Mensagem via canal chat do WS." });
  const viaChat = await cliWs.next();
  ok(viaChat.tipo === "msg_admin" && viaChat.corpo.includes("canal chat"),
     "evento 'chat' do WebSocket do painel chega ao cliente");

  const ws404 = await new Promise((resolve) => {
    const ws = new WebSocket(BASE.replace(/^http/, "ws") + "/ws/cliente/999999");
    ws.on("close", (code) => resolve(code));
    ws.on("error", () => resolve(-1));
  });
  ok(ws404 === 4004, "WebSocket de cliente para lead inexistente fechado com 4004");

  cliWs.close();
}

console.log("== API administrativa (estados, diagnóstico, manutenção) ==");
{
  const est = await post(admin, `/api/admin/lead/${novoLeadId}/estado`,
    { csrf: adminCsrf, estado: "em_andamento" });
  ok(est.status === 200 && (await est.json()).ok, "alteração de estado aceite");
  const estBad = await post(admin, `/api/admin/lead/${novoLeadId}/estado`,
    { csrf: adminCsrf, estado: "inexistente" });
  ok(estBad.status === 400, "estado inválido rejeitado (400)");

  const diag = await (await get(admin, "/api/admin/diagnostico")).json();
  ok(diag.ok && diag.resultados.length >= 5,
     `diagnóstico da pilha JS/Cloudflare (${diag.resultados.length} componentes)`);

  const manutOn = await post(admin, "/api/admin/manutencao",
    { csrf: adminCsrf, on: true, reason: "teste e2e" });
  ok((await manutOn.json()).manutencao?.on === true, "modo de manutenção activado");
  const anon = newJar();
  const home = await get(anon, "/");
  ok(home.status === 503 && (await home.text()).includes("Em breve estaremos disponíveis"),
     "site público em manutenção (503)");
  const painel = await get(admin, "/painel/dashboard");
  ok(painel.status === 200, "painel continua acessível durante manutenção");

  const manutOff = await post(admin, "/api/admin/manutencao",
    { csrf: adminCsrf, on: false, reason: "" });
  ok((await manutOff.json()).manutencao?.on === false,
     "admin consegue desactivar manutenção mesmo com ela activa");
  const home2 = await get(newJar(), "/");
  ok(home2.status === 200, "site público volta ao normal após desactivar");

  const lidos = await post(admin, "/api/admin/alertas/lidos", {});
  ok((await lidos.json()).ok, "alertas marcados como lidos");

  const logout = await get(admin, "/painel/logout");
  ok(logout.status === 302 && !admin.has("arch_sid"), "logout limpa a sessão");
  const depois = await get(admin, "/painel/dashboard");
  ok(depois.status === 302, "dashboard inacessível após logout");
}

console.log("== WAF e rate limiting ==");
{
  const anon = newJar();
  const inj = await get(anon, "/?q=<script>alert(1)</script>");
  ok(inj.status === 400, "query string maliciosa bloqueada (400)");

  let ultimo = 0, got429 = false;
  for (let i = 0; i < 8; i++) {
    ultimo = (await post(anon, "/api/solicitacao", { x: 1 })).status;
    if (ultimo === 429) { got429 = true; break; }
  }
  ok(got429, "rate limit de submissões (5/10 min) activo");
}

adminWs?.close();
console.log(`\n${fail === 0 ? "✅ TUDO OK" : "❌ FALHAS"}: ${pass} passaram, ${fail} falharam.`);
process.exit(fail === 0 ? 0 : 1);
