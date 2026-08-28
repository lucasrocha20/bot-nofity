# Plano: MVP de Automação Kiwify → E-mail + Google Drive

## Contexto

O projeto está vazio (apenas `.claude/CLAUDE.md`). O objetivo é construir do zero o MVP descrito no CLAUDE.md: um webhook receiver que, ao receber uma notificação de compra aprovada da Kiwify, (1) envia um e-mail de boas-vindas ao comprador e (2) libera acesso a uma pasta do Google Drive para o e-mail dele. Prioridade total em simplicidade — caminho feliz de ponta a ponta, sem infraestrutura robusta.

Decisões confirmadas com o usuário:
- **E-mail**: Resend
- **Idempotência**: SQLite (arquivo local, via `better-sqlite3`)

## Stack

- Node.js + TypeScript
- Express (webhook receiver)
- googleapis (Google Drive API via Service Account)
- Resend (envio de e-mail)
- better-sqlite3 (idempotência — tabela simples de `order_id`s processados)
- dotenv (variáveis de ambiente)
- tsx (rodar TS em dev) + tsc (build)

## Estrutura de arquivos a criar

```
project/
  src/
    server.ts                 # bootstrap do Express, monta rotas
    routes/
      webhook.ts               # POST /webhook/kiwify — valida token, extrai payload, orquestra email+drive
    services/
      kiwify.ts                 # validação de assinatura/token da Kiwify
      email.ts                  # envio de e-mail via Resend
      drive.ts                  # compartilhamento de pasta via googleapis
      idempotency.ts             # checagem/registro de order_id processado (SQLite)
    config/
      env.ts                     # carrega e valida variáveis de ambiente (falha rápido se faltar algo)
  .env.example
  .gitignore                     # node_modules, .env, *.db
  package.json
  tsconfig.json
  planejamento.md                # este plano, salvo na raiz (pedido do usuário)
```

## Detalhamento por módulo

### `config/env.ts`
Carrega `dotenv`, valida presença de todas as variáveis obrigatórias (`KIWIFY_WEBHOOK_TOKEN`, `GOOGLE_SERVICE_ACCOUNT_JSON`, `DRIVE_FOLDER_ID`, `RESEND_API_KEY`, `EMAIL_FROM`, `PORT`), lança erro claro no startup se algo faltar. Exporta um objeto `env` tipado.

### `services/idempotency.ts`
- Abre/cria banco SQLite local (ex: `data/processed_orders.db`) com tabela `processed_orders (order_id TEXT PRIMARY KEY, processed_at TEXT)`.
- `isProcessed(orderId): boolean`
- `markProcessed(orderId): void`
- Diretório `data/` deve estar no `.gitignore`.

### `services/kiwify.ts`
- Função `validateWebhookToken(req)`: compara o token recebido (query param ou header, conforme padrão da Kiwify) com `KIWIFY_WEBHOOK_TOKEN`. Rejeita (401) se inválido.
- Função `parseApprovedPurchase(payload)`: extrai `{ orderId, customerName, customerEmail, productName }` do payload; retorna `null`/lança se o evento não for de compra aprovada (para ignorar outros eventos no MVP).

### `services/email.ts`
- `sendAccessEmail({ to, name, productName })`: usa Resend SDK para enviar e-mail simples de boas-vindas/confirmação com instruções de acesso.
- Erros são capturados e logados, não lançados para fora (não deve travar o fluxo do Drive).

### `services/drive.ts`
- Autentica via `googleapis` usando a Service Account (`GOOGLE_SERVICE_ACCOUNT_JSON`).
- `shareFolderWithEmail(email)`: cria uma permission do tipo `reader` na pasta `DRIVE_FOLDER_ID` para o e-mail do comprador.
- Erros capturados e logados, independentes do fluxo de e-mail.

### `routes/webhook.ts`
- `POST /webhook/kiwify`
- Fluxo:
  1. Valida token (via `kiwify.ts`) → 401 se inválido.
  2. Parseia payload → ignora (200 OK, log de "evento ignorado") se não for compra aprovada.
  3. Checa idempotência via `idempotency.ts` → se já processado, retorna 200 imediatamente (sem reprocessar).
  4. Dispara envio de e-mail e compartilhamento de Drive **independentemente** (Promise.allSettled ou try/catch separados) — falha em um não bloqueia o outro.
  5. Marca `order_id` como processado (mesmo se uma das duas etapas falhar, para não reprocessar — falhas ficam registradas em log para intervenção manual).
  6. Loga resultado (sucesso/erro de cada etapa) — nunca loga credenciais.
  7. Responde 200 para a Kiwify.

### `server.ts`
- Cria app Express, middleware `express.json()`, monta rota de webhook, `app.listen(env.PORT)`.

## Variáveis de ambiente (`.env.example`)

```
KIWIFY_WEBHOOK_TOKEN=
GOOGLE_SERVICE_ACCOUNT_JSON=
DRIVE_FOLDER_ID=
RESEND_API_KEY=
EMAIL_FROM=
PORT=3000
```

## Passos de implementação

1. `npm init` + instalar dependências (express, googleapis, resend, better-sqlite3, dotenv, typescript, tsx, @types/express, @types/node).
2. Criar `tsconfig.json` e scripts `dev`/`build`/`start` no `package.json`.
3. Implementar `config/env.ts`.
4. Implementar `services/idempotency.ts` (SQLite).
5. Implementar `services/kiwify.ts` (validação + parsing).
6. Implementar `services/email.ts` (Resend).
7. Implementar `services/drive.ts` (googleapis).
8. Implementar `routes/webhook.ts` orquestrando os serviços.
9. Implementar `server.ts`.
10. Criar `.env.example` e `.gitignore`.
11. Copiar este plano para `planejamento.md` na raiz do projeto (pedido explícito do usuário).

## Verificação

- Rodar `npm run dev` e confirmar que o servidor sobe sem erros de variável de ambiente faltando.
- Testar o endpoint localmente com `curl`/Postman simulando um payload de compra aprovada da Kiwify (com token válido) e confirmar:
  - E-mail é enviado (checar dashboard do Resend ou inbox de teste).
  - Permissão é criada na pasta do Drive (checar via Google Drive UI ou API).
  - Segunda chamada com o mesmo `order_id` é ignorada (idempotência).
  - Chamada com token inválido retorna 401.
- Expor o endpoint via `ngrok` e configurar o webhook real na Kiwify para um teste ponta a ponta com compra de teste (conforme checklist do CLAUDE.md).
