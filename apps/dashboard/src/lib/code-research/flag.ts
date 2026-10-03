import {
  createServerFlagsManager,
  type ServerFlagsManager,
} from "@databuddy/sdk/node";
import { isCodeResearchConfigured } from "@notra/ai/utils/code-research-box";

import {
  CODE_RESEARCH_FLAG_CACHE_TTL_MS,
  CODE_RESEARCH_FLAG_KEY,
  CODE_RESEARCH_FLAG_STALE_TIME_MS,
} from "@/constants/code-research";

const clientId = process.env.NEXT_PUBLIC_DATABUDDY_DASHBOARD_WEBSITE_ID ?? "";

let cachedManager: ServerFlagsManager | null = null;

function getFlagsManager(): ServerFlagsManager | null {
  if (clientId.length === 0) {
    return null;
  }
  if (!cachedManager) {
    cachedManager = createServerFlagsManager({
      clientId,
      autoFetch: false,
      cacheTtl: CODE_RESEARCH_FLAG_CACHE_TTL_MS,
      staleTime: CODE_RESEARCH_FLAG_STALE_TIME_MS,
      skipStorage: true,
    });
  }
  return cachedManager;
}

/**
 * Whether the content agent may read the organization's repository in a
 * sandbox. Fails closed: flag errors keep code research off.
 */
export async function isCodeResearchEnabledForOrganization(
  organizationId: string
): Promise<boolean> {
  // The kill switch wins over the development default.
  if (!isCodeResearchConfigured()) {
    return false;
  }
  if (process.env.NODE_ENV === "development") {
    return true;
  }
  const manager = getFlagsManager();
  if (!manager) {
    return false;
  }
  try {
    const result = await manager.getFlag(CODE_RESEARCH_FLAG_KEY, {
      organizationId,
      properties: { organizationId },
    });
    return result.enabled;
  } catch {
    return false;
  }
}
