import { Resend } from "resend";
import { env } from "../config/env";

const resend = new Resend(env.resendApiKey);

interface SendAccessEmailParams {
  to: string;
  name: string;
  productName: string;
}

export async function sendAccessEmail({
  to,
  name,
  productName,
}: SendAccessEmailParams): Promise<void> {
  const { error } = await resend.emails.send({
    from: env.emailFrom,
    to,
    subject: `Seu acesso a ${productName} está liberado!`,
    html: `
      <p>Olá, ${name}!</p>
      <p>Sua compra de <strong>${productName}</strong> foi aprovada.</p>
      <p>O acesso à pasta com o conteúdo já foi liberado para este e-mail (${to}) no Google Drive. Você deve receber uma notificação do Google em instantes.</p>
    `,
  });

  if (error) {
    throw new Error(`Falha ao enviar e-mail via Resend: ${error.message}`);
  }
}
