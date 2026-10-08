import { anthropic } from "@ai-sdk/anthropic";

import { GEO_GROUNDED_MAX_SEARCHES } from "../constants/geo";

export function geoAnthropicWebSearch(
  modelId: string,
  allowFiltering: boolean
): ReturnType<typeof anthropic.tools.webSearch_20260318> {
  const version = /claude-[a-z]+-(\d+)(?:[.-](\d+))?/.exec(modelId);
  const supportsFiltering =
    version !== null &&
    (Number(version[1]) > 4 ||
      (Number(version[1]) === 4 && Number(version[2]) >= 6));
  return allowFiltering && supportsFiltering
    ? anthropic.tools.webSearch_20260318({
        maxUses: GEO_GROUNDED_MAX_SEARCHES,
        responseInclusion: "excluded",
      })
    : anthropic.tools.webSearch_20250305({
        maxUses: GEO_GROUNDED_MAX_SEARCHES,
      });
}
