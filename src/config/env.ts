import "dotenv/config";

const REQUIRED_VARS = [
  "KIWIFY_WEBHOOK_TOKEN",
  "GOOGLE_SERVICE_ACCOUNT_JSON",
  "DRIVE_FOLDER_ID",
  "RESEND_API_KEY",
  "EMAIL_FROM",
] as const;

for (const key of REQUIRED_VARS) {
  if (!process.env[key]) {
    throw new Error(`Variável de ambiente obrigatória ausente: ${key}`);
  }
}

export const env = {
  kiwifyWebhookToken: process.env.KIWIFY_WEBHOOK_TOKEN!,
  googleServiceAccountJson: process.env.GOOGLE_SERVICE_ACCOUNT_JSON!,
  driveFolderId: process.env.DRIVE_FOLDER_ID!,
  resendApiKey: process.env.RESEND_API_KEY!,
  emailFrom: process.env.EMAIL_FROM!,
  port: Number(process.env.PORT ?? 3000),
};
