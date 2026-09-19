/**
 * Arch Constroi – Configuração central
 * Desenvolvido por: Tech J Innovative Solutions
 *
 * Migração fiel de app/config.py (Python). Os valores que o backend Python lia
 * de variáveis de ambiente passam a vir das variáveis/secrets do Worker
 * (env.ARCH_*), mantendo exactamente os mesmos nomes e pré-definições.
 */

export const SITE_NAME = "Arch Constroi";
export const SITE_FULL_NAME = "Arch Constroi – Engenharia e Construção Civil";
export const SIGNATURE = "Tech J Innovative Solutions";
export const COUNTRY = "Angola";
export const PHONE = "+244 924 729 664 | +244 926 199 535";
export const EMAIL = "conctatos@archconstroi.com";
export const ADDRESS = "Camama, Município do Talatona, Luanda, Angola";
export const MAPS_QUERY = "-8.937537,13.263174";

export const SESSION_COOKIE = "arch_sid";
export const SESSION_MAX_AGE = 60 * 60 * 4; // 4 horas

export const SERVICES = [
  ["projeto-arquitetura", "Projecto de Arquitectura"],
  ["construcao-civil", "Construção Civil / Empreitada"],
  ["remodelacao", "Remodelação e Acabamentos"],
  ["fit-out-comercial", "Fit-out Comercial e Retalho"],
  ["fiscalizacao", "Fiscalização e Gestão de Obra"],
  ["instalacoes", "Instalações Eléctricas e Hidráulicas"],
  ["licenciamento", "Licenciamento e Consultoria Técnica"],
  ["outro", "Outro / Parceria"],
];

/**
 * Chave secreta para assinar sessões/cookies (equivale a ARCH_SECRET_KEY).
 * Em produção definir via `wrangler secret put ARCH_SECRET_KEY`.
 * A última reserva é apenas para desenvolvimento local — nunca para produção.
 */
export function getSecret(env) {
  return (
    env.ARCH_SECRET_KEY ||
    "dev-inseguro-archconstroi-chave-local-0123456789abcdef"
  );
}

/** Credenciais de administração pré-definidas (equivale a ARCH_ADMIN_USER/PASS). */
export function getAdminCreds(env) {
  return {
    user: env.ARCH_ADMIN_USER || "belarmino.bengue1960@gmail.com",
    pass: env.ARCH_ADMIN_PASS || "A4cc@",
  };
}

/** Configuração SMTP opcional para envio de e-mail a partir do painel.
 *  Semântica idêntica ao os.getenv do Python: variável definida mas vazia
 *  mantém-se vazia (só o valor ausente usa a pré-definição). */
export function getSmtp(env) {
  return {
    host: env.ARCH_SMTP_HOST ?? "smtp.gmail.com",
    port: parseInt(env.ARCH_SMTP_PORT || "587", 10),
    user: env.ARCH_SMTP_USER ?? "conctatos@archconstroi.com",
    pass: env.ARCH_SMTP_PASS ?? "ArchConstroi@2026",
    from: env.ARCH_SMTP_FROM ?? "conctatos@archconstroi.com",
  };
}

/** Objecto `cfg` passado aos templates — mesma forma do contexto Python. */
export const cfg = {
  SITE_NAME,
  SITE_FULL_NAME,
  SIGNATURE,
  COUNTRY,
  PHONE,
  EMAIL,
  ADDRESS,
  MAPS_QUERY,
};
