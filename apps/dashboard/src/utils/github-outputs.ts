import { OUTPUT_CONTENT_TYPES } from "@notra/schemas/dashboard/integrations";

import { PENDING_OUTPUT_ID_PREFIX } from "@/constants/github";

export function isPendingOutputId(outputId: string) {
  return outputId.startsWith(PENDING_OUTPUT_ID_PREFIX);
}

export function pendingOutputId(repositoryId: string, outputType: string) {
  return `${PENDING_OUTPUT_ID_PREFIX}${repositoryId}:${outputType}`;
}

export function isGitHubContentOutputType(
  value: string
): value is (typeof OUTPUT_CONTENT_TYPES)[number] {
  return OUTPUT_CONTENT_TYPES.some((type) => type === value);
}
