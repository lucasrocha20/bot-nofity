import { Router, type Request, type Response } from "express";
import { validateWebhookSignature, parseApprovedPurchase } from "../services/kiwify";
import { sendAccessEmail } from "../services/email";
import { shareFolderWithEmail } from "../services/drive";
import { isProcessed, markProcessed } from "../services/idempotency";

export const webhookRouter = Router();

interface RawBodyRequest extends Request {
  rawBody?: Buffer;
}

webhookRouter.post("/kiwify", async (req: RawBodyRequest, res: Response) => {
  const signature =
    (req.query.signature as string | undefined) ??
    (req.headers["x-kiwify-signature"] as string | undefined);

  const rawBody = req.rawBody ?? Buffer.from(JSON.stringify(req.body));

  if (!validateWebhookSignature(rawBody, signature)) {
    console.warn("[webhook] assinatura inválida, requisição rejeitada");
    return res.status(401).json({ error: "assinatura inválida" });
  }

  const purchase = parseApprovedPurchase(req.body);
  if (!purchase) {
    console.log("[webhook] evento ignorado (não é compra aprovada ou payload incompleto)");
    return res.status(200).json({ status: "ignored" });
  }

  const { orderId, customerEmail, customerName, productName } = purchase;

  if (isProcessed(orderId)) {
    console.log(`[webhook] order_id ${orderId} já processado, ignorando`);
    return res.status(200).json({ status: "already_processed" });
  }

  const [emailResult, driveResult] = await Promise.allSettled([
    sendAccessEmail({ to: customerEmail, name: customerName, productName }),
    shareFolderWithEmail(customerEmail),
  ]);

  if (emailResult.status === "fulfilled") {
    console.log(`[webhook] e-mail enviado para ${customerEmail} (order ${orderId})`);
  } else {
    console.error(`[webhook] falha ao enviar e-mail (order ${orderId}):`, emailResult.reason);
  }

  if (driveResult.status === "fulfilled") {
    console.log(`[webhook] Drive compartilhado com ${customerEmail} (order ${orderId})`);
  } else {
    console.error(`[webhook] falha ao compartilhar Drive (order ${orderId}):`, driveResult.reason);
  }

  markProcessed(orderId);

  return res.status(200).json({ status: "processed" });
});
