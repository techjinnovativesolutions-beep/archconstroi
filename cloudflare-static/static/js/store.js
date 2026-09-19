/* Arch Constroi – motor de dados da versão estática | Tech J Innovative Solutions
 * Base de dados em localStorage semeada a partir de data.js (window.ARCH_SEED).
 * Autenticação PBKDF2-SHA256 (Web Crypto), sessões de 4h, CSRF por página,
 * validação/limpeza anti-injecção, rate limits, auditoria, manutenção e
 * tempo real via BroadcastChannel + storage events (+ WebSocket nativa
 * opcional quando window.ARCH_WS_URL estiver definida). */
(function () {
  "use strict";
  var KEY = "archconstroi_db_v1";
  var SKEY = "archconstroi_sessao_v1";
  var MKEY = "archconstroi_manutencao_v1";
  var RKEY = "archconstroi_ratelimit_v1";
  var SESSION_MS = 4 * 60 * 60 * 1000;
  var BUS = "archconstroi_tempo_real";

  /* ---------- utilidades ---------- */
  function b64(buf) {
    var bytes = new Uint8Array(buf), s = "";
    for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
  }
  function toHex(buf) {
    return Array.prototype.map.call(new Uint8Array(buf), function (x) {
      return ("0" + x.toString(16)).slice(-2);
    }).join("");
  }
  function randHex(n) {
    var a = new Uint8Array(n);
    crypto.getRandomValues(a);
    return toHex(a.buffer);
  }
  function agora() {
    return new Date().toISOString().slice(0, 19).replace("T", " ");
  }
  function isodate(d) {
    return d.toISOString().slice(0, 10);
  }

  /* ---------- base de dados ---------- */
  var db = null;
  function load() {
    var raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) {}
    if (raw) {
      try { db = JSON.parse(raw); return; } catch (e) {}
    }
    db = JSON.parse(JSON.stringify(window.ARCH_SEED));
    persist();
  }
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {}
  }

  /* ---------- PBKDF2 ---------- */
  async function pbkdf2Hex(password, saltHex, iterations) {
    var enc = new TextEncoder();
    var salt = new Uint8Array(saltHex.length / 2);
    for (var i = 0; i < salt.length; i++) {
      salt[i] = parseInt(saltHex.substr(i * 2, 2), 16);
    }
    var key = await crypto.subtle.importKey(
      "raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
    var bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt: salt, iterations: iterations, hash: "SHA-256" },
      key, 256);
    return toHex(bits);
  }
  async function hashPassword(password) {
    var salt = randHex(16);
    var hex = await pbkdf2Hex(password, salt, 260000);
    return "pbkdf2_sha256$260000$" + salt + "$" + hex;
  }
  function timingSafeEqual(a, b) {
    if (a.length !== b.length) return false;
    var r = 0;
    for (var i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return r === 0;
  }
  async function verifyPassword(password, stored) {
    var parts = String(stored || "").split("$");
    if (parts.length !== 4 || parts[0] !== "pbkdf2_sha256") return false;
    var iters = parseInt(parts[1], 10) || 260000;
    var hex = await pbkdf2Hex(password, parts[2], iters);
    return timingSafeEqual(hex, parts[3]);
  }

  /* ---------- sessões (4 horas, sessionStorage) ---------- */
  function session() {
    try {
      var raw = sessionStorage.getItem(SKEY);
      if (!raw) return null;
      var s = JSON.parse(raw);
      if (!s || !s.exp || Date.now() > s.exp) { sessionStorage.removeItem(SKEY); return null; }
      return s;
    } catch (e) { return null; }
  }
  function setSession(admin) {
    sessionStorage.setItem(SKEY, JSON.stringify({ admin: admin, exp: Date.now() + SESSION_MS }));
  }
  function clearSession() { try { sessionStorage.removeItem(SKEY); } catch (e) {} }

  /* ---------- CSRF (por página) ---------- */
  function randomToken() { return randHex(16); }
  function csrfOk(esperado, recebido) {
    return typeof esperado === "string" && typeof recebido === "string" &&
      esperado.length > 0 && timingSafeEqual(esperado, recebido);
  }

  /* ---------- limpeza / validação (anti-injecção, igual ao original) ---------- */
  var MALICIOSO = [
    "<script", "</script", "javascript:", "onerror", "onload", "onclick", "onfocus",
    "document.cookie", "eval(", "union select", "union all select", "1=1",
    "<iframe", "<object", "<embed", "srcdoc", "<img src", "{{", "{%", "../", "..\\"
  ];
  function isMalicious(texto) {
    var t = String(texto || "").toLowerCase();
    for (var i = 0; i < MALICIOSO.length; i++) {
      if (t.indexOf(MALICIOSO[i]) !== -1) return true;
    }
    return false;
  }
  function clean(texto, max) {
    var t = String(texto == null ? "" : texto).slice(0, max || 2000);
    return t.replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function validateLead(d) {
    var campos = ["nome", "empresa", "email", "telefone", "servico", "mensagem"];
    for (var i = 0; i < campos.length; i++) {
      if (isMalicious(d[campos[i]])) {
        return { ok: false, erro: "A solicitação contém conteúdo suspeito e foi bloqueada." };
      }
    }
    var nome = String(d.nome || "").trim();
    var email = String(d.email || "").trim();
    var telefone = String(d.telefone || "").trim();
    var servico = String(d.servico || "").trim();
    var mensagem = String(d.mensagem || "").trim();
    if (nome.length < 3) return { ok: false, erro: "Indique o seu nome completo." };
    if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email)) return { ok: false, erro: "E-mail inválido." };
    if (telefone.replace(/[^\d]/g, "").length < 6) return { ok: false, erro: "Número de telefone inválido." };
    if (mensagem.length < 10) return { ok: false, erro: "Descreva melhor a sua solicitação (mín. 10 caracteres)." };
    if (!servico) return { ok: false, erro: "Escolha o serviço pretendido." };
    return {
      ok: true,
      dados: {
        nome: nome, empresa: String(d.empresa || "").trim(), email: email,
        telefone: telefone, servico: servico, mensagem: mensagem
      }
    };
  }

  /* ---------- rate limit (localStorage) ---------- */
  function _rlAll() {
    try { return JSON.parse(localStorage.getItem(RKEY) || "{}"); } catch (e) { return {}; }
  }
  function rateBlockedFor(scope) {
    var all = _rlAll(), e = all[scope];
    if (e && e.bloqueado_ate && Date.now() < e.bloqueado_ate) {
      return Math.ceil((e.bloqueado_ate - Date.now()) / 1000);
    }
    return 0;
  }
  function rateCheck(scope, limite, janelaSeg, bloqueioSeg) {
    var all = _rlAll();
    var e = all[scope] || { hits: [], bloqueado_ate: 0 };
    var now = Date.now();
    if (e.bloqueado_ate && now < e.bloqueado_ate) return false;
    e.hits = (e.hits || []).filter(function (t) { return now - t < janelaSeg * 1000; });
    e.hits.push(now);
    if (e.hits.length > limite) {
      e.bloqueado_ate = now + bloqueioSeg * 1000;
      all[scope] = e;
      try { localStorage.setItem(RKEY, JSON.stringify(all)); } catch (err) {}
      return false;
    }
    all[scope] = e;
    try { localStorage.setItem(RKEY, JSON.stringify(all)); } catch (err2) {}
    return true;
  }

  /* ---------- login (bloqueio anti força bruta: 5/5min, bloqueio 10min) ---------- */
  async function login(username, password) {
    var scope = "login:local";
    if (!rateCheck(scope, 5, 300, 600)) {
      return { ok: false, erro: "Demasiadas tentativas. Aguarde " + rateBlockedFor(scope) + " segundos." };
    }
    username = String(username || "").trim();
    var admin = null;
    for (var i = 0; i < db.admins.length; i++) {
      if (db.admins[i].username === username) { admin = db.admins[i]; break; }
    }
    var valido = false;
    if (admin && password) valido = await verifyPassword(password, admin.password_hash);
    if (!valido) {
      logAudit("login_falha", "navegador", "utilizador: " + username.slice(0, 60));
      return { ok: false, erro: "Credenciais inválidas." };
    }
    setSession(admin.username);
    logAudit("login_ok", "navegador", "admin: " + admin.username);
    return { ok: true, admin: admin.username };
  }
  function logout() { clearSession(); }

  /* ---------- leads / mensagens / alertas / auditoria ---------- */
  function nextId(tabela) {
    var m = 0;
    for (var i = 0; i < db[tabela].length; i++) {
      if (db[tabela][i].id > m) m = db[tabela][i].id;
    }
    return m + 1;
  }
  function insertLead(dados) {
    var id = nextId("leads");
    db.leads.unshift({
      id: id, nome: dados.nome, empresa: dados.empresa || "", email: dados.email,
      telefone: dados.telefone, servico: dados.servico, mensagem: dados.mensagem,
      estado: "novo", valor_estimado: null, ip: "navegador", created_at: agora()
    });
    persist();
    emit({ tipo: "novo_lead", lead_id: id, lead: db.leads[0] });
    return id;
  }
  function getLead(id) {
    for (var i = 0; i < db.leads.length; i++) {
      if (db.leads[i].id === id) return db.leads[i];
    }
    return null;
  }
  function listLeads(estado, pesquisa) {
    var out = [];
    var q = (pesquisa || "").toLowerCase();
    for (var i = 0; i < db.leads.length; i++) {
      var l = db.leads[i];
      if (estado && estado !== "todos" && l.estado !== estado) continue;
      if (q) {
        var alvo = (l.nome + " " + l.email + " " + l.empresa + " " + l.servico + " #" + l.id).toLowerCase();
        if (alvo.indexOf(q) === -1) continue;
      }
      out.push(l);
    }
    out.sort(function (a, b) { return b.id - a.id; });
    return out;
  }
  function updateLeadState(id, estado) {
    var l = getLead(id);
    if (!l) return;
    l.estado = estado;
    persist();
    emit({ tipo: "estado_alterado", lead_id: id, estado: estado });
  }
  function addMessage(lead_id, autor, canal, corpo) {
    var m = { id: nextId("mensagens"), lead_id: lead_id, autor: autor, canal: canal, corpo: corpo, created_at: agora() };
    db.mensagens.push(m);
    persist();
    emit({ tipo: autor === "cliente" ? "msg_cliente" : "msg_admin", lead_id: lead_id, canal: canal, corpo: corpo });
    return m;
  }
  function listMessages(lead_id) {
    return db.mensagens.filter(function (m) { return m.lead_id === lead_id; })
      .sort(function (a, b) { return a.id - b.id; });
  }
  function listAlerts(limite) {
    return (db.alertas || []).slice(0, limite || 50);
  }
  function addAlert(nivel, origem, titulo, detalhe, accao) {
    db.alertas = db.alertas || [];
    db.alertas.unshift({ nivel: nivel, origem: origem, titulo: titulo, detalhe: detalhe || "", accao: accao || "", created_at: agora() });
    db.alertas = db.alertas.slice(0, 200);
    persist();
  }
  function markAlertsRead() {
    db.alertas = [];
    persist();
    emit({ tipo: "alertas_lidos" });
  }
  function logAudit(evento, ip, detalhe) {
    db.auditoria = db.auditoria || [];
    db.auditoria.unshift({ evento: evento, ip: ip || "navegador", detalhe: String(detalhe || "").slice(0, 200), created_at: agora() });
    db.auditoria = db.auditoria.slice(0, 400);
    persist();
  }
  function listAudit(limite) {
    return (db.auditoria || []).slice(0, limite || 50);
  }

  /* ---------- manutenção ---------- */
  function getMaintenance() {
    try {
      var m = JSON.parse(localStorage.getItem(MKEY) || "null");
      if (m && typeof m.on === "boolean") return m;
    } catch (e) {}
    return { on: false, reason: "" };
  }
  function setMaintenance(on, reason) {
    var m = { on: Boolean(on), reason: String(reason || "") };
    try { localStorage.setItem(MKEY, JSON.stringify(m)); } catch (e) {}
    emit({ tipo: "manutencao", manutencao: m });
    return m;
  }

  /* ---------- estatísticas ---------- */
  function stats() {
    var total = db.leads.length, novos = 0, andamento = 0, concluidos = 0;
    var porServico = {}, porDia = {};
    for (var i = 13; i >= 0; i--) {
      var d = new Date(Date.now() - i * 86400000);
      porDia[isodate(d)] = 0;
    }
    db.leads.forEach(function (l) {
      if (l.estado === "novo") novos++;
      else if (l.estado === "em_andamento") andamento++;
      else if (l.estado === "concluido") concluidos++;
      porServico[l.servico] = (porServico[l.servico] || 0) + 1;
      var dia = String(l.created_at).slice(0, 10);
      if (Object.prototype.hasOwnProperty.call(porDia, dia)) porDia[dia]++;
    });
    var servicos = Object.keys(porServico).map(function (k) { return { servico: k, c: porServico[k] }; })
      .sort(function (a, b) { return b.c - a.c; });
    var dias = Object.keys(porDia).map(function (k) { return { d: k.slice(5), c: porDia[k] }; });
    return {
      total: total, novos: novos, andamento: andamento, concluidos: concluidos,
      mensagens: db.mensagens.length,
      conversao: total ? Math.round(concluidos / total * 100) : 0,
      por_servico: servicos, por_dia: dias
    };
  }

  /* ---------- tempo real: BroadcastChannel + storage + WebSocket opcional ---------- */
  var listeners = [];
  var channel = null;
  if (typeof BroadcastChannel !== "undefined") {
    channel = new BroadcastChannel(BUS);
    channel.onmessage = function (ev) {
      if (ev.data && ev.data.arch === 1) notificar(ev.data);
    };
  }
  if (typeof window !== "undefined") {
    window.addEventListener("storage", function (ev) {
      /* fallback: outras abas sincronizam lendo a base ao receber o evento */
      if (ev.key === KEY) {
        try { db = JSON.parse(ev.newValue); } catch (e) {}
      }
    });
  }
  function emit(dados) {
    dados.arch = 1;
    if (channel) { try { channel.postMessage(dados); } catch (e) {} }
    if (ws && ws.readyState === 1) { try { ws.send(JSON.stringify(dados)); } catch (e) {} }
    notificar(dados);
  }
  function notificar(dados) {
    for (var i = 0; i < listeners.length; i++) {
      try { listeners[i](dados); } catch (e) {}
    }
  }

  /* WebSocket nativa (opcional — só liga se existir um endpoint wss:// configurado) */
  var ws = null, wsTentativas = 0;
  function ligarWebSocket() {
    var url = window.ARCH_WS_URL;
    if (!url || !("WebSocket" in window)) return;
    try {
      ws = new WebSocket(url);
      ws.onmessage = function (ev) {
        try {
          var d = JSON.parse(ev.data);
          if (d && d.arch === 1) notificar(d);
        } catch (e) {}
      };
      ws.onclose = function () {
        if (wsTentativas < 8) {
          wsTentativas++;
          setTimeout(ligarWebSocket, 4000);
        }
      };
      ws.onopen = function () { wsTentativas = 0; };
    } catch (e) {}
  }

  /* redireccionamento para manutenção (páginas públicas) */
  function init() {
    load();
    ligarWebSocket();
    var pagina = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    var publicas = ["index.html", "sobre.html", "servicos.html", "contactos.html", ""];
    if (publicas.indexOf(pagina) !== -1 && getMaintenance().on) {
      location.replace("manutencao.html");
    }
  }

  window.ARCH = {
    init: init,
    session: session, login: login, logout: logout,
    randomToken: randomToken, csrfOk: csrfOk,
    clean: clean, isMalicious: isMalicious, validateLead: validateLead,
    rateCheck: rateCheck, rateBlockedFor: rateBlockedFor,
    insertLead: insertLead, getLead: getLead, listLeads: listLeads,
    updateLeadState: updateLeadState,
    addMessage: addMessage, listMessages: listMessages,
    listAlerts: listAlerts, addAlert: addAlert, markAlertsRead: markAlertsRead,
    logAudit: logAudit, listAudit: listAudit,
    getMaintenance: getMaintenance, setMaintenance: setMaintenance,
    stats: stats,
    verifyPassword: verifyPassword, hashPassword: hashPassword,
    on: function (fn) { listeners.push(fn); }
  };
})();
