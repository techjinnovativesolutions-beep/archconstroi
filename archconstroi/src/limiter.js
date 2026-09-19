/**
 * Arch Constroi – Rate limiting global (Durable Object)
 * Desenvolvido por: Tech J Innovative Solutions
 *
 * Substitui a classe RateLimiter do antigo app/security.py (Python).
 * A lógica é idêntica — janela deslizante por chave, bloqueio temporário
 * quando o limite é excedido e reset manual — mas vive num Durable Object
 * para ser partilhada por todas as instâncias do Worker na Cloudflare
 * (em Python vivia na memória do único processo Uvicorn).
 *
 * Operações (POST, JSON):
 *   {op:"check", key, limit, window, block}  → {ok:boolean}
 *   {op:"reset", key}                        → {}
 *   {op:"blocked_for", key}                  → {secs:number}
 */
export class RateLimiter {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.hits = new Map();     // chave → [timestamps]
    this.blocked = new Map();  // chave → instante de desbloqueio (ms)
  }

  check(key, limit, windowSec, blockSec = 300) {
    const now = Date.now();
    const until = this.blocked.get(key) || 0;
    if (until > now) return false;

    let q = this.hits.get(key);
    if (!q) {
      q = [];
      this.hits.set(key, q);
    }
    const cutoff = now - windowSec * 1000;
    while (q.length && q[0] <= cutoff) q.shift();

    if (q.length >= limit) {
      this.blocked.set(key, now + blockSec * 1000);
      q.length = 0;
      return false;
    }
    q.push(now);
    return true;
  }

  reset(key) {
    this.hits.delete(key);
    this.blocked.delete(key);
  }

  blockedFor(key) {
    return Math.max(0, Math.floor(((this.blocked.get(key) || 0) - Date.now()) / 1000));
  }

  async fetch(request) {
    try {
      const d = await request.json();
      let out = {};
      if (d.op === "check") {
        out = { ok: this.check(d.key, d.limit, d.window, d.block) };
      } else if (d.op === "reset") {
        this.reset(d.key);
      } else if (d.op === "blocked_for") {
        out = { secs: this.blockedFor(d.key) };
      }
      return Response.json(out);
    } catch {
      // em falha do limitador, deixa passar (tal como um erro interno no Python)
      return Response.json({ ok: true });
    }
  }
}
