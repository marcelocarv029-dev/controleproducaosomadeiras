# CONTROLE DE PRODUÇÃO — Pré-Moldados & Marcenaria (PWA)

Aplicativo PWA **mobile-first** e **offline-first** para controle do fluxo:
**FABRICAÇÃO → CONFERÊNCIA → QUEBRAS/DIVERGÊNCIAS → ENTRADA NO ESTOQUE → PAINEL DO PATRÃO**.

---

## 1. Deploy em Produção (Supabase + GitHub + Render)

### Passo 1 — Configurar o Supabase
1. Crie um projeto gratuito em [supabase.com](https://supabase.com).
2. No menu lateral, abra **SQL Editor** → **New query**.
3. Copie e execute todo o conteúdo do arquivo [`supabase/schema.sql`](supabase/schema.sql).
4. Em **Project Settings → API Keys**, copie a **Project URL** e a **Secret key** (`sb_secret_...` ou `service_role`).

### Passo 2 — Subir no GitHub
O repositório já está configurado em `https://github.com/marcelocarv029-dev/controleproducaosomadeiras`.

### Passo 3 — Deploy no Render
1. Acesse [render.com](https://render.com) → **New + → Web Service** (ou **Blueprint** usando [`render.yaml`](render.yaml)).
2. Conecte o repositório `marcelocarv029-dev/controleproducaosomadeiras` (branch `main`).
3. Configure:
   - **Runtime:** `Node`
   - **Build Command:** *(deixe vazio)*
   - **Start Command:** `npm start`
4. Em **Environment Variables**, adicione:
   - `SUPABASE_URL` = `https://seu-projeto.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` = `sb_secret_...` *(ou `service_role`)*
5. Clique em **Create Web Service**.

Quando `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` estão configuradas, o `server.mjs` grava e sincroniza tudo diretamente no Supabase (sem depender do disco local do Render).

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
