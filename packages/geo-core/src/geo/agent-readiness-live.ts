import { Effect, Layer } from "effect";

import {
  AGENT_READINESS_API_ORIGIN,
  AGENT_READINESS_HTTP_NOT_FOUND,
  AGENT_READINESS_REPORT_TIMEOUT_MS,
  AGENT_READINESS_SCAN_TIMEOUT_MS,
  AGENT_READINESS_USER_AGENT,
} from "../constants/agent-readiness";
import { AgentReadinessNetwork } from "../deps";
import {
  agentReadinessApiProblemSchema,
  agentReadinessApiReportSchema,
} from "../schemas/agent-readiness";
import { AgentReadinessApiError } from "../schemas/agent-readiness-errors";
import type {
  AgentReadinessApiReport,
  AgentReadinessFetch,
  AgentReadinessParsedReport,
  AgentReadinessSseEvent,
  AgentReadinessSseFrameBoundary,
} from "../types/agent-readiness";
import { toAgentReadinessApiErrorMessage } from "../utils/agent-readiness";
import { checkFeedbackMarkdown } from "../utils/feedback-md";

function parseApiReport(
  body: AgentReadinessApiReport
): AgentReadinessParsedReport {
  const breakdown = body.score_breakdown;
  return {
    score: body.score ?? null,
    scoreLabel: body.score_label ?? null,
    scoreBreakdown: breakdown
      ? {
          essential: breakdown.essential,
          recommended: breakdown.recommended,
          bonus: {
            points: breakdown.bonus.points,
            positiveSignals: breakdown.bonus.positive_signals,
          },
        }
      : null,
    issues: (body.issues ?? []).map((issue) => ({
      id: issue.id,
      name: issue.name,
      tier: issue.tier,
      result: issue.result,
      details: issue.details ?? null,
      recommendation: issue.recommendation ?? null,
    })),
    eligibleChecks: body.eligible_checks ?? null,
    reportUrl: body.report_url ?? null,
    scannedAt: body.scanned_at ? new Date(body.scanned_at) : null,
  };
}

async function fetchStoredReport(
  targetUrl: string,
  signal: AbortSignal,
  fetchRequest: AgentReadinessFetch
): Promise<AgentReadinessParsedReport | null> {
  const endpoint = new URL("/api/v1/report", AGENT_READINESS_API_ORIGIN);
  endpoint.searchParams.set("url", targetUrl);
  const response = await fetchRequest(endpoint, {
    headers: {
      Accept: "application/json",
      "User-Agent": AGENT_READINESS_USER_AGENT,
    },
    signal: AbortSignal.any([
      signal,
      AbortSignal.timeout(AGENT_READINESS_REPORT_TIMEOUT_MS),
    ]),
  });

  if (response.status === AGENT_READINESS_HTTP_NOT_FOUND) {
    await response.text();
    return null;
  }
  if (!response.ok) {
    const parsedProblem = agentReadinessApiProblemSchema.safeParse(
      await response.json().catch(() => null)
    );
    throw new AgentReadinessApiError({
      message: toAgentReadinessApiErrorMessage(
        parsedProblem.success ? parsedProblem.data.code : null,
        targetUrl,
        response.status
      ),
    });
  }

  const parsed = agentReadinessApiReportSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new AgentReadinessApiError({
      message: "Is Agentic returned a report in an unexpected format",
    });
  }
  return parseApiReport(parsed.data);
}

function ssePayload(frame: string): unknown {
  const dataLines = frame
    .split(/\r\n|\n|\r/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice("data:".length).trim());
  if (dataLines.length === 0) {
    return null;
  }
  try {
    return JSON.parse(dataLines.join("\n"));
  } catch {
    return null;
  }
}

function sseFrameBoundary(
  buffer: string
): AgentReadinessSseFrameBoundary | null {
  const match = /\r\n\r\n|\n\n|\r\r/.exec(buffer);
  return match?.index === undefined
    ? null
    : { index: match.index, length: match[0].length };
}

function assertScanFrameOk(frame: string): void {
  const event = ssePayload(frame);
  if (
    event &&
    typeof event === "object" &&
    (event as AgentReadinessSseEvent).type === "error"
  ) {
    throw new AgentReadinessApiError({
      message: "Is Agentic could not complete the scan for this website",
    });
  }
}

/**
 * Starts a scan and blocks until the SSE stream closes; is-agentic stores the
 * finished report server-side, so the stream is only consumed for completion.
 */
async function streamScan(
  targetUrl: string,
  signal: AbortSignal,
  fetchRequest: AgentReadinessFetch
): Promise<void> {
  const endpoint = new URL("/api/scan/stream", AGENT_READINESS_API_ORIGIN);
  endpoint.searchParams.set("target", targetUrl);
  const response = await fetchRequest(endpoint, {
    headers: {
      Accept: "text/event-stream",
      "Cache-Control": "no-store",
      "User-Agent": AGENT_READINESS_USER_AGENT,
    },
    signal: AbortSignal.any([
      signal,
      AbortSignal.timeout(AGENT_READINESS_SCAN_TIMEOUT_MS),
    ]),
  });

  if (!(response.ok && response.body)) {
    const parsedProblem = agentReadinessApiProblemSchema.safeParse(
      await response.json().catch(() => null)
    );
    throw new AgentReadinessApiError({
      message: toAgentReadinessApiErrorMessage(
        parsedProblem.success ? parsedProblem.data.code : null,
        targetUrl,
        response.status
      ),
    });
  }

  const reader = response.body.getReader();
  const cancel = () => {
    void reader.cancel().catch(() => undefined);
  };
  signal.addEventListener("abort", cancel, { once: true });
  const decoder = new TextDecoder();
  let buffer = "";
  let completed = false;
  try {
    if (signal.aborted) {
      cancel();
      signal.throwIfAborted();
    }
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        completed = true;
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      let boundary = sseFrameBoundary(buffer);
      while (boundary) {
        assertScanFrameOk(buffer.slice(0, boundary.index));
        buffer = buffer.slice(boundary.index + boundary.length);
        boundary = sseFrameBoundary(buffer);
      }
    }
    buffer += decoder.decode();
    if (buffer) {
      assertScanFrameOk(buffer);
    }
  } finally {
    signal.removeEventListener("abort", cancel);
    if (!completed) {
      await reader.cancel().catch(() => undefined);
    }
    reader.releaseLock();
  }
}

function readinessNetwork<A>(run: (signal: AbortSignal) => Promise<A>) {
  return Effect.tryPromise({
    try: run,
    catch: (cause) =>
      cause instanceof AgentReadinessApiError
        ? cause
        : new AgentReadinessApiError({
            message: "Is Agentic could not be reached. Please try again.",
            cause,
          }),
  });
}

export function makeAgentReadinessNetwork(fetchRequest: AgentReadinessFetch) {
  return Layer.effect(
    AgentReadinessNetwork,
    Effect.sync(() =>
      AgentReadinessNetwork.of({
        report: Effect.fn("AgentReadinessNetwork.report")((url) =>
          readinessNetwork((signal) =>
            fetchStoredReport(url, signal, fetchRequest)
          )
        ),
        scan: Effect.fn("AgentReadinessNetwork.scan")((url) =>
          readinessNetwork((signal) => streamScan(url, signal, fetchRequest))
        ),
        feedback: Effect.fn("AgentReadinessNetwork.feedback")((url) =>
          readinessNetwork((signal) => checkFeedbackMarkdown(url, signal))
        ),
      })
    )
  );
}

export const agentReadinessNetworkLive = makeAgentReadinessNetwork(
  (url, init) => fetch(url, init)
);
