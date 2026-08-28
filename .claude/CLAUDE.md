# CLAUDE.md

## Visão Geral do Projeto

Automação que conecta a Kiwify a um fluxo de entrega de acesso: quando um cliente compra um produto, o sistema automaticamente (1) envia um e-mail de boas-vindas/confirmação e (2) libera o acesso a uma pasta específica no Google Drive para o e-mail do comprador.

Este é um **MVP**: o objetivo é ter o caminho feliz (happy path) funcionando de ponta a ponta o mais rápido possível, sem over-engineering. Funcionalidades extras (reembolso, múltiplos produtos, dashboard etc.) ficam para depois — ver seção "Fora do escopo".

## Fluxo Principal (happy path)

1. Cliente compra um produto na Kiwify.
2. Kiwify dispara um webhook (evento de compra aprovada) para o nosso endpoint HTTP.
3. Validamos o token/assinatura do webhook para garantir que a chamada é legítima.
4. Extraímos os dados relevantes do payload (nome, e-mail, produto comprado, order_id).
5. Verificamos se esse `order_id` já foi processado (evitar duplicidade / idempotência).
6. Enviamos um e-mail para o comprador com as instruções de acesso.
7. Compartilhamos a pasta do Google Drive com o e-mail do comprador (permissão de leitura).
8. Registramos o resultado (sucesso/erro) em log.

## Stack sugerida (MVP)

Assumindo Node.js + TypeScript por ser simples de rodar como webhook receiver e ter boas libs prontas para Drive e e-mail. Ajuste se preferir outra linguagem (ex: Python + FastAPI segue a mesma lógica).

- **Node.js + TypeScript**
- **Express** — recebimento do webhook
- **googleapis** — Google Drive API (compartilhar pasta via Service Account)
- **Resend** ou **Nodemailer** (SMTP) — envio de e-mail
- **dotenv** — variáveis de ambiente
- Armazenamento simples (arquivo JSON ou SQLite) para controle de idempotência — nada de banco robusto no MVP

## Estrutura de pastas sugerida

```
project/
  src/
    server.ts
    routes/
      webhook.ts        # recebe e valida o webhook da Kiwify
    services/
      kiwify.ts          # validação de assinatura/token
      email.ts           # envio de e-mail
      drive.ts           # compartilhamento da pasta no Drive
    config/
      env.ts             # carregamento e validação de variáveis de ambiente
  .env.example
  package.json
  CLAUDE.md
```

## Variáveis de ambiente necessárias

```
KIWIFY_WEBHOOK_TOKEN=
GOOGLE_SERVICE_ACCOUNT_JSON=       # ou caminho para o arquivo de credenciais
DRIVE_FOLDER_ID=
EMAIL_PROVIDER_API_KEY=            # ou credenciais SMTP
EMAIL_FROM=
PORT=3000
```

## Regras e convenções

- **Sempre validar** o token/assinatura enviado pela Kiwify antes de processar qualquer webhook.
- **Idempotência**: nunca processar o mesmo `order_id` duas vezes.
- **Nunca logar credenciais** (tokens, chaves de API, JSON da service account).
- Definir o que acontece se uma das duas ações falhar (ex: e-mail falha mas Drive libera, ou vice-versa) — no MVP, sugestão: tentar as duas etapas independentemente e logar falhas separadamente, sem travar uma pela outra.
- No MVP, tratar apenas o evento de **compra aprovada**. Ignorar reembolso, cancelamento, chargeback por enquanto (mas deixar isso documentado como próximo passo).
- Commits pequenos e objetivos; preferir clareza a abstração prematura.

## Fora do escopo do MVP (próximas fases)

- Revogar acesso ao Drive em caso de reembolso/cancelamento.
- Suporte a múltiplos produtos → múltiplas pastas.
- Retry automático de falhas de envio.
- Dashboard/painel de acompanhamento das liberações.
- Suporte a outros gateways além da Kiwify.

## Comandos úteis

```
npm install
npm run dev       # roda o servidor local
npm run build     # build de produção
```

## Checklist para colocar o MVP no ar

1. Criar uma Service Account no Google Cloud e compartilhar a pasta raiz do Drive com o e-mail dela (permissão de editor/gerenciador de compartilhamento).
2. Configurar o webhook na Kiwify apontando para o endpoint do projeto (ex: via ngrok em dev, ou domínio público em produção).
3. Implementar a validação de assinatura/token do webhook.
4. Implementar o envio de e-mail.
5. Implementar o compartilhamento de pasta no Drive.
6. Testar ponta a ponta com uma compra de teste na Kiwify.

## Notas para o Claude (contexto de trabalho)

- Priorize simplicidade: este é um MVP, não um sistema de produção robusto.
- Ao gerar código, sempre inclua tratamento de erro básico e logs claros.
- Pergunte antes de assumir qual gateway de e-mail ou estrutura de banco usar, se isso ainda não estiver decidido no projeto.