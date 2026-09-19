/**
 * Arch Constroi – Motor de templates (subconjunto de Jinja2 em JavaScript)
 * Desenvolvido por: Tech J Innovative Solutions
 *
 * Substitui o Jinja2Templates do backend Python. Suporta exactamente a
 * sintaxe usada nos templates deste projecto:
 *   {% extends %} / {% block %} / {% endblock %}
 *   {% set nome = expr %}
 *   {% if expr %} ... {% endif %}
 *   {% for a, b in lista %} ... {% else %} ... {% endfor %}   (loop.index)
 *   {{ expr }}  com filtros replace, urlencode, round, map, max,
 *   atributos (a.b.c), slices (obras[:9]), tuplos/listas, expressão
 *   condicional "A if COND else B", operadores or/and/not/comparação/
 *   aritmética e multiplicação de strings ("★" * n).
 * Autoescape HTML activo (igual ao Jinja2 do FastAPI).
 */

import { PyFloat } from "./db.js";

/* ------------------------------------------------------------------ */
/* Escape de saída (escape do Jinja2: & < > " ')                       */
/* ------------------------------------------------------------------ */
function jinjaEscape(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&#34;")
    .replace(/'/g, "&#39;");
}

function toOutput(v) {
  if (v === null || v === undefined) return "";
  if (v instanceof PyFloat) return jinjaEscape(v.toString());
  if (typeof v === "number") return jinjaEscape(String(v));
  if (typeof v === "boolean") return jinjaEscape(String(v));
  if (Array.isArray(v)) return jinjaEscape(JSON.stringify(v));
  return jinjaEscape(String(v));
}

function truthy(v) {
  if (v === null || v === undefined || v === false) return false;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") return v.length > 0;
  if (Array.isArray(v)) return v.length > 0;
  if (v instanceof PyFloat) return v.v !== 0;
  if (typeof v === "object") return Object.keys(v).length > 0;
  return Boolean(v);
}

/* ------------------------------------------------------------------ */
/* Tokenizador de templates                                            */
/* ------------------------------------------------------------------ */
function tokenizeTemplate(source) {
  const parts = source.split(/(\{%[\s\S]*?%\}|\{\{[\s\S]*?\}\})/g);
  const out = [];
  for (const p of parts) {
    if (p === "") continue;
    if (p.startsWith("{%") && p.endsWith("%}")) {
      out.push({ t: "tag", s: p.slice(2, -2).trim() });
    } else if (p.startsWith("{{") && p.endsWith("}}")) {
      out.push({ t: "out", s: p.slice(2, -2).trim() });
    } else {
      out.push({ t: "text", s: p });
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Tokenizador de expressões                                           */
/* ------------------------------------------------------------------ */
function lexExpr(src) {
  const toks = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === '"' || c === "'") {
      let j = i + 1, v = "";
      while (j < src.length && src[j] !== c) {
        if (src[j] === "\\" && j + 1 < src.length) {
          const n = src[j + 1];
          v += n === "n" ? "\n" : n === "t" ? "\t" : n;
          j += 2;
        } else {
          v += src[j];
          j++;
        }
      }
      if (j >= src.length) throw new Error(`String não terminada: ${src}`);
      toks.push({ t: "str", v });
      i = j + 1;
      continue;
    }
    if (/[0-9]/.test(c) || (c === "." && /[0-9]/.test(src[i + 1] || ""))) {
      let j = i;
      while (j < src.length && /[0-9._]/.test(src[j])) j++;
      toks.push({ t: "num", v: parseFloat(src.slice(i, j).replace(/_/g, "")) });
      i = j;
      continue;
    }
    if (/[A-Za-z_À-ÿ]/.test(c)) {
      let j = i;
      while (j < src.length && /[\wÀ-ÿ]/.test(src[j])) j++;
      toks.push({ t: "name", v: src.slice(i, j) });
      i = j;
      continue;
    }
    const three = src.slice(i, i + 2);
    if (["==", "!=", "<=", ">=", "//", "**"].includes(three)) {
      toks.push({ t: "op", v: three });
      i += 2;
      continue;
    }
    if ("()[]{},:.<>+-*/%|=".includes(c)) {
      toks.push({ t: "op", v: c });
      i++;
      continue;
    }
    throw new Error(`Caracter inesperado na expressão: '${c}' em ${src}`);
  }
  return toks;
}

/* ------------------------------------------------------------------ */
/* Parser/avaliador de expressões                                      */
/* ------------------------------------------------------------------ */
const KEYWORDS = new Set(["if", "else", "or", "and", "not", "in", "is", "for"]);

class ExprParser {
  constructor(src) {
    this.toks = lexExpr(src);
    this.i = 0;
  }
  peek() { return this.toks[this.i]; }
  next() { return this.toks[this.i++]; }
  expectOp(v) {
    const t = this.next();
    if (!t || t.t !== "op" || t.v !== v) {
      throw new Error(`Esperava '${v}' na expressão`);
    }
    return t;
  }
  parse() {
    const node = this.parseCond();
    if (this.i < this.toks.length) throw new Error("Expressão com sobras");
    return node;
  }
  parseCond() {
    const left = this.parseOr();
    const t = this.peek();
    if (t && t.t === "name" && t.v === "if") {
      this.next();
      const cond = this.parseOr();
      let right = { k: "lit", v: null }; // Jinja: "A if B" sem else → None
      if (this.peek()?.t === "name" && this.peek().v === "else") {
        this.next();
        right = this.parseCond();
      }
      return { k: "cond", cond, left, right };
    }
    return left;
  }
  parseOr() {
    let left = this.parseAnd();
    while (this.peek()?.t === "name" && this.peek().v === "or") {
      this.next();
      left = { k: "or", l: left, r: this.parseAnd() };
    }
    return left;
  }
  parseAnd() {
    let left = this.parseCmp();
    while (this.peek()?.t === "name" && this.peek().v === "and") {
      this.next();
      left = { k: "and", l: left, r: this.parseCmp() };
    }
    return left;
  }
  parseCmp() {
    const left = this.parseAdd();
    const t = this.peek();
    if (t?.t === "op" && ["==", "!=", "<", ">", "<=", ">="].includes(t.v)) {
      this.next();
      return { k: "cmp", op: t.v, l: left, r: this.parseAdd() };
    }
    if (t?.t === "name" && t.v === "in") {
      this.next();
      return { k: "in", l: left, r: this.parseAdd() };
    }
    return left;
  }
  parseAdd() {
    let left = this.parseMul();
    while (this.peek()?.t === "op" && ["+", "-"].includes(this.peek().v)) {
      const op = this.next().v;
      left = { k: "bin", op, l: left, r: this.parseMul() };
    }
    return left;
  }
  parseMul() {
    let left = this.parseUnary();
    while (this.peek()?.t === "op" && ["*", "/", "//", "%"].includes(this.peek().v)) {
      const op = this.next().v;
      left = { k: "bin", op, l: left, r: this.parseUnary() };
    }
    return left;
  }
  parseUnary() {
    const t = this.peek();
    if (t?.t === "op" && t.v === "-") {
      this.next();
      return { k: "neg", v: this.parseUnary() };
    }
    if (t?.t === "name" && t.v === "not") {
      this.next();
      return { k: "not", v: this.parseUnary() };
    }
    return this.parsePostfix();
  }
  parsePostfix() {
    let node = this.parsePrimary();
    for (;;) {
      const t = this.peek();
      if (!t) break;
      if (t.t === "op" && t.v === ".") {
        this.next();
        const name = this.next();
        if (name?.t !== "name") throw new Error("Atributo inválido");
        node = { k: "attr", obj: node, name: name.v };
      } else if (t.t === "op" && t.v === "[") {
        this.next();
        node = this.parseSubscript(node);
      } else if (t.t === "op" && t.v === "|") {
        this.next();
        const fname = this.next();
        if (fname?.t !== "name") throw new Error("Filtro inválido");
        const args = [];
        const kwargs = {};
        if (this.peek()?.t === "op" && this.peek().v === "(") {
          this.next();
          while (!(this.peek()?.t === "op" && this.peek().v === ")")) {
            const save = this.i;
            const maybeName = this.next();
            if (
              maybeName?.t === "name" && !KEYWORDS.has(maybeName.v) &&
              this.peek()?.t === "op" && this.peek().v === "="
            ) {
              this.next(); // consome '='
              kwargs[maybeName.v] = this.parseCond();
            } else {
              this.i = save;
              args.push(this.parseCond());
            }
            if (this.peek()?.t === "op" && this.peek().v === ",") this.next();
          }
          this.expectOp(")");
        }
        node = { k: "filter", obj: node, name: fname.v, args, kwargs };
      } else {
        break;
      }
    }
    return node;
  }
  parseSubscript(obj) {
    // suporta [i], [a:b], [:b], [a:]
    let start = null, end = null, isSlice = false;
    if (this.peek()?.t === "op" && this.peek().v === ":") {
      isSlice = true;
      this.next();
      if (!(this.peek()?.t === "op" && this.peek().v === "]")) end = this.parseCond();
    } else {
      start = this.parseCond();
      if (this.peek()?.t === "op" && this.peek().v === ":") {
        isSlice = true;
        this.next();
        if (!(this.peek()?.t === "op" && this.peek().v === "]")) end = this.parseCond();
      }
    }
    this.expectOp("]");
    return { k: isSlice ? "slice" : "index", obj, start, end };
  }
  parsePrimary() {
    const t = this.next();
    if (!t) throw new Error("Expressão incompleta");
    if (t.t === "num") return { k: "lit", v: t.v };
    if (t.t === "str") return { k: "lit", v: t.v };
    if (t.t === "name") {
      const low = t.v.toLowerCase();
      if (low === "true") return { k: "lit", v: true };
      if (low === "false") return { k: "lit", v: false };
      if (low === "none") return { k: "lit", v: null };
      return { k: "var", name: t.v };
    }
    if (t.t === "op" && t.v === "(") {
      const items = [];
      let trailingComma = false;
      while (!(this.peek()?.t === "op" && this.peek().v === ")")) {
        items.push(this.parseCond());
        if (this.peek()?.t === "op" && this.peek().v === ",") {
          this.next();
          trailingComma = true;
        } else break;
      }
      this.expectOp(")");
      if (items.length === 1 && !trailingComma) return items[0];
      return { k: "tuple", items };
    }
    if (t.t === "op" && t.v === "[") {
      const items = [];
      while (!(this.peek()?.t === "op" && this.peek().v === "]")) {
        items.push(this.parseCond());
        if (this.peek()?.t === "op" && this.peek().v === ",") this.next();
        else break;
      }
      this.expectOp("]");
      return { k: "list", items };
    }
    throw new Error(`Token inesperado: ${JSON.stringify(t)}`);
  }
}

const exprCache = new Map();
export function compileExpr(src) {
  let ast = exprCache.get(src);
  if (!ast) {
    ast = new ExprParser(src).parse();
    exprCache.set(src, ast);
  }
  return ast;
}

/* ------------------------------------------------------------------ */
/* Avaliação                                                           */
/* ------------------------------------------------------------------ */
function pyRound(x, nd = 0) {
  const f = 10 ** nd;
  const y = x * f;
  const fl = Math.floor(y);
  const diff = y - fl;
  let r;
  if (diff > 0.5) r = fl + 1;
  else if (diff < 0.5) r = fl;
  else r = fl % 2 === 0 ? fl : fl + 1; // arredondamento bancário (round do Python)
  return new PyFloat(r / f);
}

const FILTERS = {
  replace: (v, a, b) => String(v).split(String(a)).join(String(b)),
  urlencode: (v) => encodeURIComponent(String(v)),
  round: (v, nd) => pyRound(Number(v), nd),
  map: (v, kwargs) => (v || []).map((x) => x?.[kwargs.attribute]),
  max: (v) => Math.max(...(v || [])),
};

export function evalExpr(ast, ctx) {
  switch (ast.k) {
    case "lit": return ast.v;
    case "var": {
      if (!(ast.name in ctx)) return null;
      return ctx[ast.name];
    }
    case "attr": {
      const obj = evalExpr(ast.obj, ctx);
      if (obj === null || obj === undefined) return null;
      return obj[ast.name] ?? null;
    }
    case "index": {
      const obj = evalExpr(ast.obj, ctx);
      const idx = evalExpr(ast.start, ctx);
      if (obj === null || obj === undefined) return null;
      const i = idx < 0 ? obj.length + idx : idx;
      return obj[i] ?? null;
    }
    case "slice": {
      const obj = evalExpr(ast.obj, ctx);
      if (obj === null || obj === undefined) return null;
      const start = ast.start ? evalExpr(ast.start, ctx) : 0;
      const end = ast.end ? evalExpr(ast.end, ctx) : obj.length;
      return obj.slice(start, end);
    }
    case "tuple":
    case "list":
      return ast.items.map((x) => evalExpr(x, ctx));
    case "not": return !truthy(evalExpr(ast.v, ctx));
    case "neg": return -Number(evalExpr(ast.v, ctx));
    case "or": {
      const l = evalExpr(ast.l, ctx);
      return truthy(l) ? l : evalExpr(ast.r, ctx);
    }
    case "and": {
      const l = evalExpr(ast.l, ctx);
      return truthy(l) ? evalExpr(ast.r, ctx) : l;
    }
    case "cond":
      return truthy(evalExpr(ast.cond, ctx))
        ? evalExpr(ast.left, ctx)
        : evalExpr(ast.right, ctx);
    case "in": {
      const l = evalExpr(ast.l, ctx);
      const r = evalExpr(ast.r, ctx);
      if (typeof r === "string") return r.includes(String(l));
      if (Array.isArray(r)) return r.includes(l);
      return false;
    }
    case "cmp": {
      const l = evalExpr(ast.l, ctx);
      const r = evalExpr(ast.r, ctx);
      const lv = l instanceof PyFloat ? l.v : l;
      const rv = r instanceof PyFloat ? r.v : r;
      const eq =
        typeof lv === typeof rv
          ? lv === rv
          : (typeof lv === "number" || typeof rv === "number") &&
            Number(lv) === Number(rv) && lv !== null && rv !== null &&
            String(lv) !== "" && String(rv) !== "";
      switch (ast.op) {
        case "==": return eq;
        case "!=": return !eq;
        case "<": return lv < rv;
        case ">": return lv > rv;
        case "<=": return lv <= rv;
        case ">=": return lv >= rv;
      }
      return false;
    }
    case "bin": {
      const l = evalExpr(ast.l, ctx);
      const r = evalExpr(ast.r, ctx);
      switch (ast.op) {
        case "+":
          if (typeof l === "string" || typeof r === "string") return String(l) + String(r);
          return Number(l) + Number(r);
        case "-": return Number(l) - Number(r);
        case "*":
          if (typeof l === "string" && typeof r === "number") return l.repeat(Math.max(0, Math.trunc(r)));
          if (typeof r === "string" && typeof l === "number") return r.repeat(Math.max(0, Math.trunc(l)));
          return Number(l) * Number(r);
        case "/": return Number(l) / Number(r);
        case "//": return Math.floor(Number(l) / Number(r));
        case "%": return Number(l) % Number(r);
      }
      return null;
    }
    case "filter": {
      const v = evalExpr(ast.obj, ctx);
      const args = ast.args.map((a) => evalExpr(a, ctx));
      const kwargs = {};
      for (const [k, n] of Object.entries(ast.kwargs)) kwargs[k] = evalExpr(n, ctx);
      const fn = FILTERS[ast.name];
      if (!fn) throw new Error(`Filtro desconhecido: ${ast.name}`);
      if (ast.name === "map" || ast.name === "round" && Object.keys(kwargs).length) {
        return fn(v, ast.name === "round" ? args[0] : kwargs, ...args);
      }
      return fn(v, ...args);
    }
    default:
      throw new Error(`Nó de expressão desconhecido: ${ast.k}`);
  }
}

/* ------------------------------------------------------------------ */
/* Parser de templates                                                 */
/* ------------------------------------------------------------------ */
function parseNodes(tokens, pos, terminators) {
  const nodes = [];
  while (pos < tokens.length) {
    const tok = tokens[pos];
    if (tok.t === "text") {
      nodes.push({ t: "text", s: tok.s });
      pos++;
      continue;
    }
    if (tok.t === "out") {
      nodes.push({ t: "out", expr: compileExpr(tok.s) });
      pos++;
      continue;
    }
    // tag
    const s = tok.s;
    const head = s.split(/\s+/)[0];
    if (terminators.includes(head)) {
      return { nodes, pos, term: head };
    }
    if (head === "extends" || head === "block" || head === "endblock" ||
        head === "set" || head === "if" || head === "endif" ||
        head === "for" || head === "endfor" || head === "else") {
      // tratados pelos níveis superiores
      return { nodes, pos, term: head };
    }
    throw new Error(`Tag desconhecida: ${s}`);
  }
  return { nodes, pos, term: null };
}

function parseTemplate(source) {
  // Jinja2 remove uma única quebra de linha final do template (keep_trailing_newline=False)
  source = source.replace(/\n$/, "");
  const tokens = tokenizeTemplate(source);
  let pos = 0;
  let extendsName = null;

  // {% extends "..." %} opcional no topo
  if (tokens[0]?.t === "tag" && tokens[0].s.startsWith("extends")) {
    const m = tokens[0].s.match(/^extends\s+["'](.+?)["']$/);
    if (!m) throw new Error("extends inválido");
    extendsName = m[1];
    pos = 1;
  }

  function parseBody(stopTags) {
    const out = [];
    for (;;) {
      const r = parseNodes(tokens, pos, stopTags);
      out.push(...r.nodes);
      pos = r.pos;
      if (r.term === null) return out;
      const term = tokens[pos].s;
      const head = term.split(/\s+/)[0];

      if (stopTags.includes(head)) {
        // devolve ao chamador
        return out;
      }

      if (head === "set") {
        const m = term.match(/^set\s+([A-Za-z_][\w]*)\s*=\s*([\s\S]+)$/);
        if (!m) throw new Error(`set inválido: ${term}`);
        out.push({ t: "set", name: m[1], expr: compileExpr(m[2]) });
        pos++;
        continue;
      }
      if (head === "block") {
        const name = term.split(/\s+/)[1];
        pos++;
        const body = parseBody(["endblock"]);
        expectTag("endblock");
        out.push({ t: "block", name, body });
        continue;
      }
      if (head === "if") {
        const cond = compileExpr(term.slice(2).trim());
        pos++;
        const body = parseBody(["endif"]);
        expectTag("endif");
        out.push({ t: "if", cond, body });
        continue;
      }
      if (head === "for") {
        const m = term.match(/^for\s+(.+?)\s+in\s+([\s\S]+)$/);
        if (!m) throw new Error(`for inválido: ${term}`);
        const vars = m[1].split(",").map((v) => v.trim());
        const iter = compileExpr(m[2]);
        pos++;
        const body = parseBody(["endfor", "else"]);
        let elseBody = null;
        if (tokens[pos] && tokens[pos].t === "tag" && tokens[pos].s.trim() === "else") {
          pos++;
          elseBody = parseBody(["endfor"]);
        }
        expectTag("endfor");
        out.push({ t: "for", vars, iter, body, elseBody });
        continue;
      }
      throw new Error(`Tag inesperada: ${term}`);
    }
  }

  function expectTag(name) {
    const tok = tokens[pos];
    if (!tok || tok.t !== "tag" || tok.s.trim() !== name && !tok.s.startsWith(name)) {
      throw new Error(`Esperava {% ${name} %}`);
    }
    pos++;
  }

  const body = parseBody([]);
  return { extends: extendsName, body };
}

function collectBlocks(nodes, map = new Map()) {
  for (const n of nodes) {
    if (n.t === "block") {
      map.set(n.name, n.body);
      collectBlocks(n.body, map);
    } else if (n.body) collectBlocks(n.body, map);
    else if (n.elseBody) collectBlocks(n.elseBody, map);
  }
  return map;
}

/* ------------------------------------------------------------------ */
/* Renderização                                                        */
/* ------------------------------------------------------------------ */
function renderNodes(nodes, ctx, overrides, out) {
  for (const n of nodes) {
    switch (n.t) {
      case "text":
        out.push(n.s);
        break;
      case "out":
        out.push(toOutput(evalExpr(n.expr, ctx)));
        break;
      case "set":
        ctx[n.name] = evalExpr(n.expr, ctx);
        break;
      case "if":
        if (truthy(evalExpr(n.cond, ctx))) renderNodes(n.body, ctx, overrides, out);
        break;
      case "block": {
        const body = overrides?.get(n.name) || n.body;
        renderNodes(body, ctx, overrides, out);
        break;
      }
      case "for": {
        const list = evalExpr(n.iter, ctx);
        const arr = Array.isArray(list) ? list : list ? [list] : [];
        if (arr.length === 0) {
          if (n.elseBody) renderNodes(n.elseBody, ctx, overrides, out);
          break;
        }
        arr.forEach((item, idx) => {
          const scope = Object.create(ctx);
          if (n.vars.length === 1) {
            scope[n.vars[0]] = item;
          } else {
            n.vars.forEach((v, i) => { scope[v] = item?.[i]; });
          }
          scope.loop = { index: idx + 1, index0: idx, first: idx === 0, last: idx === arr.length - 1 };
          renderNodes(n.body, scope, overrides, out);
        });
        break;
      }
      default:
        throw new Error(`Nó desconhecido: ${n.t}`);
    }
  }
}

const parseCache = new Map();

/**
 * Renderiza um template Jinja2 (subconjunto).
 * @param {string} name      nome do template (ex.: "index.html")
 * @param {object} context   variáveis de contexto (cfg, services, ...)
 * @param {object} registry  mapa nome → fonte de todos os templates
 */
export function renderTemplate(name, context, registry) {
  let tmpl = parseCache.get(name + "\u0000" + registry[name].length);
  if (!tmpl) {
    tmpl = parseTemplate(registry[name]);
    parseCache.set(name + "\u0000" + registry[name].length, tmpl);
  }
  let body = tmpl.body;
  let overrides = null;
  if (tmpl.extends) {
    overrides = collectBlocks(tmpl.body);
    const baseKey = tmpl.extends + "\u0000" + registry[tmpl.extends].length;
    let base = parseCache.get(baseKey);
    if (!base) {
      base = parseTemplate(registry[tmpl.extends]);
      parseCache.set(baseKey, base);
    }
    body = base.body;
  }
  const out = [];
  renderNodes(body, Object.assign(Object.create(null), context), overrides, out);
  return out.join("");
}
