import { GEO_NON_AI_BOT_PATTERNS } from "../constants/geo";
import { WEB_MACHINE_PATH_PATTERN } from "../constants/web-analytics";
import type { WebPageViewInput } from "../types/ingest";

export function isHumanPageView(
  input: Pick<WebPageViewInput, "classification" | "payload" | "url">
): boolean {
  const { classification, payload, url } = input;
  if (
    classification.visitorType !== "human" &&
    classification.visitorType !== "ai_referral"
  ) {
    return false;
  }
  if (payload.method.toUpperCase() !== "GET" || payload.signals?.prefetch) {
    return false;
  }
  if (
    payload.status !== undefined &&
    payload.status >= 300 &&
    payload.status !== 404
  ) {
    return false;
  }
  const userAgent = payload.userAgent?.toLowerCase() ?? "";
  if (GEO_NON_AI_BOT_PATTERNS.some((pattern) => userAgent.includes(pattern))) {
    return false;
  }
  return !WEB_MACHINE_PATH_PATTERN.test(url.pathname);
}
