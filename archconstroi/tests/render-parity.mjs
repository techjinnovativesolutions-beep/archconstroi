/**
 * Arch Constroi – Teste de paridade de renderização
 * Desenvolvido por: Tech J Innovative Solutions
 *
 * Compara a saída do motor de templates JavaScript (src/render.js) com as
 * páginas douradas geradas pelo Jinja2 original do backend Python no momento
 * da migração (guardadas em tests/golden/, derivadas dos dados do seed).
 *
 * Uso: node tests/render-parity.mjs [pasta-dourada]
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { renderTemplate } from "../src/render.js";
import { cfg, SERVICES } from "../src/config.js";
import { PyFloat } from "../src/db.js";
import { IMAGENS } from "../src/manifest.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const GOLDEN = process.argv[2] || join(ROOT, "tests", "golden");

/* ------- registos de templates (importados como texto, como no Worker) -- */
const registry = {};
for (const f of readdirSync(join(ROOT, "templates"))) {
  if (f.endsWith(".html")) registry[f] = readFileSync(join(ROOT, "templates", f), "utf8");
}

/* ------- contexto do painel, lido da mesma base SQLite ------------------ */
const db = new DatabaseSync(join(ROOT, "data", "archconstroi.db"), { readOnly: true });
const q = (sql) => db.prepare(sql).all();
const one = (sql) => db.prepare(sql).get();

const total = one("SELECT COUNT(*) c FROM leads").c;
const novos = one("SELECT COUNT(*) c FROM leads WHERE estado='novo'").c;
const andamento = one("SELECT COUNT(*) c FROM leads WHERE estado='em_andamento'").c;
const fechados = one("SELECT COUNT(*) c FROM leads WHERE estado='concluido'").c;
const conv = total ? Math.round((fechados / total) * 1000) / 10 : 0;

const stats = {
  total,
  novos,
  andamento,
  concluidos: fechados,
  mensagens: one("SELECT COUNT(*) c FROM mensagens").c,
  alertas: one("SELECT COUNT(*) c FROM alertas WHERE lido=0").c,
  conversao: new PyFloat(conv),
  por_servico: q("SELECT servico, COUNT(*) c FROM leads GROUP BY servico ORDER BY c DESC LIMIT 6"),
  por_dia: q("SELECT substr(created_at,1,10) d, COUNT(*) c FROM leads GROUP BY d ORDER BY d DESC LIMIT 14").reverse(),
};

const base = (extra) => Object.assign({ cfg, services: SERVICES }, extra);
const CSRF = "TESTCSRF";

const pages = {
  index: ["index.html", base({
    hero: IMAGENS.hero, history: IMAGENS.history,
    obras: IMAGENS.obras.slice(0, 9), page: "home",
  })],
  sobre: ["sobre.html", base({ obras: IMAGENS.obras, page: "sobre" })],
  servicos: ["servicos.html", base({ obras: IMAGENS.obras, page: "servicos" })],
  contactos: ["contactos.html", base({ csrf: CSRF, page: "contactos" })],
  admin_login: ["admin_login.html", base({ csrf: CSRF, erro: "" })],
  admin_dashboard: ["admin_dashboard.html", base({
    admin: "arch", csrf: CSRF, stats,
    leads: q("SELECT * FROM leads ORDER BY id DESC LIMIT 300"),
    alertas: q("SELECT * FROM alertas ORDER BY id DESC LIMIT 60"),
    auditoria: q("SELECT * FROM auditoria ORDER BY id DESC LIMIT 50"),
    manutencao: { on: false, reason: "" },
  })],
  manutencao: ["manutencao.html", base({ motivo: "" })],
};

let failures = 0;
for (const [name, [tmpl, context]] of Object.entries(pages)) {
  const jsOut = renderTemplate(tmpl, context, registry);
  const goldenPath = join(GOLDEN, `${name}.html`);
  if (!existsSync(goldenPath)) {
    console.log(`⚠ ${name}: dourado ausente (${goldenPath})`);
    continue;
  }
  const gold = readFileSync(goldenPath, "utf8");
  if (jsOut === gold) {
    console.log(`✔ ${name}: idêntico (${gold.length} chars)`);
    continue;
  }
  failures++;
  console.log(`✘ ${name}: DIFERENTE`);
  const a = gold.split("\n"), b = jsOut.split("\n");
  const n = Math.max(a.length, b.length);
  let shown = 0;
  for (let i = 0; i < n && shown < 6; i++) {
    if (a[i] !== b[i]) {
      shown++;
      console.log(`  linha ${i + 1}\n    py: ${JSON.stringify(a[i])}\n    js: ${JSON.stringify(b[i])}`);
    }
  }
}

if (failures) {
  console.error(`\n${failures} página(s) com diferenças.`);
  process.exit(1);
}
console.log("\nParidade total: o motor JavaScript reproduz o Jinja2 byte a byte.");
