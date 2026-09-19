/**
 * Arch Constroi – Camada de dados (Cloudflare D1, SQLite com consultas
 * parametrizadas)
 * Desenvolvido por: Tech J Innovative Solutions
 *
 * Migração fiel de app/db.py (Python/SQLite). O esquema e todas as consultas
 * são idênticos; os dados existentes foram migrados sem perdas via
 * scripts/export-db.mjs → migrations/0002_seed.sql.
 */

/**
 * Número "float à Python": serializa como número em JSON (toJSON),
 * mas renderiza nos templates como float Python (ex.: 12.5 → "12.5",
 * 0 → "0.0"), igual a round()/divisão do backend original.
 */
export class PyFloat {
  constructor(v) {
    this.v = Number(v);
  }
  valueOf() {
    return this.v;
  }
  toJSON() {
    return this.v;
  }
  toString() {
    const s = String(this.v);
    return Number.isInteger(this.v) ? s + ".0" : s;
  }
}

/** Data/hora local "YYYY-MM-DD HH:MM:SS" (fuso Africa/Luanda). */
export function now() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Luanda",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).formatToParts(new Date());
  const g = (t) => parts.find((p) => p.type === t).value;
  return `${g("year")}-${g("month")}-${g("day")} ${g("hour")}:${g("minute")}:${g("second")}`;
}

export function getAdmin(db, username) {
  return db
    .prepare("SELECT * FROM admins WHERE username = ?")
    .bind(username)
    .first();
}

export async function ensureAdmin(db, adminUser, adminPass, hashPassword) {
  const row = await getAdmin(db, adminUser);
  if (!row) {
    await db
      .prepare("INSERT INTO admins (username, password_hash, created_at) VALUES (?,?,?)")
      .bind(adminUser, await hashPassword(adminPass), now())
      .run();
  }
  const empty = await db.prepare("SELECT id FROM alertas LIMIT 1").first();
  if (!empty) {
    await db
      .prepare(
        `INSERT INTO alertas (nivel, origem, titulo, detalhe, accao, created_at)
         VALUES (?,?,?,?,?,?)`
      )
      .bind(
        "info", "sistema", "Painel inicializado",
        "Base de dados criada e credenciais de administração activas.",
        "Nenhuma acção necessária.", now()
      )
      .run();
  }
}

export function insertLead(db, d, ip) {
  return db
    .prepare(
      `INSERT INTO leads (nome, empresa, email, telefone, servico, mensagem, ip, created_at)
       VALUES (?,?,?,?,?,?,?,?)`
    )
    .bind(d.nome, d.empresa, d.email, d.telefone, d.servico, d.mensagem, ip, now())
    .run()
    .then((r) => r.meta.last_row_id);
}

export async function listLeads(db, estado = null, q = null) {
  let sql = "SELECT * FROM leads";
  const params = [];
  const where = [];
  if (estado && estado !== "todos") {
    where.push("estado = ?");
    params.push(estado);
  }
  if (q) {
    where.push("(nome LIKE ? OR empresa LIKE ? OR email LIKE ?)");
    const like = `%${q}%`;
    params.push(like, like, like);
  }
  if (where.length) sql += " WHERE " + where.join(" AND ");
  sql += " ORDER BY id DESC LIMIT 300";
  const r = await db.prepare(sql).bind(...params).all();
  return r.results;
}

export function getLead(db, leadId) {
  return db.prepare("SELECT * FROM leads WHERE id = ?").bind(leadId).first();
}

export function updateLeadState(db, leadId, estado) {
  return db.prepare("UPDATE leads SET estado = ? WHERE id = ?").bind(estado, leadId).run();
}

export function addMessage(db, leadId, autor, canal, corpo) {
  return db
    .prepare(
      `INSERT INTO mensagens (lead_id, autor, canal, corpo, created_at)
       VALUES (?,?,?,?,?)`
    )
    .bind(leadId, autor, canal, corpo, now())
    .run()
    .then((r) => r.meta.last_row_id);
}

export async function listMessages(db, leadId) {
  const r = await db
    .prepare("SELECT * FROM mensagens WHERE lead_id = ? ORDER BY id ASC")
    .bind(leadId)
    .all();
  return r.results;
}

export function addAlert(db, nivel, origem, titulo, detalhe, accao = "") {
  return db
    .prepare(
      `INSERT INTO alertas (nivel, origem, titulo, detalhe, accao, created_at)
       VALUES (?,?,?,?,?,?)`
    )
    .bind(nivel, origem, titulo, detalhe, accao, now())
    .run();
}

export async function listAlerts(db, limit = 60) {
  const r = await db
    .prepare("SELECT * FROM alertas ORDER BY id DESC LIMIT ?")
    .bind(limit)
    .all();
  return r.results;
}

export function markAlertsRead(db) {
  return db.prepare("UPDATE alertas SET lido = 1").run();
}

export function logAudit(db, evento, ip, detalhe = "") {
  return db
    .prepare("INSERT INTO auditoria (evento, ip, detalhe, created_at) VALUES (?,?,?,?)")
    .bind(evento, ip, detalhe, now())
    .run();
}

export async function listAudit(db, limit = 50) {
  const r = await db
    .prepare("SELECT * FROM auditoria ORDER BY id DESC LIMIT ?")
    .bind(limit)
    .all();
  return r.results;
}

/* Modo de manutenção — antes em memória no processo Python, agora persistido
 * na tabela `sistema` para sobreviver entre pedidos/instâncias do Worker. */

export async function getMaintenance(db) {
  try {
    const row = await db
      .prepare("SELECT valor FROM sistema WHERE chave = 'manutencao'")
      .first();
    if (row) return JSON.parse(row.valor);
  } catch { /* tabela pode ainda não existir */ }
  return { on: false, reason: "" };
}

export function setMaintenance(db, state) {
  return db
    .prepare(
      `INSERT INTO sistema (chave, valor) VALUES ('manutencao', ?)
       ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor`
    )
    .bind(JSON.stringify(state))
    .run()
    .then(() => state);
}

/** Estatísticas do painel — mesma estrutura de db.stats() do Python. */
export async function stats(db) {
  const [total, novos, andamento, fechados, msgs, alerts, porServico, porDia] =
    await Promise.all([
      db.prepare("SELECT COUNT(*) c FROM leads").first(),
      db.prepare("SELECT COUNT(*) c FROM leads WHERE estado='novo'").first(),
      db.prepare("SELECT COUNT(*) c FROM leads WHERE estado='em_andamento'").first(),
      db.prepare("SELECT COUNT(*) c FROM leads WHERE estado='concluido'").first(),
      db.prepare("SELECT COUNT(*) c FROM mensagens").first(),
      db.prepare("SELECT COUNT(*) c FROM alertas WHERE lido=0").first(),
      db.prepare(
        "SELECT servico, COUNT(*) c FROM leads GROUP BY servico ORDER BY c DESC LIMIT 6"
      ).all(),
      db.prepare(
        `SELECT substr(created_at,1,10) d, COUNT(*) c FROM leads
         GROUP BY d ORDER BY d DESC LIMIT 14`
      ).all(),
    ]);
  const t = total.c;
  const conv = t ? Math.round((fechados.c / t) * 1000) / 10 : 0;
  return {
    total: t,
    novos: novos.c,
    andamento: andamento.c,
    concluidos: fechados.c,
    mensagens: msgs.c,
    alertas: alerts.c,
    conversao: new PyFloat(conv),
    por_servico: porServico.results,
    por_dia: [...porDia.results].reverse(),
  };
}
