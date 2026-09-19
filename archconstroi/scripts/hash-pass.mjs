/**
 * Arch Constroi – Gerador de hash PBKDF2 para palavras-passe de administração
 * Desenvolvido por: Tech J Innovative Solutions
 *
 * Equivalente JavaScript do hash gerado pelo antigo backend Python
 * (PBKDF2-HMAC-SHA256, 260 000 iterações + salt). Útil para criar contas
 * de administração directamente na base D1:
 *
 *   node scripts/hash-pass.mjs "NovaSenhaForte"
 *   INSERT INTO admins (username, password_hash, created_at) VALUES (...);
 */
import { hashPassword } from "../src/security.js";

const senha = process.argv[2];
if (!senha) {
  console.error("Uso: node scripts/hash-pass.mjs <nova-palavra-passe>");
  process.exit(1);
}
console.log(await hashPassword(senha));
