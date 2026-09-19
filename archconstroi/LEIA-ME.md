# Arch Constroi – Engenharia e Construção Civil
Website institucional + Painel Administrativo
**Desenvolvido por: Tech J Innovative Solutions**

> **Migração concluída:** o backend Python (FastAPI/Uvicorn/SQLite) foi
> substituído integralmente por **JavaScript em Cloudflare Workers**, mantendo
> 100% do design, textos, funcionalidades, regras de negócio, autenticação,
> permissões, dados e comportamento. Nada foi apagado.

---

## 1. Arquitectura (Cloudflare)

| Camada | Tecnologia | Ficheiro |
|---|---|---|
| Frontend | HTML + CSS + JavaScript (inalterado) | `templates/`, `static/` |
| Backend / SSR | **Cloudflare Worker** (ES Modules) | `src/worker.js` |
| Templates (Jinja2 → JS) | Motor de templates JS byte-a-byte igual | `src/render.js` |
| Base de dados | **Cloudflare D1** (SQLite; dados migrados) | `src/db.js`, `migrations/` |
| Tempo real / WebSocket | **Durable Object** `ChatHub` (hibernation) | `src/hub.js` |
| Rate limiting / WAF | **Durable Object** `RateLimiter` | `src/limiter.js` |
| Segurança | PBKDF2, HMAC, CSRF, CSP/HSTS via Web Crypto | `src/security.js` |
| E-mail (SMTP) | Sockets TCP da Cloudflare (`cloudflare:sockets`) | `src/smtp.js` |
| Configuração | Variáveis/secrets `ARCH_*` | `src/config.js` |

```
archconstroi/
├── wrangler.jsonc              configuração Workers/D1/DO/Assets
├── package.json                scripts npm (dev, deploy, migrações)
├── src/
│   ├── worker.js               rotas, middleware de segurança, SSR
│   ├── render.js               motor de templates (subconjunto Jinja2)
│   ├── config.js               nome, contactos, SMTP, credenciais
│   ├── db.js                   D1 (leads, mensagens, alertas, auditoria)
│   ├── security.js             hash, sanitização, CSRF, cabeçalhos
│   ├── smtp.js                 envio de e-mail via sockets Cloudflare
│   ├── hub.js                  Durable Object do chat WebSocket
│   ├── limiter.js              Durable Object do rate limiting
│   └── manifest.js             lista de imagens (gerado)
├── templates/                  index, sobre, servicos, contactos, painel
├── static/                     css, js, img, docs (inalterado)
├── migrations/                 0001 esquema + 0002 dados migrados
├── data/
│   ├── archconstroi.db         base SQLite original (preservada, intocada)
│   └── seed.sql                exportação SQL dos mesmos registos
├── scripts/                    utilitários de migração/manutenção
└── tests/                      paridade de render + e2e
```

## 2. Executar localmente

```bash
npm install
npm run dev          # http://localhost:8080  ·  painel: /painel
```

O D1 local é semeado automaticamente pelas migrações (`migrations/`),
recriando **todos** os utilizadores, solicitações, mensagens, alertas e
registos de auditoria originais.

**Credenciais:** utilizador `arch` · palavra-passe `A4cc@`
(e também `belarmino.bengue1960@gmail.com` / `A4cc@`).
As palavras-passe continuam guardadas apenas como hash
PBKDF2-HMAC-SHA256 (260 000 iterações + salt) — os hashes originais foram
migrados tal e qual e continuam válidos.

Para alterar credenciais ou o segredo de sessão local, copie
`.dev.vars.example` para `.dev.vars` e edite.

## 3. Publicação na Cloudflare

```bash
# 1. autenticar
npx wrangler login

# 2. criar a base de dados D1 e colar o database_id no wrangler.jsonc
npx wrangler d1 create archconstroi-db

# 3. aplicar esquema + dados migrados na base remota
npm run db:migrate          # wrangler d1 migrations apply archconstroi-db

# 4. definir o segredo das sessões (obrigatório em produção)
npx wrangler secret put ARCH_SECRET_KEY

# 5. (opcional) credenciais/SMTP
npx wrangler secret put ARCH_ADMIN_USER
npx wrangler secret put ARCH_ADMIN_PASS
npx wrangler secret put ARCH_SMTP_PASS   # etc.

# 6. publicar
npm run deploy
```

O Worker serve o site, o painel e os WebSockets (`wss://…/ws/painel`,
`wss://…/ws/cliente/{id}`) num único deployment, sem servidor próprio nem IIS.

## 4. Segurança implementada (equivalente à versão Python)

| Ameaça | Protecção |
|---|---|
| XSS / Javascript Injection | escape HTML em toda a entrada, CSP restritiva, sem `innerHTML` de dados brutos |
| SQL Injection | consultas 100 % parametrizadas (D1/SQLite) |
| CSRF | token assinado por sessão, validado em todos os POST |
| Força bruta (login) | 5 tentativas / 5 min → bloqueio de 10 min + alerta crítico |
| Flood / DoS aplicacional | 240 pedidos/min por IP; 5 formulários/10 min |
| MITM | HSTS, cookies `HttpOnly` + `SameSite=Strict` + `Secure` |
| Clickjacking | `X-Frame-Options` e `frame-ancestors` |
| MIME sniffing | `X-Content-Type-Options: nosniff` |
| Mapeamento DNS/infra | `X-DNS-Prefetch-Control: off`, cabeçalho `Server` mascarado, docs da API desactivadas |
| Falha de autenticação | sessões assinadas (HMAC-SHA256) com expiração de 4 h |
| Fuga de erros | qualquer excepção devolve mensagem neutra + alerta no painel |

## 5. Painel administrativo

- **Visão Geral** — KPIs, gráfico de solicitações por dia, serviços mais pedidos.
- **Solicitações** — tabela filtrável e pesquisável; mudar estado (novo / em andamento / concluído / arquivado).
- **Conversas** — chat WebSocket em tempo real com o cliente. Canais: painel, e-mail (SMTP) e SMS/chamada (links `mailto:` e `tel:` gerados automaticamente).
- **Alertas & Debug** — falhas de segurança, erros de runtime e diagnóstico dos componentes Cloudflare, com indicação da acção correctiva.
- **Auditoria** — registo de logins, bloqueios WAF e alterações de estado.
- **Sistema** — modo de manutenção (mostra “Em breve estaremos disponíveis — estamos com problemas de conexão.” em todo o site). O painel e a API de administração permanecem acessíveis para o poder desactivar.

Para envio real de e-mail defina os secrets `ARCH_SMTP_HOST`, `ARCH_SMTP_USER`,
`ARCH_SMTP_PASS`, `ARCH_SMTP_FROM` (e `ARCH_SMTP_PORT` se diferente de 587).

## 6. Personalizar

| O quê | Onde |
|---|---|
| Morada, telefone, e-mail, mapa | `src/config.js` |
| Fotografias de clientes nos depoimentos | substituir `static/img/clientes/cliente1..8.svg` |
| Textos das páginas | `templates/*.html` |
| Cores | variáveis `:root` em `static/css/estilo.css` |
| Lista de imagens (galerias) | `npm run manifest` (regenera `src/manifest.js`) |

## 7. Dados migrados

Os registos originais foram exportados de `data/archconstroi.db` para
`migrations/0002_seed.sql` por `scripts/export-db.mjs` (135 registos):
admins, leads, mensagens, alertas e auditoria — incluindo os identificadores
AUTOINCREMENT, para que novas entradas continuem a numeração existente.
A base SQLite original permanece em `data/archconstroi.db` como salvaguarda.

## 8. Testes

```bash
npm run test:render   # paridade byte-a-byte do motor de templates vs Jinja2
npm run test:e2e      # 46 verificações: páginas, login, CSRF, API, WebSocket, WAF
```

## 9. Assinatura

A assinatura **Tech J Innovative Solutions** está inserida em comentário HTML
no topo de cada página — invisível no ecrã, visível apenas com `Ctrl + U`
(ver código-fonte). Aparece também no rodapé público.
