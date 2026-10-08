import {
  SITE_ANALYTICS_EVENT_FILE,
  SITE_ENGAGEMENT_VIEW_ID_PATTERN,
} from "@notra/sites-core/constants/sites";

import {
  ANALYTICS_EVENT_MAX_BYTES,
  ANALYTICS_SCRIPT,
  ANALYTICS_SCRIPT_CACHE_CONTROL,
} from "./constants/analytics";
import { TRAFFIC_REPORT_TIMEOUT_MS } from "./constants/traffic";
import type { AnalyticsEvent, EngagementReport } from "./types/traffic";
import { escapeHtml } from "./utils/html";

export function isAnalyticsEventPath(pathname: string): boolean {
  return pathname.endsWith(`/${SITE_ANALYTICS_EVENT_FILE}`);
}

export function analyticsScriptResponse(): Response {
  return new Response(ANALYTICS_SCRIPT, {
    headers: {
      "Content-Type": "text/javascript; charset=utf-8",
      "Cache-Control": ANALYTICS_SCRIPT_CACHE_CONTROL,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export function injectAnalyticsScript(
  response: Response,
  scriptSrc: string,
  eventPath: string
): Response {
  const tag = `<script src="${escapeHtml(scriptSrc)}" data-endpoint="${escapeHtml(eventPath)}" defer></script>`;
  return new HTMLRewriter()
    .on("body", {
      element(element) {
        element.append(tag, { html: true });
      },
    })
    .transform(response);
}

function parseAnalyticsEvent(text: string): AnalyticsEvent | null {
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof body !== "object" || body === null) {
    return null;
  }
  const { v, p, ms, sd } = body as Record<string, unknown>;
  if (
    typeof v !== "string" ||
    !SITE_ENGAGEMENT_VIEW_ID_PATTERN.test(v) ||
    typeof p !== "string" ||
    !p.startsWith("/") ||
    typeof ms !== "number" ||
    !Number.isFinite(ms) ||
    ms < 0 ||
    typeof sd !== "number" ||
    !Number.isFinite(sd)
  ) {
    return null;
  }
  return {
    viewId: v,
    path: p,
    visibleMs: Math.round(ms),
    scrollDepth: Math.min(100, Math.max(0, Math.round(sd))),
  };
}

export async function readAnalyticsEvent(
  request: Request
): Promise<AnalyticsEvent | null> {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > ANALYTICS_EVENT_MAX_BYTES) {
    return null;
  }
  const text = await request.text().catch(() => "");
  if (text.length === 0 || text.length > ANALYTICS_EVENT_MAX_BYTES) {
    return null;
  }
  return parseAnalyticsEvent(text);
}

export async function reportEngagement(
  report: EngagementReport
): Promise<void> {
  const { event, publicOrigin } = report;
  try {
    const response = await report.fetch(report.ingestUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${report.token}`,
      },
      body: JSON.stringify({
        type: "engagement",
        timestamp: new Date().toISOString(),
        url: new URL(event.path, publicOrigin).href,
        viewId: event.viewId,
        visibleMs: event.visibleMs,
        scrollDepth: event.scrollDepth,
      }),
      signal: AbortSignal.timeout(TRAFFIC_REPORT_TIMEOUT_MS),
    });
    await response.body?.cancel();
    if (!response.ok && response.status !== 401) {
      console.warn("sites.engagement_rejected", { status: response.status });
    }
  } catch (error) {
    console.warn("sites.engagement_failed", { error: String(error) });
  }
}
