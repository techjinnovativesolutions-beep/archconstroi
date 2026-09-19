/* Arch Constroi – Painel Administrativo | Tech J Innovative Solutions */
(function () {
  "use strict";
  var CSRF = document.getElementById("csrf").value;
  var leads = [], leadAberto = null, ws = null;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function j(url, body) {
    return fetch(url, {
      method: body ? "POST" : "GET",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(Object.assign({ csrf: CSRF }, body)) : undefined
    }).then(function (r) { return r.json(); });
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

  /* WebSocket */
  function ligar() {
    var proto = location.protocol === "https:" ? "wss" : "ws";
    ws = new WebSocket(proto + "://" + location.host + "/ws/painel");
    var pill = document.getElementById("estadoWs");
    ws.onopen = function () { pill.className = "pill live"; pill.textContent = "● tempo real ligado"; };
    ws.onclose = function () {
      pill.className = "pill off"; pill.textContent = "● desligado — a reconectar";
      setTimeout(ligar, 4000);
    };
    ws.onmessage = function (ev) {
      var d = JSON.parse(ev.data);
      if (d.stats) pintarKpis(d.stats);
      if (d.tipo === "novo_lead") { notificar("Nova solicitação de " + d.lead.nome); carregar(); }
      if (d.tipo === "msg_cliente") {
        notificar("Nova mensagem do cliente #" + d.lead_id);
        if (leadAberto === d.lead_id) bolha(d.corpo, false);
      }
      if (d.tipo === "msg_admin" && leadAberto === d.lead_id) { /* já apresentada localmente */ }
    };
    setInterval(function () { if (ws && ws.readyState === 1) ws.send(JSON.stringify({ tipo: "ping" })); }, 25000);
  }
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

  /* Listagens */
  function carregar() {
    var e = document.getElementById("filtroEstado").value;
    var q = document.getElementById("pesquisa").value;
    j("/api/admin/leads?estado=" + encodeURIComponent(e) + "&q=" + encodeURIComponent(q))
      .then(function (d) {
        leads = d.leads || [];
        pintarKpis(d.stats);
        pintarTabela();
        pintarUltimos();
        pintarConversas();
      });
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
    j("/api/admin/lead/" + id).then(function (d) {
      var l = d.lead;
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
          j("/api/admin/lead/" + id + "/estado", { estado: b.dataset.estado }).then(function (r) {
            if (r.stats) pintarKpis(r.stats);
            document.getElementById("modal").classList.remove("on");
            carregar();
          });
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
    leadAberto = id;
    j("/api/admin/lead/" + id).then(function (d) {
      document.getElementById("chatTitulo").textContent = "#" + d.lead.id + " · " + d.lead.nome;
      document.getElementById("chatLinks").innerHTML =
        "<a href='mailto:" + esc(d.lead.email) + "?subject=Arch%20Constroi%20%23" + d.lead.id +
        "' style='color:#ff3b41'>Responder por e-mail</a> · <a href='tel:" +
        esc(d.lead.telefone).replace(/\s/g, "") + "' style='color:#ff3b41'>Ligar / marcar reunião</a>";
      document.getElementById("chatFluxo").innerHTML = "";
      (d.mensagens || []).forEach(function (m) { bolha(m.corpo, m.autor === "admin"); });
    });
  }
  document.getElementById("chatForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var inp = document.getElementById("chatCorpo");
    var canal = document.getElementById("chatCanal").value;
    if (!leadAberto || !inp.value.trim()) return;
    var texto = inp.value.trim();
    j("/api/admin/lead/" + leadAberto + "/responder", { corpo: texto, canal: canal })
      .then(function (r) {
        bolha(texto, true);
        if (r.nota) notificar(r.nota);
        inp.value = "";
      });
  });

  /* Alertas / diagnóstico */
  document.getElementById("btnDiagnostico").addEventListener("click", function () {
    j("/api/admin/diagnostico").then(function (d) {
      document.getElementById("tabelaDiag").innerHTML = d.resultados.map(function (r) {
        var cor = r.estado === "ok" ? "#7ce2a9" : "#ffd469";
        return "<div style='display:flex;justify-content:space-between;padding:5px 0'><span>" +
          esc(r.pacote) + " " + esc(r.versao) + "</span><b style='color:" + cor + "'>" + esc(r.estado) + "</b></div>";
      }).join("");
      document.getElementById("listaAlertas").innerHTML = d.alertas.map(function (a) {
        return "<div class='alerta " + esc(a.nivel) + "'><b>" + esc(a.titulo) +
          " <small style='color:#9aa0a6;font-weight:400'>· " + esc(a.origem) + " · " + esc(a.created_at) +
          "</small></b><small>" + esc(a.detalhe) + "</small>" +
          (a.accao ? "<br><small style='color:#ffd469'>Acção: " + esc(a.accao) + "</small>" : "") + "</div>";
      }).join("");
      notificar("Diagnóstico concluído");
    });
  });
  document.getElementById("btnLidos").addEventListener("click", function () {
    j("/api/admin/alertas/lidos", {}).then(function () { notificar("Alertas marcados como lidos"); });
  });

  /* Manutenção */
  var manutOn = document.getElementById("btnManut").textContent.indexOf("Desactivar") >= 0;
  document.getElementById("btnManut").addEventListener("click", function () {
    manutOn = !manutOn;
    j("/api/admin/manutencao", { on: manutOn, reason: document.getElementById("motivoManut").value })
      .then(function (r) {
        document.getElementById("btnManut").textContent = (r.manutencao.on ? "Desactivar" : "Activar") + " manutenção";
        document.getElementById("estadoManut").innerHTML = "Estado actual: <b>" +
          (r.manutencao.on ? "ACTIVO" : "inactivo") + "</b>";
        notificar("Modo de manutenção " + (r.manutencao.on ? "activado" : "desactivado"));
      });
  });

  document.getElementById("btnRecarregar").addEventListener("click", carregar);
  document.getElementById("filtroEstado").addEventListener("change", carregar);
  var t;
  document.getElementById("pesquisa").addEventListener("input", function () {
    clearTimeout(t); t = setTimeout(carregar, 400);
  });

  carregar();
  ligar();
})();
