-- Arch Constroi – Esquema da base de dados (Cloudflare D1 / SQLite)
-- Desenvolvido por: Tech J Innovative Solutions
-- Migração fiel do esquema definido no antigo app/db.py (Python/SQLite),
-- mais a tabela `sistema` que persiste o modo de manutenção
-- (antes mantido apenas em memória no processo Python).

CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    empresa TEXT,
    email TEXT NOT NULL,
    telefone TEXT NOT NULL,
    servico TEXT,
    mensagem TEXT NOT NULL,
    estado TEXT NOT NULL DEFAULT 'novo',
    valor_estimado REAL DEFAULT 0,
    ip TEXT,
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS mensagens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER NOT NULL,
    autor TEXT NOT NULL,          -- 'admin' | 'cliente'
    canal TEXT NOT NULL,          -- 'painel' | 'email' | 'sms'
    corpo TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS alertas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nivel TEXT NOT NULL,          -- info | aviso | critico
    origem TEXT NOT NULL,
    titulo TEXT NOT NULL,
    detalhe TEXT NOT NULL,
    accao TEXT,
    lido INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS auditoria (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    evento TEXT NOT NULL,
    ip TEXT,
    detalhe TEXT,
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sistema (
    chave TEXT PRIMARY KEY,
    valor TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_leads_estado ON leads(estado);
CREATE INDEX IF NOT EXISTS idx_msg_lead ON mensagens(lead_id);
