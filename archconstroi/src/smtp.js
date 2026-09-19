/**
 * Arch Constroi – Envio de e-mail via SMTP
 * Desenvolvido por: Tech J Innovative Solutions
 *
 * Substitui o smtplib do backend Python. Usa a API de sockets TCP da
 * Cloudflare (cloudflare:sockets) com STARTTLS (porta 587) ou TLS directo
 * (porta 465). Se o envio falhar — tal como no Python — devolve o erro e o
 * Worker regista um alerta no painel; a mensagem fica sempre guardada.
 */

async function readLine(reader, decoder) {
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return buf || null;
    buf += decoder.decode(value, { stream: true });
    const idx = buf.indexOf("\r\n");
    if (idx >= 0) return buf.slice(0, idx + 2);
  }
}

async function readReply(reader, decoder) {
  // respostas SMTP multi-linha: "250-..." continua, "250 ..." termina
  let reply = "";
  for (;;) {
    const line = await readLine(reader, decoder);
    if (line === null) throw new Error("Ligação SMTP encerrada inesperadamente.");
    reply += line;
    if (line.length < 4 || line[3] !== "-") break;
  }
  return reply;
}

function expect(reply, code) {
  if (!reply || !reply.startsWith(String(code))) {
    throw new Error(`SMTP esperava ${code}, recebeu: ${String(reply).trim()}`);
  }
}

/**
 * Envia um e-mail simples em texto puro.
 * @returns {[boolean, string]} — equivalente ao (ok, nota) do Python.
 */
export async function sendEmail(smtp, to, subject, body) {
  if (!smtp.host) {
    return [false, "SMTP não configurado (defina ARCH_SMTP_HOST). Mensagem guardada no painel."];
  }
  let socket;
  try {
    const { connect } = await import("cloudflare:sockets");
    socket = connect(`${smtp.host}:${smtp.port}`, {
      secureTransport: smtp.port === 465 ? "on" : "starttls",
    });

    const reader = socket.readable.getReader();
    const writer = socket.writable.getWriter();
    const decoder = new TextDecoder();
    const send = (s) => writer.write(new TextEncoder().encode(s + "\r\n"));

    expect(await readReply(reader, decoder), 220);
    send("EHLO archconstroi-worker");
    expect(await readReply(reader, decoder), 250);

    if (smtp.user) {
      send("AUTH LOGIN");
      expect(await readReply(reader, decoder), 334);
      send(btoa(smtp.user));
      expect(await readReply(reader, decoder), 334);
      send(btoa(smtp.pass));
      expect(await readReply(reader, decoder), 235);
    }

    send(`MAIL FROM:<${smtp.from}>`);
    expect(await readReply(reader, decoder), 250);
    send(`RCPT TO:<${to}>`);
    expect(await readReply(reader, decoder), 250);
    send("DATA");
    expect(await readReply(reader, decoder), 354);

    // "dot stuffing" — linhas começadas por '.' ganham um '.' extra
    const data = [
      `From: ${smtp.from}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=utf-8",
      "Content-Transfer-Encoding: 8bit",
      "",
      body.replace(/\r?\n/g, "\r\n").replace(/\n\./g, "\n.."),
      ".",
    ].join("\r\n");
    await writer.write(new TextEncoder().encode(data + "\r\n"));
    expect(await readReply(reader, decoder), 250);
    send("QUIT");

    return [true, "E-mail entregue."];
  } catch (exc) {
    return [false, `Falha SMTP: ${exc?.message || exc}`];
  } finally {
    try { socket?.close(); } catch { /* já encerrado */ }
  }
}
