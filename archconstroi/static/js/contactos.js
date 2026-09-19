/* Arch Constroi – formulário + chat WebSocket | Tech J Innovative Solutions */
(function () {
  "use strict";
  var form = document.getElementById("formSolicitacao");
  var aviso = document.getElementById("aviso");
  var btn = document.getElementById("btnEnviar");
  var chat = document.getElementById("chat");
  var fluxo = document.getElementById("fluxo");
  var ws = null, leadId = null;

  function msg(txt, tipo) {
    aviso.textContent = txt;
    aviso.className = "aviso " + tipo;
    aviso.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  
  function bolha(texto, mine) {
    var d = document.createElement("div");
    d.className = "bolha " + (mine ? "eu" : "eles");
    d.textContent = texto;
    fluxo.appendChild(d);
    fluxo.scrollTop = fluxo.scrollHeight;
  }

  function abrirChat(id) {
    leadId = id;
    chat.classList.add("on");
    var proto = location.protocol === "https:" ? "wss" : "ws";
    ws = new WebSocket(proto + "://" + location.host + "/ws/cliente/" + id);
    ws.onmessage = function (ev) {
      var d = JSON.parse(ev.data);
      if (d.tipo === "historico") bolha(d.msg.corpo, d.msg.autor === "cliente");
      else if (d.tipo === "msg_admin") bolha(d.corpo, false);
    };
    ws.onclose = function () { bolha("Ligação terminada. Responderemos também por e-mail.", false); };
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var dados = {
      csrf: document.getElementById("csrf").value,
      nome: form.nome.value.trim(),
      empresa: form.empresa.value.trim(),
      email: form.email.value.trim(),
      telefone: form.telefone.value.trim(),
      servico: form.servico.value,
      mensagem: form.mensagem.value.trim()
    };
    if (dados.nome.length < 3) return msg("Indique o seu nome completo.", "erro");
    if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(dados.email)) return msg("E-mail inválido.", "erro");
    if (dados.telefone.length < 6) return msg("Número de telefone inválido.", "erro");
    if (dados.mensagem.length < 10) return msg("Descreva melhor a sua solicitação (mín. 10 caracteres).", "erro");

    btn.disabled = true;
    btn.textContent = "A enviar…";
    fetch("/api/solicitacao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados)
    }).then(function (r) { return r.json().then(function (j) { return { s: r.status, j: j }; }); })
      .then(function (res) {
        btn.disabled = false;
        btn.textContent = "Enviar solicitação";
        if (res.j && res.j.ok) {
          msg("✔ " + res.j.mensagem + " Referência #" + res.j.id, "ok");
          form.reset();
          abrirChat(res.j.id);
        } else {
          msg("✖ " + ((res.j && res.j.erro) || "Não foi possível enviar. Tente novamente."), "erro");
        }
      }).catch(function () {
        btn.disabled = false;
        btn.textContent = "Enviar solicitação";
        msg("Em breve estaremos disponíveis — estamos com problemas de conexão.", "erro");
      });
  });

  document.getElementById("formChat").addEventListener("submit", function (e) {
    e.preventDefault();
    var i = document.getElementById("msgChat");
    if (!i.value.trim() || !ws || ws.readyState !== 1) return;
    ws.send(JSON.stringify({ corpo: i.value.trim() }));
    bolha(i.value.trim(), true);
    i.value = "";
  });
})();
