# CONTROLE DE PRODUÇÃO — Pré-Moldados & Marcenaria (PWA)

Aplicativo PWA **mobile-first** e **offline-first** para controle do fluxo:
**FABRICAÇÃO → CONFERÊNCIA → QUEBRAS/DIVERGÊNCIAS → ENTRADA NO ESTOQUE → PAINEL DO PATRÃO**.

---

## 1. Deploy em Produção (Supabase + GitHub + Vercel)

### Passo 1 — Configurar o Supabase
1. Crie um projeto gratuito em [supabase.com](https://supabase.com).
2. No menu lateral, abra **SQL Editor** → **New query**.
3. Copie e execute todo o conteúdo do arquivo [`supabase/schema.sql`](supabase/schema.sql).
   - Isso cria a tabela `public.cp_state` (com RLS ativado) e as views de consulta (`vw_produtos`, `vw_producoes`, `vw_quebras`, `vw_entradas`).
4. Vá em **Project Settings → API** e copie:
   - **Project URL** (`SUPABASE_URL`)
   - **service_role secret** (`SUPABASE_SERVICE_ROLE_KEY`) — *nunca exponha essa chave no frontend; ela é usada apenas nas Serverless Functions da Vercel.*

### Passo 2 — Enviar para o GitHub
Na pasta do projeto, execute:

```bash
git init
git add .
git commit -m "Versao inicial Controle de Producao PWA"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
git push -u origin main
```

### Passo 3 — Deploy na Vercel
1. Acesse [vercel.com](https://vercel.com) e clique em **Add New → Project**.
2. Importe o repositório do GitHub.
3. Em **Build and Output Settings**, mantenha tudo padrão (não há etapa de build; a pasta `public/` e as funções em `api/` são detectadas automaticamente).
4. Em **Environment Variables**, adicione:
   - `SUPABASE_URL` = URL do seu projeto Supabase
   - `SUPABASE_SERVICE_ROLE_KEY` = chave `service_role` do Supabase
5. Clique em **Deploy**.

Ao abrir a URL da Vercel pela primeira vez, `/api/state` inicializa automaticamente os dados iniciais no Supabase (usuários, produtos com fotos e exemplos).

---

## 2. Uso Local (Rede Wi-Fi da Empresa)

Para rodar localmente sem Supabase (salvando em `data/db.json`):

```bash
node server.mjs
```

Ou clique duas vezes em `iniciar.bat` no Windows.

---

## 3. Acessos Iniciais (Senha padrão: `123`)

- `patrao` — Painel do Patrão
- `premoldados` — Produção Pré-Moldados
- `marcenaria` — Produção Marcenaria
- `conferencia` — Conferência e Entradas
- `admin` — Administrador Completo
