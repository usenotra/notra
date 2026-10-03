import { createHmac } from "node:crypto";

import { decodeIntegrationEncryptionKey } from "@notra/db/utils/integration-encryption";

export function getToolApprovalSecret(
  organizationId: string,
  chatId: string | undefined,
  encryptionKey = process.env.INTEGRATION_ENCRYPTION_KEY
): Buffer {
  if (!chatId) {
    throw new Error("Chat ID is required for tool approvals");
  }
  return createHmac("sha256", decodeIntegrationEncryptionKey(encryptionKey))
    .update(JSON.stringify(["notra:tool-approval:v1", organizationId, chatId]))
    .digest();
}
