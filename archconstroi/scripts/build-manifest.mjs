/**
 * Arch Constroi – Gerador do manifesto de imagens
 * Desenvolvido por: Tech J Innovative Solutions
 *
 * Equivalente JavaScript da função gallery() do antigo app/main.py:
 * lista as imagens de cada pasta em static/img e ordena por (len(nome), nome),
 * exactamente como fazia o Python: sorted(files, key=lambda n: (len(n), n)).
 *
 * Uso: node scripts/build-manifest.mjs
 */
import { readdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const IMG = join(ROOT, "static", "img");

function gallery(folder) {
  const files = readdirSync(join(IMG, folder))
    .filter((f) => /\.(jpeg|jpg|png)$/i.test(f))
    .sort((a, b) => (a.length - b.length) || (a < b ? -1 : a > b ? 1 : 0));
  return files.map((f) => `/static/img/${folder}/${f}`);
}

const manifest = {
  hero: gallery("hero"),
  history: gallery("history"),
  obras: gallery("obras"),
};

const out = `/* Arch Constroi – manifesto de imagens (gerado automaticamente)
 * Desenvolvido por: Tech J Innovative Solutions
 * Regenerar com: node scripts/build-manifest.mjs
 * Equivalente à função gallery() do antigo backend Python. */
export const IMAGENS = ${JSON.stringify(manifest, null, 2)};
`;

writeFileSync(join(ROOT, "src", "manifest.js"), out, "utf8");
console.log("src/manifest.js gerado:", Object.entries(manifest).map(([k, v]) => `${k}=${v.length}`).join(" "));
