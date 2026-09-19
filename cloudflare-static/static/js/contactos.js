/* Arch Constroi – formulário + chat em tempo real | Tech J Innovative Solutions
 * Versão estática: mesma experiência do original; as solicitações são
 * validadas (anti-injecção, CSRF, rate limit) e guardadas no armazenamento
 * local, e o chat usa a WebSocket API nativa / BroadcastChannel do navegador. */
(function () {
  "use strict";
  if (!document.getElementById("formSolicitacao")) return;

  ARCH.init();

  var form = document.getElementById("formSolicitacao");
  var aviso = document.getElementById("aviso");
  var btn = document.getElementById("btnEnviar");
  var chat = document.getElementById("chat");
  var fluxo = document.getElementById("fluxo");
  var leadId = null;

  /* token CSRF da página (gerado localmente, verificado na submissão) */
  var csrfPagina = ARCH.randomToken();
  document.getElementById("csrf").value = csrfPagina;

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
    /* histórico da conversa */
    ARCH.listMessages(id).forEach(function (m) {
      bolha(m.corpo, m.autor === "cliente");
    });
  }

  /* respostas do painel em tempo real (outras abas / WebSocket) */
  ARCH.on(function (ev) {
    if (!leadId) return;
    if (ev.tipo === "msg_admin" && ev.lead_id === leadId) bolha(ev.corpo, false);
  });

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

    /* rate limit: 5 submissões / 10 min (bloqueio 15 min) — igual ao original */
    if (!ARCH.rateCheck("lead:local", 5, 600, 900)) {
      return msg("Demasiadas submissões. Tente novamente mais tarde.", "erro");
    }
    /* verificação CSRF */
    if (!ARCH.csrfOk(csrfPagina, dados.csrf)) {
      ARCH.logAudit("csrf_fail", "navegador", "/api/solicitacao");
      return msg("Sessão inválida. Recarregue a página.", "erro");
    }

    btn.disabled = true;
    btn.textContent = "A enviar…";

    var v = ARCH.validateLead(dados);
    if (!v.ok) {
      btn.disabled = false;
      btn.textContent = "Enviar solicitação";
      return msg("✖ " + v.erro, "erro");
    }

    var id = ARCH.insertLead(v.dados);
    ARCH.addMessage(id, "cliente", "painel", v.dados.mensagem);
    ARCH.logAudit("nova_solicitacao", "navegador", "lead #" + id + " – " + v.dados.email);

    btn.disabled = false;
    btn.textContent = "Enviar solicitação";
    msg("✔ Solicitação recebida com sucesso. A nossa equipa responde em até 24 horas úteis. Referência #" + id, "ok");
    form.reset();
    abrirChat(id);
  });

  document.getElementById("formChat").addEventListener("submit", function (e) {
    e.preventDefault();
    var i = document.getElementById("msgChat");
    if (!i.value.trim() || !leadId) return;
    ARCH.addMessage(leadId, "cliente", "painel", ARCH.clean(i.value.trim(), 2000));
    bolha(i.value.trim(), true);
    i.value = "";
  });
})();
