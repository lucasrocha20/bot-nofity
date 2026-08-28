# Instruções: como preencher o `.env`

Copie o arquivo de exemplo antes de começar:

```bash
cp .env.example .env
```

Depois, preencha cada variável seguindo os passos abaixo.

---

## 1. `KIWIFY_WEBHOOK_TOKEN`

Esse é o token que você mesmo define e usa para validar que os webhooks recebidos realmente vieram da Kiwify.

1. Acesse o [painel da Kiwify](https://dashboard.kiwify.com.br/).
2. Vá em **Configurações** → **Webhooks** (ou **Integrações** → **Webhooks**, dependendo da versão do painel).
3. Clique em **Adicionar webhook** (ou edite um existente).
4. Preencha a **URL** do webhook apontando para o seu endpoint:
   - Em desenvolvimento (via ngrok): `https://SEU-SUBDOMINIO.ngrok.io/webhook/kiwify`
   - Em produção: `https://SEU-DOMINIO.com/webhook/kiwify`
5. No campo de **token/chave secreta do webhook**, gere uma string aleatória forte (ex: `openssl rand -hex 32` no terminal) e cole esse mesmo valor tanto na Kiwify quanto no `.env`.
6. Selecione o evento **compra aprovada** (pode aparecer como "Compra aprovada", "Pedido pago" ou `order_approved`/`order.paid`, dependendo da versão do painel).
7. Salve.
8. Copie o token gerado para o `.env`:
   ```
   KIWIFY_WEBHOOK_TOKEN=o-token-que-voce-gerou
   ```

> ⚠️ Importante: o código atual (`src/services/kiwify.ts`) valida a assinatura assumindo que a Kiwify envia um HMAC-SHA1 do corpo da requisição (calculado com esse token) no parâmetro `?signature=` da URL ou no header `x-kiwify-signature`. Confirme na documentação oficial da Kiwify ou inspecionando uma chamada de teste real qual é o mecanismo exato (pode ser um token simples enviado direto, sem HMAC) e ajuste `validateWebhookSignature` se for diferente.

---

## 2. `GOOGLE_SERVICE_ACCOUNT_JSON`

Essa variável guarda as credenciais de uma **Service Account** do Google Cloud, que é usada para compartilhar a pasta do Drive automaticamente (sem depender de login de um usuário humano).

### Passo a passo no Google Cloud Console

1. Acesse [console.cloud.google.com](https://console.cloud.google.com/).
2. Crie um projeto novo (ou selecione um existente) no seletor de projetos no topo da página.
3. No menu lateral, vá em **APIs e serviços** → **Biblioteca**.
4. Busque por **Google Drive API** e clique em **Ativar**.
5. Vá em **APIs e serviços** → **Credenciais**.
6. Clique em **Criar credenciais** → **Conta de serviço** (Service Account).
7. Dê um nome (ex: `bot-kiwify-drive`) e clique em **Criar e continuar**.
8. Em "Conceder acesso a este projeto", pode pular (não é necessário nenhum papel do projeto) e clicar em **Continuar** → **Concluir**.
9. Na lista de contas de serviço, clique na conta que você acabou de criar.
10. Vá na aba **Chaves** → **Adicionar chave** → **Criar nova chave**.
11. Escolha o formato **JSON** e clique em **Criar**. Um arquivo `.json` será baixado automaticamente — **guarde-o em local seguro, nunca o commite no git**.

### Como usar esse arquivo no `.env`

Você tem duas opções (o código em `src/services/drive.ts` aceita as duas):

**Opção A — caminho do arquivo (mais simples):**
```
GOOGLE_SERVICE_ACCOUNT_JSON=/caminho/absoluto/para/service-account.json
```

**Opção B — conteúdo JSON direto na variável (útil em produção, ex: variáveis de ambiente de um servidor/PaaS):**
```bash
# gera a variável em uma linha só, sem quebras de linha
GOOGLE_SERVICE_ACCOUNT_JSON=$(cat service-account.json | tr -d '\n')
```
E cole o valor resultante no `.env`, entre aspas se tiver espaços.

> Guarde o arquivo `.json` baixado fora da pasta do projeto (ou garanta que ele está no `.gitignore`) para nunca ser commitado por engano.

---

## 3. `DRIVE_FOLDER_ID`

É o ID da pasta do Google Drive que será compartilhada com os compradores.

1. Acesse o [Google Drive](https://drive.google.com/) com a conta que é dona da pasta (ou tem permissão de gerenciar compartilhamento nela).
2. Crie (ou localize) a pasta que contém o conteúdo do produto.
3. Abra a pasta e olhe a URL no navegador. Ela terá esse formato:
   ```
   https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUvWxYz
   ```
4. O `DRIVE_FOLDER_ID` é a parte final da URL, depois de `/folders/`:
   ```
   DRIVE_FOLDER_ID=1AbCdEfGhIjKlMnOpQrStUvWxYz
   ```

### Compartilhe a pasta com a Service Account

Esse passo é essencial — sem ele, a Service Account não tem permissão para compartilhar a pasta com ninguém:

1. Abra o arquivo `.json` da Service Account (baixado no passo anterior) e copie o valor do campo `client_email` (algo como `bot-kiwify-drive@seu-projeto.iam.gserviceaccount.com`).
2. No Google Drive, clique com o botão direito na pasta → **Compartilhar**.
3. Cole o e-mail da Service Account e dê permissão de **Editor** (ou "Gerenciador de conteúdo", dependendo se é Drive pessoal ou Drive compartilhado/Shared Drive) — isso é necessário para que ela possa, por sua vez, compartilhar a pasta com os compradores.
4. Clique em **Enviar** (pode desmarcar "Notificar pessoas", já que é uma conta de serviço).

---

## 4. `RESEND_API_KEY`

1. Crie uma conta em [resend.com](https://resend.com/).
2. No painel, vá em **API Keys** (menu lateral).
3. Clique em **Create API Key**.
4. Dê um nome (ex: `bot-kiwify`) e permissão de **Sending access** (envio).
5. Copie a chave gerada (começa com `re_`) — ela só é exibida uma vez.
6. Cole no `.env`:
   ```
   RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx
   ```

---

## 5. `EMAIL_FROM`

É o endereço de e-mail que aparecerá como remetente. Para o Resend enviar e-mails de verdade (fora do modo de teste), o domínio desse e-mail precisa estar verificado na sua conta.

1. No painel do Resend, vá em **Domains** → **Add Domain**.
2. Digite o seu domínio (ex: `seudominio.com.br`) e siga as instruções para adicionar os registros DNS (SPF, DKIM) mostrados na tela, no painel onde seu domínio está hospedado (Registro.br, Cloudflare, GoDaddy etc.).
3. Aguarde a verificação (pode levar de minutos a algumas horas, dependendo da propagação DNS). O status muda para **Verified** no painel do Resend.
4. Defina o remetente usando esse domínio verificado:
   ```
   EMAIL_FROM=Nome da Empresa <acesso@seudominio.com.br>
   ```

> Enquanto o domínio não estiver verificado, o Resend só permite enviar e-mails de teste para o próprio e-mail cadastrado na conta, usando `onboarding@resend.dev` como remetente — útil para testar antes de configurar o domínio definitivo:
> ```
> EMAIL_FROM=onboarding@resend.dev
> ```

---

## 6. `PORT`

Porta local em que o servidor Express vai rodar. Não exige nenhum cadastro externo — pode manter o padrão:
```
PORT=3000
```
Só mude se essa porta já estiver em uso na sua máquina/servidor.

---

## Checklist final

- [ ] `KIWIFY_WEBHOOK_TOKEN` gerado e cadastrado igual nos dois lados (painel da Kiwify e `.env`)
- [ ] Google Drive API ativada no Google Cloud
- [ ] Service Account criada e chave JSON baixada
- [ ] Pasta do Drive compartilhada com o e-mail da Service Account (permissão de Editor)
- [ ] `DRIVE_FOLDER_ID` copiado da URL da pasta
- [ ] Conta no Resend criada e `RESEND_API_KEY` gerada
- [ ] Domínio verificado no Resend (ou usando `onboarding@resend.dev` para testes)
- [ ] Webhook configurado no painel da Kiwify apontando para `/webhook/kiwify`

Depois de preencher tudo, rode `npm run dev` e teste com uma compra de teste na Kiwify (ou simulando a requisição via `curl`/Postman).
