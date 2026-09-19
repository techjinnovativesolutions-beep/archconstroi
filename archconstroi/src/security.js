/**
 * Arch Constroi – Camada de Segurança
 * Desenvolvido por: Tech J Innovative Solutions
 *
 * Migração fiel de app/security.py (Python) para Web Crypto / JavaScript:
 *  - PBKDF2-HMAC-SHA256 com 260 000 iterações (mesmo formato de hash,
 *    pelo que as palavras-passe existentes continuam válidas);
 *  - sanitização/escape, detecção de payloads maliciosos, validação de leads;
 *  - sessões assinadas com HMAC-SHA256 + expiração (substitui itsdangerous);
 *  - CSRF por token de sessão com comparação em tempo constante;
 *  - rate limiting em Durable Object (src/limiter.js);
 *  - cabeçalhos de segurança idênticos aos do backend Python.
 */

const enc = new TextEncoder();

/* ------------------------------------------------------------------ */
/* Utilitários                                                         */
/* ------------------------------------------------------------------ */

export function bytesToHex(bytes) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function hexToBytes(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export function b64url(bytes) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function b64urlDecode(str) {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  const bin = atob(str.replace(/-/g, "+").replace(/_/g, "/") + pad);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

/** Comparação em tempo constante (equivale a hmac.compare_digest). */
export function timingSafeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const ba = enc.encode(a);
  const bb = enc.encode(b);
  if (ba.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ba.length; i++) diff |= ba[i] ^ bb[i];
  return diff === 0;
}

export function randomToken(bytes = 32) {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return b64url(buf); // equivale a secrets.token_urlsafe
}

/* ------------------------------------------------------------------ */
/* Hash de senha (PBKDF2-HMAC-SHA256, 260k iterações)                  */
/* ------------------------------------------------------------------ */

export const PBKDF2_ROUNDS = 260000;

async function pbkdf2(password, saltBytes, rounds) {
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: saltBytes, iterations: rounds },
    key,
    256
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password, salt = null) {
  const saltBytes = salt || crypto.getRandomValues(new Uint8Array(16));
  const dk = await pbkdf2(password, saltBytes, PBKDF2_ROUNDS);
  return `pbkdf2_sha256$${PBKDF2_ROUNDS}$${bytesToHex(saltBytes)}$${bytesToHex(dk)}`;
}

export async function verifyPassword(password, stored) {
  try {
    const [algo, rounds, saltHex, hashHex] = String(stored).split("$");
    if (algo !== "pbkdf2_sha256") return false;
    const dk = await pbkdf2(password, hexToBytes(saltHex), parseInt(rounds, 10));
    return timingSafeEqual(bytesToHex(dk), hashHex);
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Sanitização de entrada / saída (XSS, JS Injection, SQLi)            */
/* ------------------------------------------------------------------ */

const _DANGEROUS =
  /(<\s*script)|(javascript\s*:)|(on\w+\s*=)|(<\s*iframe)|(document\.cookie)|(\bunion\b.+\bselect\b)|(--\s)|(\/\*)|(\bdrop\s+table\b)|(\bor\b\s+1\s*=\s*1)/is;
const _CTRL = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g;

/** Normaliza, remove controlos, corta e escapa entidades HTML (html.escape). */
export function clean(value, maxLen = 2000) {
  if (value === null || value === undefined) return "";
  let v = String(value).slice(0, maxLen);
  v = v.replace(_CTRL, "").trim();
  v = v.replace(/\r\n/g, "\n");
  return escapeHtmlPython(v);
}

/** Escape do html.escape(quote=True) do Python: & < > " ' */
export function escapeHtmlPython(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

export function isMalicious(value) {
  return _DANGEROUS.test(value || "");
}

export const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
export const PHONE_RE = /^[+0-9 ()-]{6,25}$/;
// \w do Python com re.UNICODE ≈ letras/números/dígitos Unicode + _
export const NAME_RE = /^[\p{L}\p{N}_\s'.-]{3,120}$/u;

/** Valida o formulário de solicitação. Devolve {ok, erro, dados}. */
export function validateLead(data) {
  const d = data || {};
  const rawName = String(d.nome || "").trim();
  const rawEmail = String(d.email || "").trim();
  const rawPhone = String(d.telefone || "").trim();
  const rawCompany = String(d.empresa || "").trim();
  const rawMsg = String(d.mensagem || "").trim();
  const rawService = String(d.servico || "Geral").trim();

  for (const field of [rawName, rawEmail, rawPhone, rawCompany, rawMsg, rawService]) {
    if (isMalicious(field)) {
      return { ok: false, erro: "Conteúdo inválido detectado no formulário.", dados: {} };
    }
  }
  if (!NAME_RE.test(rawName)) {
    return { ok: false, erro: "Nome completo inválido (mínimo 3 caracteres).", dados: {} };
  }
  if (!EMAIL_RE.test(rawEmail) || rawEmail.length > 190) {
    return { ok: false, erro: "E-mail inválido.", dados: {} };
  }
  if (!PHONE_RE.test(rawPhone)) {
    return { ok: false, erro: "Número de telefone inválido.", dados: {} };
  }
  if (rawMsg.length < 10) {
    return { ok: false, erro: "Descreva a solicitação com pelo menos 10 caracteres.", dados: {} };
  }

  return {
    ok: true,
    erro: "",
    dados: {
      nome: clean(rawName, 120),
      email: clean(rawEmail, 190),
      telefone: clean(rawPhone, 25),
      empresa: clean(rawCompany, 140) || "—",
      servico: clean(rawService, 80),
      mensagem: clean(rawMsg, 4000),
    },
  };
}

/* ------------------------------------------------------------------ */
/* Sessões assinadas (substitui itsdangerous.URLSafeTimedSerializer)   */
/* ------------------------------------------------------------------ */

async function hmacKey(secret) {
  return crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]
  );
}

/** Cria o cookie de sessão assinado: base64url(payload).base64url(hmac). */
export async function dumpSession(data, secret, maxAge) {
  const payload = { d: data, e: Math.floor(Date.now() / 1000) + maxAge };
  const body = b64url(enc.encode(JSON.stringify(payload)));
  const key = await hmacKey(secret);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(body)));
  return `${body}.${b64url(sig)}`;
}

/** Lê e valida a sessão; devolve {} quando inválida ou expirada. */
export async function loadSession(raw, secret, maxAge) {
  if (!raw) return {};
  try {
    const idx = raw.lastIndexOf(".");
    if (idx <= 0) return {};
    const body = raw.slice(0, idx);
    const sig = raw.slice(idx + 1);
    const key = await hmacKey(secret);
    const expected = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(body)));
    if (!timingSafeEqual(b64url(expected), sig)) return {};
    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(body)));
    if (!payload || typeof payload.e !== "number") return {};
    if (payload.e < Math.floor(Date.now() / 1000)) return {}; // max_age excedido
    return payload.d || {};
  } catch {
    return {};
  }
}

/* ------------------------------------------------------------------ */
/* CSRF                                                                */
/* ------------------------------------------------------------------ */

export function newCsrf() {
  return randomToken(32); // secrets.token_urlsafe(32)
}

export function csrfOk(sessionToken, sentToken) {
  return Boolean(sessionToken) && Boolean(sentToken) &&
    timingSafeEqual(String(sessionToken), String(sentToken));
}

/* ------------------------------------------------------------------ */
/* Cabeçalhos de segurança (idênticos aos do backend Python)           */
/* ------------------------------------------------------------------ */

export const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "geolocation=(), microphone=(), camera=(), payment=()",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Cross-Origin-Opener-Policy": "same-origin",
  "X-DNS-Prefetch-Control": "off",
  "X-Permitted-Cross-Domain-Policies": "none",
  "Content-Security-Policy":
    "default-src 'self'; " +
    "img-src 'self' data: https://maps.googleapis.com https://maps.gstatic.com; " +
    "style-src 'self' 'unsafe-inline'; " +
    "script-src 'self'; " +
    "connect-src 'self' ws: wss:; " +
    "frame-src https://www.google.com https://maps.google.com; " +
    "frame-ancestors 'self'; base-uri 'self'; form-action 'self'; " +
    "object-src 'none'",
};
