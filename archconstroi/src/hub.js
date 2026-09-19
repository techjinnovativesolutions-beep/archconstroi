/**
 * Arch Constroi – Hub de tempo real (Durable Object + WebSocket)
 * Desenvolvido por: Tech J Innovative Solutions
 *
 * Substitui a classe Hub e os endpoints WebSocket do antigo app/main.py
 * (FastAPI, Python). Mantém exactamente o mesmo protocolo:
 *
 *   /ws/cliente/{lead_id}  cliente liga após submeter solicitação;
 *                          recebe {"tipo":"historico","msg":{...}} por
 *                          mensagem antiga e {"tipo":"msg_admin",...};
 *                          envia {"corpo":"..."} — fechado com 4004 se a
 *                          solicitação não existir.
 *   /ws/painel             administração; exige sessão válida (fecha 4401
 *                          caso contrário); recebe {"tipo":"ligado",stats},
 *                          {"tipo":"pong",stats}, notificações novo_lead /
 *                          msg_cliente / msg_admin; envia {"tipo":"ping"}
 *                          e {"tipo":"chat",lead_id,corpo}.
 *
 * Em Python o hub vivia na memória do processo; aqui vive num Durable
 * Object único ("hub") partilhado por todos os Workers da Cloudflare.
 * Usa a API de *WebSocket Hibernation* do Durable Object (tags em vez de
 * listas em memória), pelo que o estado das ligações sobrevive mesmo que o
 * objecto seja adormecido/recriado pela plataforma — comportamento igual
 * em produção e no `wrangler dev`.
 */
import * as db from "./db.js";
import { clean, loadSession } from "./security.js";
import { getSecret, SESSION_COOKIE, SESSION_MAX_AGE } from "./config.js";

const TAG_ADMIN = "admin";
const tagCliente = (leadId) => `client:${leadId}`;

export class ChatHub {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  /* ------------------------------------------------------------ */
  /* Difusão (equivale a to_admins / to_client do Python)          */
  /* ------------------------------------------------------------ */
  sendJson(ws, payload) {
    try {
      ws.send(JSON.stringify(payload));
      return true;
    } catch {
      return false;
    }
  }

  toAdmins(payload) {
    for (const ws of this.state.getWebSockets(TAG_ADMIN)) {
      this.sendJson(ws, payload);
    }
  }

  toClient(leadId, payload) {
    for (const ws of this.state.getWebSockets(tagCliente(leadId))) {
      this.sendJson(ws, payload);
    }
  }

  /* ------------------------------------------------------------ */
  /* Pedido HTTP: upgrade WebSocket ou notificação interna         */
  /* ------------------------------------------------------------ */
  async fetch(request) {
    const url = new URL(request.url);

    if ((request.headers.get("Upgrade") || "").toLowerCase() === "websocket") {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      const m = url.pathname.match(/^\/ws\/cliente\/(\d+)$/);
      if (m) {
        const leadId = parseInt(m[1], 10);
        this.state.acceptWebSocket(server, [tagCliente(leadId)]);
        this.initClient(server, leadId).catch(() => {
          try { server.close(4000, "erro interno"); } catch { /* já fechado */ }
        });
      } else if (url.pathname === "/ws/painel") {
        this.state.acceptWebSocket(server, [TAG_ADMIN]);
        this.initAdmin(server, request).catch(() => {
          try { server.close(4000, "erro interno"); } catch { /* já fechado */ }
        });
      } else {
        try { server.close(4004, "caminho desconhecido"); } catch { /* já fechado */ }
      }
      return new Response(null, { status: 101, webSocket: client });
    }

    // POST /notify — difusão pedida pelo Worker (novo lead, respostas…)
    try {
      const d = await request.json();
      if (d.scope === "admins") this.toAdmins(d.payload);
      else if (d.scope === "client") this.toClient(d.lead_id, d.payload);
      else if (d.scope === "both") {
        this.toClient(d.lead_id, d.payloadClient || d.payload);
        this.toAdmins(d.payloadAdmins || d.payload);
      }
      return Response.json({ ok: true });
    } catch {
      return Response.json({ ok: false }, { status: 400 });
    }
  }

  /* ------------------------------------------------------------ */
  /* Ligação de cliente — equivale a ws_cliente() do Python        */
  /* ------------------------------------------------------------ */
  async initClient(server, leadId) {
    const lead = await db.getLead(this.env.DB, leadId);
    if (!lead) {
      server.close(4004, "solicitação inexistente");
      return;
    }
    for (const msg of await db.listMessages(this.env.DB, leadId)) {
      this.sendJson(server, { tipo: "historico", msg });
    }
  }

  /* ------------------------------------------------------------ */
  /* Ligação do painel — equivale a ws_painel() do Python          */
  /* ------------------------------------------------------------ */
  async initAdmin(server, request) {
    const cookieHeader = request.headers.get("cookie") || "";
    const raw = parseCookie(cookieHeader, SESSION_COOKIE);
    const sess = await loadSession(raw, getSecret(this.env), SESSION_MAX_AGE);
    if (!sess.admin) {
      server.close(4401, "não autorizado");
      return;
    }
    this.sendJson(server, { tipo: "ligado", stats: await db.stats(this.env.DB) });
  }

  /* ------------------------------------------------------------ */
  /* Ciclo de vida WebSocket (entregue mesmo após hibernação)      */
  /* ------------------------------------------------------------ */
  webSocketMessage(ws, message) {
    const tags = new Set(this.state.getTags(ws));
    let data;
    try {
      data = JSON.parse(String(message));
    } catch {
      return;
    }
    if (tags.has(TAG_ADMIN)) {
      this.onAdminMessage(ws, data).catch(() => { /* descartada */ });
      return;
    }
    for (const tag of tags) {
      if (tag.startsWith("client:")) {
        const leadId = parseInt(tag.slice(7), 10);
        this.onClientMessage(leadId, data).catch(() => { /* descartada */ });
        return;
      }
    }
  }

  /* fecho/erro não exigem limpeza: o runtime gere as tags/sockets */

  /* ------------------------------------------------------------ */
  /* Tratamento de mensagens                                       */
  /* ------------------------------------------------------------ */
  async onClientMessage(leadId, data) {
    const corpo = clean(data?.corpo || "", 2000);
    if (!corpo) return;
    await db.addMessage(this.env.DB, leadId, "cliente", "painel", corpo);
    this.toAdmins({
      tipo: "msg_cliente",
      lead_id: leadId,
      corpo,
      created_at: db.now(),
    });
  }

  async onAdminMessage(ws, data) {
    if (data.tipo === "ping") {
      this.sendJson(ws, { tipo: "pong", stats: await db.stats(this.env.DB) });
    } else if (data.tipo === "chat") {
      const leadId = parseInt(data.lead_id || 0, 10);
      const corpo = clean(data.corpo || "", 4000);
      if (leadId && corpo) {
        await db.addMessage(this.env.DB, leadId, "admin", "painel", corpo);
        const created = db.now();
        this.toClient(leadId, { tipo: "msg_admin", corpo, created_at: created });
        this.toAdmins({ tipo: "msg_admin", lead_id: leadId, corpo, created_at: created });
      }
    }
  }
}

function parseCookie(header, name) {
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx < 0) continue;
    if (part.slice(0, idx).trim() === name) return part.slice(idx + 1).trim();
  }
  return null;
}
