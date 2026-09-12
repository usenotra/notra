import type { GeoPromptResultDetailResponse } from "@notra/geo-core/types/geo";

import type { GeoPromptDetailState } from "@/types/geo-prompt-detail";

export function geoPromptDetailState(
  checkId: string | null,
  data: GeoPromptResultDetailResponse | undefined,
  isError: boolean,
  historyStatus?: "pending" | "error" | "success"
): GeoPromptDetailState {
  if (historyStatus === "pending") {
    return { status: "loading" };
  }
  if (historyStatus === "error") {
    return { status: "error" };
  }
  if (!checkId) {
    return { status: "missing" };
  }
  if (isError) {
    return { status: "error" };
  }
  if (!data) {
    return { status: "loading" };
  }
  return data.result
    ? { status: "ready", result: data.result }
    : { status: "missing" };
}
