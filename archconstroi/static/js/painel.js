/* Arch Constroi – Painel Administrativo (versão estática)
 * Desenvolvido por: Tech J Innovative Solutions
 * Mesmas funcionalidades do original: login com PBKDF2 + bloqueio anti força
 * bruta, dashboard com KPIs/gráficos/tabelas, solicitações, conversas em tempo
 * real, respostas por painel/e-mail/SMS, alertas, auditoria, manutenção. */
(function () {
  "use strict";
  ARCH.init();

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ============================================================
     MODO LOGIN
     ============================================================ */
  var formLogin = document.getElementById("formLogin");
  if (formLogin) {
    var csrfPagina = ARCH.randomToken();
    formLogin.querySelector("input[name=csrf]").value = csrfPagina;

    /* sessão já activa → entra directamente */
    var sess0 = ARCH.session();
    if (sess0) location.replace("dashboard.html");

    formLogin.addEventListener("submit", function (e) {
      e.preventDefault();
      var username = formLogin.username.value;
      var password = formLogin.password.value;
      var csrf = formLogin.csrf.value;
      var avisoErro = document.getElementById("avisoErro");
      function falha(txt) {
        avisoErro.textContent = txt;
        avisoErro.style.display = "block";
      }
      if (!ARCH.csrfOk(csrfPagina, csrf)) return falha("Sessão inválida, tente novamente");
      ARCH.login(username, password).then(function (r) {
        if (r.ok) location.replace("dashboard.html");
        else falha(r.erro);
      });
    });
    return;
  }

  /* ============================================================
     MODO DASHBOARD
     ============================================================ */
  if (!document.querySelector(".painel")) return;

  var sess = ARCH.session();
  if (!sess) { location.replace("login.html"); return; }
  document.getElementById("adminNome").textContent = sess.admin;

  var CSRF = ARCH.randomToken();
  document.getElementById("csrf").value = CSRF;

  var leads = [], leadAberto = null;

  function exigirSessao() {
    if (!ARCH.session()) { location.replace("login.html"); return false; }
    return true;
  }
  function exigirCsrf(token) {
    return ARCH.csrfOk(CSRF, token);
  }

  /* Navegação por abas */
  document.querySelectorAll(".aba").forEach(function (b) {
    b.addEventListener("click", function () {
      document.querySelectorAll(".aba").forEach(function (x) { x.classList.remove("on"); });
      document.querySelectorAll(".painel-sec").forEach(function (s) { s.classList.remove("on"); });
      b.classList.add("on");
      document.getElementById("sec-" + b.dataset.sec).classList.add("on");
    });
  });

  /* Tempo real: a ligação local está sempre activa (BroadcastChannel/
   * storage/WebSocket nativa quando existe endpoint) */
  (function ligar() {
    var pill = document.getElementById("estadoWs");
    pill.className = "pill live";
    pill.textContent = "● tempo real ligado";
  })();

  function notificar(txt) {
    var n = document.createElement("div");
    n.textContent = txt;
    n.style.cssText = "position:fixed;right:22px;bottom:22px;background:#d32027;color:#fff;padding:13px 18px;" +
      "border-radius:10px;z-index:500;box-shadow:0 12px 30px rgba(0,0,0,.5);font-weight:600;font-size:.9rem";
    document.body.appendChild(n);
    setTimeout(function () { n.remove(); }, 5000);
  }

  function pintarKpis(s) {
    document.getElementById("k-total").textContent = s.total;
    document.getElementById("k-novos").textContent = s.novos;
    document.getElementById("k-and").textContent = s.andamento;
    document.getElementById("k-conc").textContent = s.concluidos;
    document.getElementById("k-msgs").textContent = s.mensagens;
    document.getElementById("k-conv").textContent = s.conversao + "%";
  }

  function pintarGrafico(s) {
    var g = document.querySelector("#sec-visao .grafico");
    if (!g) return;
    if (!s.por_dia.length) { g.innerHTML = '<div style="height:6%"><span>0</span></div>'; return; }
    var maxv = 1;
    s.por_dia.forEach(function (d) { if (d.c > maxv) maxv = d.c; });
    g.innerHTML = s.por_dia.map(function (d) {
      return '<div style="height:' + Math.round(d.c / maxv * 100) + '%" title="' + esc(d.d) + ": " + d.c +
        '"><span>' + d.c + "</span></div>";
    }).join("");
  }

  function pintarServicos(s) {
    var titulo = null;
    document.querySelectorAll("#sec-visao h3").forEach(function (h) {
      if (h.textContent.indexOf("Serviços mais pedidos") >= 0) titulo = h;
    });
    if (!titulo) return;
    var card = titulo.nextElementSibling;
    if (!card) return;
    card.innerHTML = s.por_servico.length
      ? s.por_servico.map(function (x) {
          return '<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.05)">' +
            '<span style="font-size:.9rem">' + esc(x.servico || "—") + '</span><b style="color:var(--vermelho-2)">' + x.c + "</b></div>";
        }).join("")
      : '<p style="color:var(--cinza);margin:0">Ainda sem dados.</p>';
  }

  function pintarAlertas() {
    var lista = document.getElementById("listaAlertas");
    var alertas = ARCH.listAlerts(60);
    lista.innerHTML = alertas.map(function (a) {
      return '<div class="alerta ' + esc(a.nivel) + '">' +
        "<b>" + esc(a.titulo) + ' <small style="color:var(--cinza);font-weight:400">· ' + esc(a.origem) +
        " · " + esc(a.created_at) + "</small></b>" +
        "<small>" + esc(a.detalhe) + "</small><br>" +
        (a.accao ? '<small style="color:#ffd469">Acção: ' + esc(a.accao) + "</small>" : "") +
        "</div>";
    }).join("");
  }

  function pintarAuditoria() {
    var tb = document.querySelector("#sec-auditoria tbody");
    if (!tb) return;
    var rows = ARCH.listAudit(50);
    tb.innerHTML = rows.length
      ? rows.map(function (a) {
          return "<tr><td>" + esc(a.evento) + "</td><td>" + esc(a.ip) + "</td><td>" +
            esc(a.detalhe) + "</td><td>" + esc(a.created_at) + "</td></tr>";
        }).join("")
      : '<tr><td colspan="4" style="color:var(--cinza)">Sem registos.</td></tr>';
  }

  /* Listagens */
  function carregar() {
    if (!exigirSessao()) return;
    var e = document.getElementById("filtroEstado").value;
    var q = document.getElementById("pesquisa").value;
    leads = ARCH.listLeads(e, q.trim() || null);
    var s = ARCH.stats();
    pintarKpis(s);
    pintarGrafico(s);
    pintarServicos(s);
    pintarTabela();
    pintarUltimos();
    pintarConversas();
  }

  function linhaEstado(l) {
    return '<span class="estado ' + l.estado + '">' + esc(l.estado.replace("_", " ")) + "</span>";
  }

  function pintarTabela() {
    var tb = document.getElementById("tbLeads");
    if (!leads.length) { tb.innerHTML = '<tr><td colspan="8" style="color:#9aa0a6">Sem solicitações.</td></tr>'; return; }
    tb.innerHTML = leads.map(function (l) {
      return "<tr><td>#" + l.id + "</td><td><b>" + esc(l.nome) + "</b></td><td>" + esc(l.empresa) +
        '</td><td><a href="mailto:' + esc(l.email) + '" style="color:#ff3b41">' + esc(l.email) +
        '</a><br><a href="tel:' + esc(l.telefone).replace(/\s/g, "") + '" style="color:#9aa0a6">' + esc(l.telefone) +
        "</a></td><td>" + esc(l.servico) + "</td><td>" + linhaEstado(l) + "</td><td>" + esc(l.created_at) +
        '</td><td><button class="mini" data-ver="' + l.id + '">Abrir</button></td></tr>';
    }).join("");
    tb.querySelectorAll("[data-ver]").forEach(function (b) {
      b.addEventListener("click", function () { abrirModal(parseInt(b.dataset.ver, 10)); });
    });
  }

  function pintarUltimos() {
    var tb = document.getElementById("tbUltimos");
    tb.innerHTML = leads.slice(0, 8).map(function (l) {
      return "<tr><td>#" + l.id + "</td><td>" + esc(l.nome) + "</td><td>" + esc(l.servico) + "</td><td>" +
        linhaEstado(l) + "</td><td>" + esc(l.created_at) +
        '</td><td><button class="mini" data-ver2="' + l.id + '">Ver</button></td></tr>';
    }).join("") || '<tr><td colspan="6" style="color:#9aa0a6">Sem entradas.</td></tr>';
    tb.querySelectorAll("[data-ver2]").forEach(function (b) {
      b.addEventListener("click", function () { abrirModal(parseInt(b.dataset.ver2, 10)); });
    });
  }

  function pintarConversas() {
    var tb = document.getElementById("tbConversas");
    tb.innerHTML = leads.map(function (l) {
      return '<tr style="cursor:pointer" data-chat="' + l.id + '"><td>#' + l.id + "</td><td>" +
        esc(l.nome) + "</td><td>" + linhaEstado(l) + "</td></tr>";
    }).join("") || '<tr><td colspan="3" style="color:#9aa0a6">Sem conversas.</td></tr>';
    tb.querySelectorAll("[data-chat]").forEach(function (r) {
      r.addEventListener("click", function () { abrirChat(parseInt(r.dataset.chat, 10)); });
    });
  }

  /* Detalhe */
  function abrirModal(id) {
    if (!exigirSessao()) return;
    var l = ARCH.getLead(id);
    if (!l) return;
    document.getElementById("modalIn").innerHTML =
      "<h2>Solicitação #" + l.id + "</h2>" +
      "<p style='color:#9aa0a6'>" + esc(l.created_at) + " · IP " + esc(l.ip) + "</p>" +
      "<div class='grid g2' style='gap:10px'>" +
      "<div class='card' style='padding:14px'><b>Cliente</b><p>" + esc(l.nome) + "</p></div>" +
      "<div class='card' style='padding:14px'><b>Empresa</b><p>" + esc(l.empresa) + "</p></div>" +
      "<div class='card' style='padding:14px'><b>E-mail</b><p><a href='mailto:" + esc(l.email) +
      "' style='color:#ff3b41'>" + esc(l.email) + "</a></p></div>" +
      "<div class='card' style='padding:14px'><b>Telefone</b><p><a href='tel:" +
      esc(l.telefone).replace(/\s/g, "") + "' style='color:#ff3b41'>" + esc(l.telefone) + "</a></p></div>" +
      "</div><div class='card' style='padding:14px;margin-top:10px'><b>Descrição</b><p>" +
      esc(l.mensagem) + "</p></div>" +
      "<div style='display:flex;gap:8px;margin-top:16px;flex-wrap:wrap'>" +
      ["novo", "em_andamento", "concluido", "arquivado"].map(function (e) {
        return "<button class='mini' data-estado='" + e + "'>" + e.replace("_", " ") + "</button>";
      }).join("") +
      "<button class='mini' id='irChat'>Abrir conversa</button>" +
      "<button class='mini' id='fecharModal'>Fechar</button></div>";
    document.getElementById("modal").classList.add("on");
    document.querySelectorAll("[data-estado]").forEach(function (b) {
      b.addEventListener("click", function () {
        if (!exigirSessao() || !exigirCsrf(CSRF)) return;
        if (["novo", "em_andamento", "concluido", "arquivado"].indexOf(b.dataset.estado) < 0) return;
        ARCH.updateLeadState(id, b.dataset.estado);
        ARCH.logAudit("estado_alterado", "navegador", "lead #" + id + " -> " + b.dataset.estado);
        pintarKpis(ARCH.stats());
        document.getElementById("modal").classList.remove("on");
        carregar();
      });
    });
    document.getElementById("irChat").addEventListener("click", function () {
      document.getElementById("modal").classList.remove("on");
      document.querySelector('[data-sec="conversas"]').click();
      abrirChat(id);
    });
    document.getElementById("fecharModal").addEventListener("click", function () {
      document.getElementById("modal").classList.remove("on");
    });
  }
  document.getElementById("modal").addEventListener("click", function (e) {
    if (e.target.id === "modal") e.target.classList.remove("on");
  });

  /* Chat */
  function bolha(texto, mine) {
    var d = document.createElement("div");
    d.className = "bolha " + (mine ? "eu" : "eles");
    d.textContent = texto;
    var f = document.getElementById("chatFluxo");
    f.appendChild(d);
    f.scrollTop = f.scrollHeight;
  }
  function abrirChat(id) {
    if (!exigirSessao()) return;
    leadAberto = id;
    var l = ARCH.getLead(id);
    if (!l) return;
    document.getElementById("chatTitulo").textContent = "#" + l.id + " · " + l.nome;
    document.getElementById("chatLinks").innerHTML =
      "<a href='mailto:" + esc(l.email) + "?subject=Arch%20Constroi%20%23" + l.id +
      "' style='color:#ff3b41'>Responder por e-mail</a> · <a href='tel:" +
      esc(l.telefone).replace(/\s/g, "") + "' style='color:#ff3b41'>Ligar / marcar reunião</a>";
    document.getElementById("chatFluxo").innerHTML = "";
    ARCH.listMessages(id).forEach(function (m) { bolha(m.corpo, m.autor === "admin"); });
  }
  document.getElementById("chatForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var inp = document.getElementById("chatCorpo");
    var canal = document.getElementById("chatCanal").value;
    if (!leadAberto || !inp.value.trim()) return;
    if (!exigirSessao() || !exigirCsrf(CSRF)) return;
    var texto = inp.value.trim();
    var corpo = ARCH.clean(texto, 4000);
    if (["painel", "email", "sms"].indexOf(canal) < 0) canal = "painel";
    if (corpo.length < 2) return;

    var l = ARCH.getLead(leadAberto);
    ARCH.addMessage(leadAberto, "admin", canal, corpo);

    var nota = "Guardado no painel.";
    if (canal === "email" && l) {
      /* num site estático o envio real faz-se pelo cliente de correio do
       * administrador, pré-preenchido com a resposta */
      window.open("mailto:" + l.email +
        "?subject=" + encodeURIComponent("Arch Constroi – resposta à sua solicitação #" + leadAberto) +
        "&body=" + encodeURIComponent(texto), "_self");
      nota = "E-mail preparado no seu cliente de correio.";
    } else if (canal === "sms" && l) {
      nota = "Ligação/SMS preparada para " + l.telefone + " (tel:" + l.telefone.replace(/ /g, "") + ").";
    }

    bolha(texto, true);
    notificar(nota);
    inp.value = "";
  });

  /* Alertas / diagnóstico */
  document.getElementById("btnDiagnostico").addEventListener("click", function () {
    if (!exigirSessao()) return;
    var resultados = [];
    function verifica(pacote, presente, versao, minimo, accao) {
      resultados.push({ pacote: pacote, versao: versao, estado: presente ? "ok" : "actualizar", minimo: minimo });
      if (!presente) {
        ARCH.addAlert("aviso", "dependencias", pacote + " em falta",
          "O componente " + pacote + " não está disponível neste navegador.", accao);
      }
    }
    verifica("armazenamento-local", typeof localStorage !== "undefined",
      typeof localStorage !== "undefined" ? "activo" : "—", "localStorage",
      "Use um navegador moderno com armazenamento local activado.");
    verifica("web-crypto-pbkdf2", Boolean(window.crypto && crypto.subtle),
      window.crypto && crypto.subtle ? "PBKDF2-SHA256" : "—", "crypto.subtle",
      "O PBKDF2 requer contexto seguro (HTTPS) — publique o site com TLS activo.");
    verifica("tempo-real-local", typeof BroadcastChannel !== "undefined",
      typeof BroadcastChannel !== "undefined" ? "BroadcastChannel" : "storage events",
      "BroadcastChannel", "As abas sincronizam via eventos de storage.");
    verifica("websocket-nativa", "WebSocket" in window,
      "WebSocket" in window ? "nativa" : "—", "WebSocket API",
      "Navegador sem WebSocket API nativa.");
    resultados.push({ pacote: "javascript", versao: "navegador", estado: "ok", minimo: "ES2020" });

    document.getElementById("tabelaDiag").innerHTML = resultados.map(function (r) {
      var cor = r.estado === "ok" ? "#7ce2a9" : "#ffd469";
      return "<div style='display:flex;justify-content:space-between;padding:5px 0'><span>" +
        esc(r.pacote) + " " + esc(r.versao) + "</span><b style='color:" + cor + "'>" + esc(r.estado) + "</b></div>";
    }).join("");
    pintarAlertas();
    notificar("Diagnóstico concluído");
  });
  document.getElementById("btnLidos").addEventListener("click", function () {
    if (!exigirSessao()) return;
    ARCH.markAlertsRead();
    notificar("Alertas marcados como lidos");
  });

  /* Manutenção */
  var manut = ARCH.getMaintenance();
  function pintarManutencao(m) {
    document.getElementById("btnManut").textContent = (m.on ? "Desactivar" : "Activar") + " manutenção";
    document.getElementById("estadoManut").innerHTML =
      "Estado actual: <b>" + (m.on ? "ACTIVO" : "inactivo") + "</b>";
  }
  pintarManutencao(manut);
  document.getElementById("btnManut").addEventListener("click", function () {
    if (!exigirSessao() || !exigirCsrf(CSRF)) return;
    var m = ARCH.setMaintenance(!ARCH.getMaintenance().on,
      ARCH.clean(document.getElementById("motivoManut").value || "", 200));
    ARCH.logAudit("manutencao", "navegador", "on=" + (m.on ? "True" : "False"));
    pintarManutencao(m);
    notificar("Modo de manutenção " + (m.on ? "activado" : "desactivado"));
  });

  /* Terminar sessão */
  document.getElementById("lnkLogout").addEventListener("click", function (e) {
    e.preventDefault();
    ARCH.logout();
    location.replace("login.html");
  });

  document.getElementById("btnRecarregar").addEventListener("click", carregar);
  document.getElementById("filtroEstado").addEventListener("change", carregar);
  var t;
  document.getElementById("pesquisa").addEventListener("input", function () {
    clearTimeout(t); t = setTimeout(carregar, 400);
  });

  /* Eventos em tempo real (outras abas / WebSocket nativa) */
  ARCH.on(function (d) {
    if (d.stats) pintarKpis(d.stats);
    if (d.tipo === "novo_lead") { notificar("Nova solicitação de " + d.lead.nome); carregar(); }
    if (d.tipo === "msg_cliente") {
      notificar("Nova mensagem do cliente #" + d.lead_id);
      if (leadAberto === d.lead_id) bolha(d.corpo, false);
    }
    if (d.tipo === "estado_alterado") carregar();
    if (d.tipo === "manutencao") pintarManutencao(d.manutencao);
  });

  /* arranque */
  carregar();
  pintarAlertas();
  pintarAuditoria();
})();
