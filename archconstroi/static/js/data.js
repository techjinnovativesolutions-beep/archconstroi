/* Arch Constroi – dados históricos embutidos (135 registos migrados do SQLite original).
 * Desenvolvido por: Tech J Innovative Solutions.
 * São semeados no armazenamento local do navegador no primeiro arranque e preservados a partir daí. */
window.ARCH_SEED = {
 "admins": [
  {
   "id": 1,
   "username": "arch",
   "password_hash": "pbkdf2_sha256$260000$392750bc329e64ed5b3803857e72460d$b3d5df70f6e6d4d7cd15f2fd31c4b5e7634a4fd30c55e755ff973827c51dd421",
   "created_at": "2026-08-16 09:22:57"
  },
  {
   "id": 2,
   "username": "belarmino.bengue1960@gmail.com",
   "password_hash": "pbkdf2_sha256$260000$1627687d2a0eb3fafe2fc5e478077e26$7f180df391f2ecb1c1a8dc32dd31a91772117be1b47647a5418f1336943da257",
   "created_at": "2026-09-03 15:20:19"
  }
 ],
 "leads": [
  {
   "id": 2,
   "nome": "Denario Secury",
   "empresa": "Tech J Innovative Solutions",
   "email": "denariosecury@gmail.com",
   "telefone": "+244 900 000 000",
   "servico": "Construção Civil / Empreitada",
   "mensagem": "Este apenas e um teste feito da Empresa",
   "estado": "novo",
   "valor_estimado": 0,
   "ip": "127.0.0.1",
   "created_at": "2026-08-16 13:53:52"
  },
  {
   "id": 3,
   "nome": "João Mvemba Júnior",
   "empresa": "5417366250",
   "email": "mvembajoao5@gmail.com",
   "telefone": "+351943894854",
   "servico": "Fit-out Comercial e Retalho",
   "mensagem": "cassas9mf\nofuufungure",
   "estado": "novo",
   "valor_estimado": 0,
   "ip": "192.168.18.221",
   "created_at": "2026-08-16 14:57:27"
  },
  {
   "id": 4,
   "nome": "João Silva",
   "empresa": "Tech J Innovative Solutions",
   "email": "denariosecury@gmail.com",
   "telefone": "928358703",
   "servico": "Instalações Eléctricas e Hidráulicas",
   "mensagem": "Pretende um serviço",
   "estado": "novo",
   "valor_estimado": 0,
   "ip": "192.168.18.249",
   "created_at": "2026-08-16 18:39:38"
  },
  {
   "id": 5,
   "nome": "Denário Secury",
   "empresa": "Tech J Innovative Solutions",
   "email": "denariosecury@gmail.com",
   "telefone": "928358703",
   "servico": "Instalações Eléctricas e Hidráulicas",
   "mensagem": "Pretendo um serviço",
   "estado": "em_andamento",
   "valor_estimado": 0,
   "ip": "192.168.18.249",
   "created_at": "2026-08-16 18:52:32"
  },
  {
   "id": 6,
   "nome": "Denário Secury",
   "empresa": "Wafell &amp; Services",
   "email": "denariosecury@gmail.com",
   "telefone": "928358703",
   "servico": "Remodelação e Acabamentos",
   "mensagem": "Pretendo falar com voce",
   "estado": "novo",
   "valor_estimado": 0,
   "ip": "127.0.0.1",
   "created_at": "2026-08-18 20:41:31"
  },
  {
   "id": 7,
   "nome": "João Silva",
   "empresa": "Home Live",
   "email": "home@live.com",
   "telefone": "+244 975455569",
   "servico": "Outro / Parceria",
   "mensagem": "Pretendo fazer uma parceria com a vossa instituição",
   "estado": "novo",
   "valor_estimado": 0,
   "ip": "127.0.0.1",
   "created_at": "2026-09-18 18:08:09"
  }
 ],
 "mensagens": [
  {
   "id": 3,
   "lead_id": 2,
   "autor": "cliente",
   "canal": "painel",
   "corpo": "Este apenas e um teste feito da Empresa",
   "created_at": "2026-08-16 13:53:52"
  },
  {
   "id": 4,
   "lead_id": 2,
   "autor": "cliente",
   "canal": "painel",
   "corpo": "hey",
   "created_at": "2026-08-16 13:56:29"
  },
  {
   "id": 5,
   "lead_id": 3,
   "autor": "cliente",
   "canal": "painel",
   "corpo": "cassas9mf\nofuufungure",
   "created_at": "2026-08-16 14:57:28"
  },
  {
   "id": 6,
   "lead_id": 3,
   "autor": "cliente",
   "canal": "painel",
   "corpo": "sim eu pesiso",
   "created_at": "2026-08-16 14:57:52"
  },
  {
   "id": 7,
   "lead_id": 3,
   "autor": "admin",
   "canal": "painel",
   "corpo": "O que pretendes",
   "created_at": "2026-08-16 14:58:13"
  },
  {
   "id": 8,
   "lead_id": 3,
   "autor": "cliente",
   "canal": "painel",
   "corpo": "Quero Uma casa",
   "created_at": "2026-08-16 14:58:33"
  },
  {
   "id": 9,
   "lead_id": 4,
   "autor": "cliente",
   "canal": "painel",
   "corpo": "Pretende um serviço",
   "created_at": "2026-08-16 18:39:38"
  },
  {
   "id": 10,
   "lead_id": 4,
   "autor": "admin",
   "canal": "painel",
   "corpo": "Que tipo de serviço",
   "created_at": "2026-08-16 18:40:19"
  },
  {
   "id": 11,
   "lead_id": 5,
   "autor": "cliente",
   "canal": "painel",
   "corpo": "Pretendo um serviço",
   "created_at": "2026-08-16 18:52:32"
  },
  {
   "id": 12,
   "lead_id": 5,
   "autor": "admin",
   "canal": "painel",
   "corpo": "O que pretendes",
   "created_at": "2026-08-16 18:55:11"
  },
  {
   "id": 13,
   "lead_id": 6,
   "autor": "cliente",
   "canal": "painel",
   "corpo": "Pretendo falar com voce",
   "created_at": "2026-08-18 20:41:31"
  },
  {
   "id": 14,
   "lead_id": 6,
   "autor": "cliente",
   "canal": "painel",
   "corpo": "ola",
   "created_at": "2026-08-18 20:42:30"
  },
  {
   "id": 15,
   "lead_id": 3,
   "autor": "admin",
   "canal": "painel",
   "corpo": "hello",
   "created_at": "2026-09-12 05:22:11"
  },
  {
   "id": 16,
   "lead_id": 2,
   "autor": "admin",
   "canal": "painel",
   "corpo": "esta tudo comfirmado",
   "created_at": "2026-09-12 05:22:35"
  },
  {
   "id": 17,
   "lead_id": 7,
   "autor": "cliente",
   "canal": "painel",
   "corpo": "Pretendo fazer uma parceria com a vossa instituição",
   "created_at": "2026-09-18 18:08:09"
  },
  {
   "id": 18,
   "lead_id": 7,
   "autor": "cliente",
   "canal": "painel",
   "corpo": "hey",
   "created_at": "2026-09-18 18:08:58"
  }
 ],
 "alertas": [
  {
   "id": 1,
   "nivel": "info",
   "origem": "sistema",
   "titulo": "Painel inicializado",
   "detalhe": "Base de dados criada e credenciais de administração activas.",
   "accao": "Nenhuma acção necessária.",
   "lido": 1,
   "created_at": "2026-08-16 09:22:57"
  },
  {
   "id": 2,
   "nivel": "info",
   "origem": "sistema",
   "titulo": "Servidor iniciado",
   "detalhe": "Arch Constroi – Engenharia e Construção Civil em execução.",
   "accao": "Nenhuma acção necessária.",
   "lido": 1,
   "created_at": "2026-08-16 09:22:57"
  },
  {
   "id": 3,
   "nivel": "critico",
   "origem": "runtime",
   "titulo": "Erro interno na aplicação",
   "detalhe": "TypeError: unhashable type: 'dict' em /",
   "accao": "Corrigir manualmente no código-fonte indicado pelo traceback.",
   "lido": 1,
   "created_at": "2026-08-16 09:22:58"
  },
  {
   "id": 4,
   "nivel": "critico",
   "origem": "runtime",
   "titulo": "Erro interno na aplicação",
   "detalhe": "TypeError: unhashable type: 'dict' em /",
   "accao": "Corrigir manualmente no código-fonte indicado pelo traceback.",
   "lido": 1,
   "created_at": "2026-08-16 09:23:10"
  },
  {
   "id": 5,
   "nivel": "critico",
   "origem": "runtime",
   "titulo": "Erro interno na aplicação",
   "detalhe": "TypeError: unhashable type: 'dict' em /sobre-nos",
   "accao": "Corrigir manualmente no código-fonte indicado pelo traceback.",
   "lido": 1,
   "created_at": "2026-08-16 09:23:10"
  },
  {
   "id": 6,
   "nivel": "critico",
   "origem": "runtime",
   "titulo": "Erro interno na aplicação",
   "detalhe": "TypeError: unhashable type: 'dict' em /nossos-servicos",
   "accao": "Corrigir manualmente no código-fonte indicado pelo traceback.",
   "lido": 1,
   "created_at": "2026-08-16 09:23:10"
  },
  {
   "id": 7,
   "nivel": "critico",
   "origem": "runtime",
   "titulo": "Erro interno na aplicação",
   "detalhe": "TypeError: unhashable type: 'dict' em /contactos",
   "accao": "Corrigir manualmente no código-fonte indicado pelo traceback.",
   "lido": 1,
   "created_at": "2026-08-16 09:23:10"
  },
  {
   "id": 8,
   "nivel": "critico",
   "origem": "runtime",
   "titulo": "Erro interno na aplicação",
   "detalhe": "TypeError: unhashable type: 'dict' em /painel/login",
   "accao": "Corrigir manualmente no código-fonte indicado pelo traceback.",
   "lido": 1,
   "created_at": "2026-08-16 09:23:10"
  },
  {
   "id": 9,
   "nivel": "critico",
   "origem": "runtime",
   "titulo": "Erro interno na aplicação",
   "detalhe": "TypeError: unhashable type: 'dict' em /contactos",
   "accao": "Corrigir manualmente no código-fonte indicado pelo traceback.",
   "lido": 1,
   "created_at": "2026-08-16 09:23:10"
  },
  {
   "id": 10,
   "nivel": "critico",
   "origem": "waf",
   "titulo": "Tentativa de injecção bloqueada",
   "detalhe": "IP 127.0.0.1 enviou payload suspeito em /?q=<script>alert(1)</script>",
   "accao": "Payload rejeitado automaticamente. Reveja regras de WAF se for recorrente.",
   "lido": 1,
   "created_at": "2026-08-16 09:23:10"
  },
  {
   "id": 11,
   "nivel": "critico",
   "origem": "runtime",
   "titulo": "Erro interno na aplicação",
   "detalhe": "TypeError: unhashable type: 'dict' em /painel/login",
   "accao": "Corrigir manualmente no código-fonte indicado pelo traceback.",
   "lido": 1,
   "created_at": "2026-08-16 09:23:10"
  },
  {
   "id": 12,
   "nivel": "critico",
   "origem": "runtime",
   "titulo": "Erro interno na aplicação",
   "detalhe": "TypeError: unhashable type: 'dict' em /",
   "accao": "Corrigir manualmente no código-fonte indicado pelo traceback.",
   "lido": 1,
   "created_at": "2026-08-16 09:23:34"
  },
  {
   "id": 13,
   "nivel": "info",
   "origem": "sistema",
   "titulo": "Servidor iniciado",
   "detalhe": "Arch Constroi – Engenharia e Construção Civil em execução.",
   "accao": "Nenhuma acção necessária.",
   "lido": 1,
   "created_at": "2026-08-16 09:24:47"
  },
  {
   "id": 14,
   "nivel": "info",
   "origem": "sistema",
   "titulo": "Servidor iniciado",
   "detalhe": "Arch Constroi – Engenharia e Construção Civil em execução.",
   "accao": "Nenhuma acção necessária.",
   "lido": 1,
   "created_at": "2026-08-16 11:40:13"
  },
  {
   "id": 15,
   "nivel": "info",
   "origem": "sistema",
   "titulo": "Servidor iniciado",
   "detalhe": "Arch Constroi – Engenharia e Construção Civil em execução.",
   "accao": "Nenhuma acção necessária.",
   "lido": 1,
   "created_at": "2026-08-16 11:43:00"
  },
  {
   "id": 16,
   "nivel": "info",
   "origem": "sistema",
   "titulo": "Servidor iniciado",
   "detalhe": "Arch Constroi – Engenharia e Construção Civil em execução.",
   "accao": "Nenhuma acção necessária.",
   "lido": 1,
   "created_at": "2026-08-16 12:08:51"
  },
  {
   "id": 17,
   "nivel": "info",
   "origem": "sistema",
   "titulo": "Servidor iniciado",
   "detalhe": "Arch Constroi – Engenharia e Construção Civil em execução.",
   "accao": "Nenhuma acção necessária.",
   "lido": 1,
   "created_at": "2026-08-16 12:49:14"
  },
  {
   "id": 18,
   "nivel": "info",
   "origem": "sistema",
   "titulo": "Servidor iniciado",
   "detalhe": "Arch Constroi – Engenharia e Construção Civil em execução.",
   "accao": "Nenhuma acção necessária.",
   "lido": 1,
   "created_at": "2026-08-16 13:33:50"
  },
  {
   "id": 19,
   "nivel": "info",
   "origem": "sistema",
   "titulo": "Servidor iniciado",
   "detalhe": "Arch Constroi – Engenharia e Construção Civil em execução.",
   "accao": "Nenhuma acção necessária.",
   "lido": 1,
   "created_at": "2026-08-16 13:43:41"
  },
  {
   "id": 20,
   "nivel": "info",
   "origem": "sistema",
   "titulo": "Servidor iniciado",
   "detalhe": "Arch Constroi – Engenharia e Construção Civil em execução.",
   "accao": "Nenhuma acção necessária.",
   "lido": 1,
   "created_at": "2026-08-16 18:41:28"
  },
  {
   "id": 21,
   "nivel": "info",
   "origem": "sistema",
   "titulo": "Servidor iniciado",
   "detalhe": "Arch Constroi – Engenharia e Construção Civil em execução.",
   "accao": "Nenhuma acção necessária.",
   "lido": 1,
   "created_at": "2026-08-16 21:28:07"
  },
  {
   "id": 22,
   "nivel": "info",
   "origem": "sistema",
   "titulo": "Servidor iniciado",
   "detalhe": "Arch Constroi – Engenharia e Construção Civil em execução.",
   "accao": "Nenhuma acção necessária.",
   "lido": 1,
   "created_at": "2026-08-17 13:33:22"
  },
  {
   "id": 23,
   "nivel": "info",
   "origem": "sistema",
   "titulo": "Servidor iniciado",
   "detalhe": "Arch Constroi – Engenharia e Construção Civil em execução.",
   "accao": "Nenhuma acção necessária.",
   "lido": 1,
   "created_at": "2026-08-17 17:46:37"
  },
  {
   "id": 24,
   "nivel": "info",
   "origem": "sistema",
   "titulo": "Servidor iniciado",
   "detalhe": "Arch Constroi – Engenharia e Construção Civil em execução.",
   "accao": "Nenhuma acção necessária.",
   "lido": 1,
   "created_at": "2026-08-17 18:25:07"
  },
  {
   "id": 25,
   "nivel": "info",
   "origem": "sistema",
   "titulo": "Servidor iniciado",
   "detalhe": "Arch Constroi – Engenharia e Construção Civil em execução.",
   "accao": "Nenhuma acção necessária.",
   "lido": 1,
   "created_at": "2026-08-18 11:00:13"
  },
  {
   "id": 26,
   "nivel": "info",
   "origem": "sistema",
   "titulo": "Servidor iniciado",
   "detalhe": "Arch Constroi – Engenharia e Construção Civil em execução.",
   "accao": "Nenhuma acção necessária.",
   "lido": 1,
   "created_at": "2026-08-18 15:12:53"
  },
  {
   "id": 27,
   "nivel": "info",
   "origem": "sistema",
   "titulo": "Servidor iniciado",
   "detalhe": "Arch Constroi – Engenharia e Construção Civil em execução.",
   "accao": "Nenhuma acção necessária.",
   "lido": 1,
   "created_at": "2026-08-18 20:35:24"
  },
  {
   "id": 28,
   "nivel": "info",
   "origem": "sistema",
   "titulo": "Servidor iniciado",
   "detalhe": "Arch Constroi – Engenharia e Construção Civil em execução.",
   "accao": "Nenhuma acção necessária.",
   "lido": 1,
   "created_at": "2026-08-19 09:24:22"
  },
  {
   "id": 29,
   "nivel": "info",
   "origem": "sistema",
   "titulo": "Servidor iniciado",
   "detalhe": "Arch Constroi – Engenharia e Construção Civil em execução.",
   "accao": "Nenhuma acção necessária.",
   "lido": 1,
   "created_at": "2026-08-21 11:37:02"
  },
  {
   "id": 30,
   "nivel": "info",
   "origem": "sistema",
   "titulo": "Servidor iniciado",
   "detalhe": "Arch Constroi – Engenharia e Construção Civil em execução.",
   "accao": "Nenhuma acção necessária.",
   "lido": 1,
   "created_at": "2026-08-21 12:35:20"
  },
  {
   "id": 31,
   "nivel": "info",
   "origem": "sistema",
   "titulo": "Servidor iniciado",
   "detalhe": "Arch Constroi – Engenharia e Construção Civil em execução.",
   "accao": "Nenhuma acção necessária.",
   "lido": 1,
   "created_at": "2026-08-23 16:37:41"
  },
  {
   "id": 32,
   "nivel": "info",
   "origem": "sistema",
   "titulo": "Servidor iniciado",
   "detalhe": "Arch Constroi – Engenharia e Construção Civil em execução.",
   "accao": "Nenhuma acção necessária.",
   "lido": 1,
   "created_at": "2026-08-25 10:39:59"
  },
  {
   "id": 33,
   "nivel": "info",
   "origem": "sistema",
   "titulo": "Servidor iniciado",
   "detalhe": "Arch Constroi – Engenharia e Construção Civil em execução.",
   "accao": "Nenhuma acção necessária.",
   "lido": 1,
   "created_at": "2026-08-26 11:38:50"
  },
  {
   "id": 34,
   "nivel": "info",
   "origem": "sistema",
   "titulo": "Servidor iniciado",
   "detalhe": "Arch Constroi – Engenharia e Construção Civil em execução.",
   "accao": "Nenhuma acção necessária.",
   "lido": 1,
   "created_at": "2026-09-03 14:59:47"
  },
  {
   "id": 35,
   "nivel": "info",
   "origem": "sistema",
   "titulo": "Servidor iniciado",
   "detalhe": "Arch Constroi – Engenharia e Construção Civil em execução.",
   "accao": "Nenhuma acção necessária.",
   "lido": 1,
   "created_at": "2026-09-03 15:20:19"
  },
  {
   "id": 36,
   "nivel": "info",
   "origem": "sistema",
   "titulo": "Servidor iniciado",
   "detalhe": "Arch Constroi – Engenharia e Construção Civil em execução.",
   "accao": "Nenhuma acção necessária.",
   "lido": 1,
   "created_at": "2026-09-03 17:33:15"
  },
  {
   "id": 37,
   "nivel": "info",
   "origem": "sistema",
   "titulo": "Servidor iniciado",
   "detalhe": "Arch Constroi – Engenharia e Construção Civil em execução.",
   "accao": "Nenhuma acção necessária.",
   "lido": 1,
   "created_at": "2026-09-03 17:33:31"
  },
  {
   "id": 38,
   "nivel": "info",
   "origem": "sistema",
   "titulo": "Servidor iniciado",
   "detalhe": "Arch Constroi – Engenharia e Construção Civil em execução.",
   "accao": "Nenhuma acção necessária.",
   "lido": 1,
   "created_at": "2026-09-09 05:57:04"
  },
  {
   "id": 39,
   "nivel": "info",
   "origem": "sistema",
   "titulo": "Servidor iniciado",
   "detalhe": "Arch Constroi – Engenharia e Construção Civil em execução.",
   "accao": "Nenhuma acção necessária.",
   "lido": 1,
   "created_at": "2026-09-09 06:27:29"
  },
  {
   "id": 40,
   "nivel": "info",
   "origem": "sistema",
   "titulo": "Servidor iniciado",
   "detalhe": "Arch Constroi – Engenharia e Construção Civil em execução.",
   "accao": "Nenhuma acção necessária.",
   "lido": 1,
   "created_at": "2026-09-09 13:19:08"
  },
  {
   "id": 41,
   "nivel": "info",
   "origem": "sistema",
   "titulo": "Servidor iniciado",
   "detalhe": "Arch Constroi – Engenharia e Construção Civil em execução.",
   "accao": "Nenhuma acção necessária.",
   "lido": 1,
   "created_at": "2026-09-09 20:04:16"
  },
  {
   "id": 42,
   "nivel": "info",
   "origem": "sistema",
   "titulo": "Servidor iniciado",
   "detalhe": "Arch Constroi – Engenharia e Construção Civil em execução.",
   "accao": "Nenhuma acção necessária.",
   "lido": 1,
   "created_at": "2026-09-11 05:57:27"
  },
  {
   "id": 43,
   "nivel": "info",
   "origem": "sistema",
   "titulo": "Servidor iniciado",
   "detalhe": "Arch Constroi – Engenharia e Construção Civil em execução.",
   "accao": "Nenhuma acção necessária.",
   "lido": 1,
   "created_at": "2026-09-12 02:42:43"
  },
  {
   "id": 44,
   "nivel": "info",
   "origem": "sistema",
   "titulo": "Servidor iniciado",
   "detalhe": "Arch Constroi – Engenharia e Construção Civil em execução.",
   "accao": "Nenhuma acção necessária.",
   "lido": 1,
   "created_at": "2026-09-12 02:51:11"
  },
  {
   "id": 45,
   "nivel": "info",
   "origem": "sistema",
   "titulo": "Servidor iniciado",
   "detalhe": "Arch Constroi – Engenharia e Construção Civil em execução.",
   "accao": "Nenhuma acção necessária.",
   "lido": 1,
   "created_at": "2026-09-12 03:13:21"
  },
  {
   "id": 46,
   "nivel": "info",
   "origem": "sistema",
   "titulo": "Servidor iniciado",
   "detalhe": "Arch Constroi – Engenharia e Construção Civil em execução.",
   "accao": "Nenhuma acção necessária.",
   "lido": 1,
   "created_at": "2026-09-12 04:18:08"
  },
  {
   "id": 47,
   "nivel": "info",
   "origem": "sistema",
   "titulo": "Servidor iniciado",
   "detalhe": "Arch Constroi – Engenharia e Construção Civil em execução.",
   "accao": "Nenhuma acção necessária.",
   "lido": 1,
   "created_at": "2026-09-12 05:04:15"
  },
  {
   "id": 48,
   "nivel": "info",
   "origem": "sistema",
   "titulo": "Servidor iniciado",
   "detalhe": "Arch Constroi – Engenharia e Construção Civil em execução.",
   "accao": "Nenhuma acção necessária.",
   "lido": 1,
   "created_at": "2026-09-12 05:12:30"
  },
  {
   "id": 49,
   "nivel": "info",
   "origem": "sistema",
   "titulo": "Servidor iniciado",
   "detalhe": "Arch Constroi – Engenharia e Construção Civil em execução.",
   "accao": "Nenhuma acção necessária.",
   "lido": 0,
   "created_at": "2026-09-12 05:20:46"
  },
  {
   "id": 50,
   "nivel": "info",
   "origem": "sistema",
   "titulo": "Servidor iniciado",
   "detalhe": "Arch Constroi – Engenharia e Construção Civil em execução.",
   "accao": "Nenhuma acção necessária.",
   "lido": 0,
   "created_at": "2026-09-16 01:46:53"
  },
  {
   "id": 51,
   "nivel": "info",
   "origem": "sistema",
   "titulo": "Servidor iniciado",
   "detalhe": "Arch Constroi – Engenharia e Construção Civil em execução.",
   "accao": "Nenhuma acção necessária.",
   "lido": 0,
   "created_at": "2026-09-16 01:55:34"
  },
  {
   "id": 52,
   "nivel": "info",
   "origem": "sistema",
   "titulo": "Servidor iniciado",
   "detalhe": "Arch Constroi – Engenharia e Construção Civil em execução.",
   "accao": "Nenhuma acção necessária.",
   "lido": 0,
   "created_at": "2026-09-16 02:36:53"
  },
  {
   "id": 53,
   "nivel": "info",
   "origem": "sistema",
   "titulo": "Servidor iniciado",
   "detalhe": "Arch Constroi – Engenharia e Construção Civil em execução.",
   "accao": "Nenhuma acção necessária.",
   "lido": 0,
   "created_at": "2026-09-16 02:39:31"
  },
  {
   "id": 54,
   "nivel": "info",
   "origem": "sistema",
   "titulo": "Servidor iniciado",
   "detalhe": "Arch Constroi – Engenharia e Construção Civil em execução.",
   "accao": "Nenhuma acção necessária.",
   "lido": 0,
   "created_at": "2026-09-16 04:30:58"
  },
  {
   "id": 55,
   "nivel": "info",
   "origem": "sistema",
   "titulo": "Servidor iniciado",
   "detalhe": "Arch Constroi – Engenharia e Construção Civil em execução.",
   "accao": "Nenhuma acção necessária.",
   "lido": 0,
   "created_at": "2026-09-16 04:31:24"
  },
  {
   "id": 56,
   "nivel": "info",
   "origem": "sistema",
   "titulo": "Servidor iniciado",
   "detalhe": "Arch Constroi – Engenharia e Construção Civil em execução.",
   "accao": "Nenhuma acção necessária.",
   "lido": 0,
   "created_at": "2026-09-16 07:55:04"
  },
  {
   "id": 57,
   "nivel": "info",
   "origem": "sistema",
   "titulo": "Servidor iniciado",
   "detalhe": "Arch Constroi – Engenharia e Construção Civil em execução.",
   "accao": "Nenhuma acção necessária.",
   "lido": 0,
   "created_at": "2026-09-16 07:55:33"
  },
  {
   "id": 58,
   "nivel": "info",
   "origem": "sistema",
   "titulo": "Servidor iniciado",
   "detalhe": "Arch Constroi – Engenharia e Construção Civil em execução.",
   "accao": "Nenhuma acção necessária.",
   "lido": 0,
   "created_at": "2026-09-16 07:57:49"
  },
  {
   "id": 59,
   "nivel": "info",
   "origem": "sistema",
   "titulo": "Servidor iniciado",
   "detalhe": "Arch Constroi – Engenharia e Construção Civil em execução.",
   "accao": "Nenhuma acção necessária.",
   "lido": 0,
   "created_at": "2026-09-16 09:03:53"
  },
  {
   "id": 60,
   "nivel": "info",
   "origem": "sistema",
   "titulo": "Servidor iniciado",
   "detalhe": "Arch Constroi – Engenharia e Construção Civil em execução.",
   "accao": "Nenhuma acção necessária.",
   "lido": 0,
   "created_at": "2026-09-17 02:01:15"
  },
  {
   "id": 61,
   "nivel": "info",
   "origem": "sistema",
   "titulo": "Servidor iniciado",
   "detalhe": "Arch Constroi – Engenharia e Construção Civil em execução.",
   "accao": "Nenhuma acção necessária.",
   "lido": 0,
   "created_at": "2026-09-17 02:02:22"
  },
  {
   "id": 62,
   "nivel": "info",
   "origem": "sistema",
   "titulo": "Servidor iniciado",
   "detalhe": "Arch Constroi – Engenharia e Construção Civil em execução.",
   "accao": "Nenhuma acção necessária.",
   "lido": 0,
   "created_at": "2026-09-18 13:57:45"
  },
  {
   "id": 63,
   "nivel": "info",
   "origem": "sistema",
   "titulo": "Servidor iniciado",
   "detalhe": "Arch Constroi – Engenharia e Construção Civil em execução.",
   "accao": "Nenhuma acção necessária.",
   "lido": 0,
   "created_at": "2026-09-18 17:56:18"
  },
  {
   "id": 64,
   "nivel": "info",
   "origem": "sistema",
   "titulo": "Servidor iniciado",
   "detalhe": "Arch Constroi – Engenharia e Construção Civil em execução.",
   "accao": "Nenhuma acção necessária.",
   "lido": 0,
   "created_at": "2026-09-18 18:03:59"
  },
  {
   "id": 65,
   "nivel": "info",
   "origem": "sistema",
   "titulo": "Servidor iniciado",
   "detalhe": "Arch Constroi – Engenharia e Construção Civil em execução.",
   "accao": "Nenhuma acção necessária.",
   "lido": 0,
   "created_at": "2026-09-19 15:15:38"
  }
 ],
 "auditoria": [
  {
   "id": 5,
   "evento": "login_falhado",
   "ip": "127.0.0.1",
   "detalhe": "user=arch",
   "created_at": "2026-08-16 13:39:34"
  },
  {
   "id": 6,
   "evento": "login_ok",
   "ip": "127.0.0.1",
   "detalhe": "user=arch",
   "created_at": "2026-08-16 13:39:52"
  },
  {
   "id": 7,
   "evento": "manutencao",
   "ip": "127.0.0.1",
   "detalhe": "on=True",
   "created_at": "2026-08-16 13:40:51"
  },
  {
   "id": 8,
   "evento": "login_ok",
   "ip": "127.0.0.1",
   "detalhe": "user=arch",
   "created_at": "2026-08-16 13:44:12"
  },
  {
   "id": 9,
   "evento": "logout",
   "ip": "127.0.0.1",
   "detalhe": "",
   "created_at": "2026-08-16 13:45:13"
  },
  {
   "id": 10,
   "evento": "login_falhado",
   "ip": "127.0.0.1",
   "detalhe": "user=arch",
   "created_at": "2026-08-16 13:49:32"
  },
  {
   "id": 11,
   "evento": "login_ok",
   "ip": "127.0.0.1",
   "detalhe": "user=arch",
   "created_at": "2026-08-16 13:49:52"
  },
  {
   "id": 12,
   "evento": "nova_solicitacao",
   "ip": "127.0.0.1",
   "detalhe": "lead #2 – denariosecury@gmail.com",
   "created_at": "2026-08-16 13:53:52"
  },
  {
   "id": 13,
   "evento": "logout",
   "ip": "127.0.0.1",
   "detalhe": "",
   "created_at": "2026-08-16 13:58:26"
  },
  {
   "id": 14,
   "evento": "nova_solicitacao",
   "ip": "192.168.18.221",
   "detalhe": "lead #3 – mvembajoao5@gmail.com",
   "created_at": "2026-08-16 14:57:28"
  },
  {
   "id": 15,
   "evento": "login_ok",
   "ip": "127.0.0.1",
   "detalhe": "user=arch",
   "created_at": "2026-08-16 14:57:41"
  },
  {
   "id": 16,
   "evento": "logout",
   "ip": "127.0.0.1",
   "detalhe": "",
   "created_at": "2026-08-16 15:44:17"
  },
  {
   "id": 17,
   "evento": "login_ok",
   "ip": "127.0.0.1",
   "detalhe": "user=arch",
   "created_at": "2026-08-16 18:38:37"
  },
  {
   "id": 18,
   "evento": "nova_solicitacao",
   "ip": "192.168.18.249",
   "detalhe": "lead #4 – denariosecury@gmail.com",
   "created_at": "2026-08-16 18:39:38"
  },
  {
   "id": 19,
   "evento": "manutencao",
   "ip": "127.0.0.1",
   "detalhe": "on=True",
   "created_at": "2026-08-16 18:41:03"
  },
  {
   "id": 20,
   "evento": "nova_solicitacao",
   "ip": "192.168.18.249",
   "detalhe": "lead #5 – denariosecury@gmail.com",
   "created_at": "2026-08-16 18:52:32"
  },
  {
   "id": 21,
   "evento": "login_ok",
   "ip": "192.168.18.249",
   "detalhe": "user=arch",
   "created_at": "2026-08-16 18:54:32"
  },
  {
   "id": 22,
   "evento": "logout",
   "ip": "192.168.18.249",
   "detalhe": "",
   "created_at": "2026-08-16 18:55:56"
  },
  {
   "id": 23,
   "evento": "login_ok",
   "ip": "127.0.0.1",
   "detalhe": "user=arch",
   "created_at": "2026-08-16 21:34:29"
  },
  {
   "id": 24,
   "evento": "estado_alterado",
   "ip": "127.0.0.1",
   "detalhe": "lead #5 -> arquivado",
   "created_at": "2026-08-16 21:34:58"
  },
  {
   "id": 25,
   "evento": "estado_alterado",
   "ip": "127.0.0.1",
   "detalhe": "lead #5 -> em_andamento",
   "created_at": "2026-08-16 21:35:02"
  },
  {
   "id": 26,
   "evento": "login_ok",
   "ip": "127.0.0.1",
   "detalhe": "user=arch",
   "created_at": "2026-08-18 20:38:41"
  },
  {
   "id": 27,
   "evento": "csrf_fail",
   "ip": "127.0.0.1",
   "detalhe": "/api/solicitacao",
   "created_at": "2026-08-18 20:40:44"
  },
  {
   "id": 28,
   "evento": "nova_solicitacao",
   "ip": "127.0.0.1",
   "detalhe": "lead #6 – denariosecury@gmail.com",
   "created_at": "2026-08-18 20:41:31"
  },
  {
   "id": 29,
   "evento": "manutencao",
   "ip": "127.0.0.1",
   "detalhe": "on=True",
   "created_at": "2026-08-18 20:44:11"
  },
  {
   "id": 30,
   "evento": "login_ok",
   "ip": "127.0.0.1",
   "detalhe": "user=arch",
   "created_at": "2026-08-21 12:41:25"
  },
  {
   "id": 31,
   "evento": "manutencao",
   "ip": "127.0.0.1",
   "detalhe": "on=True",
   "created_at": "2026-08-21 12:45:01"
  },
  {
   "id": 32,
   "evento": "login_ok",
   "ip": "127.0.0.1",
   "detalhe": "user=arch",
   "created_at": "2026-08-23 16:42:00"
  },
  {
   "id": 33,
   "evento": "logout",
   "ip": "127.0.0.1",
   "detalhe": "",
   "created_at": "2026-08-23 16:42:20"
  },
  {
   "id": 34,
   "evento": "login_ok",
   "ip": "127.0.0.1",
   "detalhe": "user=arch",
   "created_at": "2026-08-23 16:42:32"
  },
  {
   "id": 35,
   "evento": "logout",
   "ip": "127.0.0.1",
   "detalhe": "",
   "created_at": "2026-08-23 16:42:38"
  },
  {
   "id": 36,
   "evento": "login_falhado",
   "ip": "127.0.0.1",
   "detalhe": "user=arch",
   "created_at": "2026-08-25 11:01:58"
  },
  {
   "id": 37,
   "evento": "login_falhado",
   "ip": "127.0.0.1",
   "detalhe": "user=belarmino.bengue1960@gmail.com",
   "created_at": "2026-09-12 02:53:13"
  },
  {
   "id": 38,
   "evento": "login_falhado",
   "ip": "127.0.0.1",
   "detalhe": "user=belarmino.bengue1960@gmail.com",
   "created_at": "2026-09-12 02:53:36"
  },
  {
   "id": 39,
   "evento": "login_ok",
   "ip": "127.0.0.1",
   "detalhe": "user=belarmino.bengue1960@gmail.com",
   "created_at": "2026-09-12 02:54:01"
  },
  {
   "id": 40,
   "evento": "login_ok",
   "ip": "127.0.0.1",
   "detalhe": "user=belarmino.bengue1960@gmail.com",
   "created_at": "2026-09-12 05:16:16"
  },
  {
   "id": 41,
   "evento": "login_ok",
   "ip": "127.0.0.1",
   "detalhe": "user=belarmino.bengue1960@gmail.com",
   "created_at": "2026-09-12 05:21:25"
  },
  {
   "id": 42,
   "evento": "login_ok",
   "ip": "127.0.0.1",
   "detalhe": "user=belarmino.bengue1960@gmail.com",
   "created_at": "2026-09-18 13:59:36"
  },
  {
   "id": 43,
   "evento": "login_ok",
   "ip": "127.0.0.1",
   "detalhe": "user=belarmino.bengue1960@gmail.com",
   "created_at": "2026-09-18 18:01:33"
  },
  {
   "id": 44,
   "evento": "login_ok",
   "ip": "127.0.0.1",
   "detalhe": "user=belarmino.bengue1960@gmail.com",
   "created_at": "2026-09-18 18:01:34"
  },
  {
   "id": 45,
   "evento": "login_ok",
   "ip": "127.0.0.1",
   "detalhe": "user=belarmino.bengue1960@gmail.com",
   "created_at": "2026-09-18 18:06:46"
  },
  {
   "id": 46,
   "evento": "nova_solicitacao",
   "ip": "127.0.0.1",
   "detalhe": "lead #7 – home@live.com",
   "created_at": "2026-09-18 18:08:09"
  },
  {
   "id": 47,
   "evento": "csrf_fail",
   "ip": "192.168.43.1",
   "detalhe": "/api/solicitacao",
   "created_at": "2026-09-18 18:11:53"
  },
  {
   "id": 48,
   "evento": "csrf_fail",
   "ip": "192.168.43.1",
   "detalhe": "/api/solicitacao",
   "created_at": "2026-09-18 18:11:59"
  },
  {
   "id": 49,
   "evento": "csrf_fail",
   "ip": "192.168.43.1",
   "detalhe": "/api/solicitacao",
   "created_at": "2026-09-18 18:13:10"
  },
  {
   "id": 50,
   "evento": "csrf_fail",
   "ip": "192.168.43.1",
   "detalhe": "/api/solicitacao",
   "created_at": "2026-09-18 18:13:34"
  }
 ]
};
