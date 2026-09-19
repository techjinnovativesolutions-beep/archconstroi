/**
 * Arch Constroi – Exportador da base de dados SQLite → SQL (D1 / Cloudflare)
 * Desenvolvido por: Tech J Innovative Solutions
 *
 * Lê data/archconstroi.db (a base original do backend Python) e produz
 * data/seed.sql + migrations/0002_seed.sql com TODOS os registos preservados
 * (admins, leads, mensagens, alertas, auditoria) — nenhum dado é apagado.
 *
 * Uso: node scripts/export-db.mjs
 */
import { DatabaseSync } from "node:sqlite";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DB = join(ROOT, "data", "archconstroi.db");

const db = new DatabaseSync(DB, { readOnly: true });

function lit(v) {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "NULL";
  if (typeof v === "bigint") return v.toString();
  return "'" + String(v).replaceAll("'", "''") + "'";
}

const TABLES = ["admins", "leads", "mensagens", "alertas", "auditoria"];
const lines = [
  "-- Arch Constroi – dados migrados da base SQLite original (data/archconstroi.db)",
  "-- TODOS os registos preservados. Gerado por scripts/export-db.mjs.",
  "BEGIN TRANSACTION;",
];

let total = 0;
for (const t of TABLES) {
  const rows = db.prepare(`SELECT * FROM ${t} ORDER BY id`).all();
  if (!rows.length) continue;
  const cols = Object.keys(rows[0]);
  lines.push(`-- ${t}: ${rows.length} registo(s)`);
  for (const r of rows) {
    lines.push(
      `INSERT INTO ${t} (${cols.join(", ")}) VALUES (${cols.map((c) => lit(r[c])).join(", ")});`
    );
    total++;
  }
  // Nota: inserções com id explícito em tabelas AUTOINCREMENT actualizam
  // automaticamente sqlite_sequence — nada mais a fazer.
}
lines.push("COMMIT;");

mkdirSync(join(ROOT, "migrations"), { recursive: true });
const sql = lines.join("\n") + "\n";
writeFileSync(join(ROOT, "data", "seed.sql"), sql, "utf8");
writeFileSync(join(ROOT, "migrations", "0002_seed.sql"), sql, "utf8");
console.log(`Exportados ${total} registos para data/seed.sql e migrations/0002_seed.sql`);
