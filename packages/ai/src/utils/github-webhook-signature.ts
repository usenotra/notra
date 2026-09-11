import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyGitHubWebhookSignature(
  payload: string,
  signature: string | null,
  secret: string
) {
  if (!signature) {
    return false;
  }

  const digest = `sha256=${createHmac("sha256", secret).update(payload).digest("hex")}`;
  const digestBuffer = Buffer.from(digest);
  const signatureBuffer = Buffer.from(signature);
  if (digestBuffer.length !== signatureBuffer.length) {
    return false;
  }
  return timingSafeEqual(digestBuffer, signatureBuffer);
}
