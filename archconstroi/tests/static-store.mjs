/* Testa a lógica pura da versão estática (data.js + store.js) em Node.
 * Executar: node tests/static-store.mjs  (a partir de archconstroi/) */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const STATIC = path.resolve(ROOT, "..", "deploy", "static", "js");

/* ambiente mínimo de navegador */
const mem = new Map();
const makeStorage = () => ({
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
  clear: () => mem.clear(),
});
globalThis.localStorage = makeStorage();
globalThis.sessionStorage = makeStorage();
globalThis.location = { href: "http://localhost/index.html", pathname: "/index.html", replace() {}, assign() {} };
globalThis.addEventListener = () => {};
globalThis.window = globalThis;

const events = [];
function evalFile(f) {
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(path.join(STATIC, f), "utf8"))();
}
evalFile("data.js");
evalFile("store.js");
ARCH.init();

/* capturar eventos em tempo real */
globalThis.ARCH.on((ev) => events.push(ev));

let pass = 0, fail = 0;
function ok(name, cond) {
  if (cond) { pass++; } else { fail++; console.error("  ✗ FALHOU:", name); }
}
const t = async (name, fn) => { await fn(); console.log("  ✓", name); };

console.log("== dados embutidos ==");
await t("seed carregado", () => {
  const db = JSON.parse(localStorage.getItem("archconstroi_db_v1"));
  ok("admins", db.admins.length === 2);
  ok("leads", db.leads.length === 6);
  ok("mensagens", db.mensagens.length === 16);
  ok("alertas", db.alertas.length === 65);
  ok("auditoria", db.auditoria.length === 46);
});

console.log("== autenticação (PBKDF2 260k) ==");
await t("belarmino entra com o próprio e-mail como senha", async () => {
  const r = await ARCH.login("belarmino.bengue1960@gmail.com", "belarmino.bengue1960@gmail.com");
  ok("login ok", r.ok === true);
  ok("sessão criada", ARCH.session().admin === "belarmino.bengue1960@gmail.com");
});
await t("arch / A4cc@ continua válido", async () => {
  ARCH.logout();
  const r = await ARCH.login("arch", "A4cc@");
  ok("login ok", r.ok === true);
});
await t("senha errada rejeitada", async () => {
  ARCH.logout();
  const r = await ARCH.login("arch", "senha-errada");
  ok("bloqueado", r.ok === false && /Credenciais inválidas/.test(r.erro));
});

console.log("== validação e limpeza ==");
await t("lead válido passa", () => {
  const v = ARCH.validateLead({
    csrf: "x", nome: "João Cliente", empresa: "", email: "joao@exemplo.co.ao",
    telefone: "923 000 111", servico: "Projecto de Arquitectura", mensagem: "Quero construir uma casa T3.",
  });
  ok("ok", v.ok === true && v.dados.nome === "João Cliente");
});
await t("injecção rejeitada", () => {
  const v = ARCH.validateLead({
    csrf: "x", nome: "João", empresa: "", email: "joao@exemplo.co.ao",
    telefone: "923000111", servico: "x", mensagem: "ola<script>alert(1)</script> mundo inteiro aqui",
  });
  ok("bloqueado", v.ok === false && /conteúdo suspeito/.test(v.erro));
});
await t("clean() neutraliza tags", () => {
  ok("limpo", ARCH.clean("<script>boom</script>") === "&lt;script&gt;boom&lt;/script&gt;");
});

console.log("== operações e tempo real ==");
await t("inserir lead + mensagem emite eventos", () => {
  const n0 = events.filter((e) => e.tipo === "novo_lead").length;
  const m0 = events.filter((e) => e.tipo === "msg_cliente").length;
  const id = ARCH.insertLead({
    nome: "Teste Estático", empresa: "", email: "teste@estatico.ao",
    telefone: "923123456", servico: "Remodelação", mensagem: "Mensagem de teste da versão estática.",
  });
  ARCH.addMessage(id, "cliente", "painel", "olá do cliente");
  ok("novo_lead emitido", events.filter((e) => e.tipo === "novo_lead").length === n0 + 1);
  ok("msg_cliente emitido", events.filter((e) => e.tipo === "msg_cliente").length === m0 + 1);
  ok("lead pesquisável", ARCH.listLeads(null, "Teste Estático").some((l) => l.id === id));
});
await t("estatísticas do seed", () => {
  const s = ARCH.stats();
  ok("total>=7", s.total >= 7);
  ok("por_dia 14 dias", s.por_dia.length === 14);
  ok("por_servico com dados", s.por_servico.length >= 1);
  ok("conversao", typeof s.conversao === "number");
});
await t("alteração de estado emite evento", () => {
  const alvo = ARCH.listLeads()[0];
  ARCH.updateLeadState(alvo.id, "em_andamento");
  ok("evento", events.some((e) => e.tipo === "estado_alterado" && e.lead_id === alvo.id));
  ok("persistido", ARCH.getLead(alvo.id).estado === "em_andamento");
});

console.log("== manutenção + rate limit ==");
await t("manutenção liga/desliga", () => {
  let m = ARCH.setMaintenance(true, "teste");
  ok("ligada", m.on === true && ARCH.getMaintenance().on === true);
  m = ARCH.setMaintenance(false, "");
  ok("desligada", m.on === false);
});
await t("rate limit bloqueia à 6ª submissão", () => {
  for (let i = 0; i < 5; i++) ok("passa " + i, ARCH.rateCheck("lead:teste", 5, 600, 900));
  ok("bloqueado", !ARCH.rateCheck("lead:teste", 5, 600, 900));
  ok("bloqueio activo", ARCH.rateBlockedFor("lead:teste") > 0);
});

console.log(fail ? `\n✗ ${fail} FALHAS` : `\n✔ lógica estática OK (${pass} verificações)`);
process.exit(fail ? 1 : 0);
