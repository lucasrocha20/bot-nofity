import crypto from "node:crypto";
import { env } from "../config/env";

export interface ApprovedPurchase {
  orderId: string;
  customerName: string;
  customerEmail: string;
  productName: string;
}

export function validateWebhookSignature(
  rawBody: Buffer,
  signature: string | undefined
): boolean {
  if (!signature) return false;

  const expected = crypto
    .createHmac("sha1", env.kiwifyWebhookToken)
    .update(rawBody)
    .digest("hex");

  const expectedBuf = Buffer.from(expected, "utf8");
  const signatureBuf = Buffer.from(signature, "utf8");

  if (expectedBuf.length !== signatureBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, signatureBuf);
}

// Estrutura assumida do payload da Kiwify — confirmar contra a doc oficial
// antes de ir para produção e ajustar os campos abaixo se necessário.
export function parseApprovedPurchase(payload: any): ApprovedPurchase | null {
  const orderStatus = payload?.order_status;
  if (orderStatus !== "paid") return null;

  const orderId = payload?.order_id;
  const customerEmail = payload?.Customer?.email;
  const customerName = payload?.Customer?.full_name;
  const productName = payload?.Product?.product_name;

  if (!orderId || !customerEmail || !customerName || !productName) {
    return null;
  }

  return { orderId, customerEmail, customerName, productName };
}
