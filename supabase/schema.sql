-- =========================================================
-- CONTROLE DE PRODUÇÃO (PRÉ-MOLDADOS & MARCENARIA)
-- Script SQL para executar no SQL Editor do Supabase
-- =========================================================

-- Tabela principal de estado sincronizado (com controle otimista de versão)
CREATE TABLE IF NOT EXISTS public.cp_state (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  version BIGINT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Segurança: ativa RLS (as Serverless Functions da Vercel usam SUPABASE_SERVICE_ROLE_KEY)
ALTER TABLE public.cp_state ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- Views de consulta direta no painel do Supabase (somente leitura)
-- =========================================================

CREATE OR REPLACE VIEW public.vw_produtos AS
SELECT
  p->>'id' AS id,
  p->>'codigo' AS codigo,
  p->>'nome' AS nome,
  p->>'setor' AS setor,
  p->>'unidade' AS unidade,
  COALESCE((p->>'ativo')::boolean, true) AS ativo,
  p->>'descricao' AS descricao
FROM public.cp_state s,
     jsonb_array_elements(COALESCE(s.data->'produtos', '[]'::jsonb)) AS p
WHERE s.id = 'main';

CREATE OR REPLACE VIEW public.vw_producoes AS
SELECT
  r->>'id' AS id,
  r->>'produtoId' AS produto_id,
  COALESCE(r->'produtoTemp'->>'nome', '') AS produto_nao_cadastrado_nome,
  COALESCE((r->>'produtoNaoCadastrado')::boolean, false) AS produto_nao_cadastrado,
  r->>'setor' AS setor,
  (r->>'quantidade')::numeric AS quantidade,
  COALESCE((r->>'quantidadeQuebrada')::numeric, 0) AS quantidade_quebrada,
  COALESCE((r->>'quantidadeAproveitavel')::numeric, (r->>'quantidade')::numeric) AS quantidade_aproveitavel,
  (r->>'quantidadeConferida')::numeric AS quantidade_conferida,
  r->>'data' AS data,
  r->>'hora' AS hora,
  COALESCE(r->>'tipoDestino', 'ESTOQUE') AS tipo_destino,
  r->>'numeroPedido' AS numero_pedido,
  r->>'status' AS status,
  r->>'usuarioId' AS usuario_id,
  r->>'origem' AS origem
FROM public.cp_state s,
     jsonb_array_elements(COALESCE(s.data->'producoes', '[]'::jsonb)) AS r
WHERE s.id = 'main';

CREATE OR REPLACE VIEW public.vw_quebras AS
SELECT
  q->>'id' AS id,
  q->>'producaoId' AS producao_id,
  q->>'produtoId' AS produto_id,
  (q->>'quantidade')::numeric AS quantidade,
  q->>'motivo' AS motivo,
  q->>'data' AS data,
  q->>'hora' AS hora,
  q->>'usuarioId' AS usuario_id
FROM public.cp_state s,
     jsonb_array_elements(COALESCE(s.data->'quebras', '[]'::jsonb)) AS q
WHERE s.id = 'main';

CREATE OR REPLACE VIEW public.vw_entradas AS
SELECT
  e->>'id' AS id,
  e->>'producaoId' AS producao_id,
  e->>'produtoId' AS produto_id,
  (e->>'quantidade')::numeric AS quantidade,
  e->>'data' AS data,
  e->>'hora' AS hora,
  e->>'usuarioId' AS usuario_id
FROM public.cp_state s,
     jsonb_array_elements(COALESCE(s.data->'entradas', '[]'::jsonb)) AS e
WHERE s.id = 'main';
