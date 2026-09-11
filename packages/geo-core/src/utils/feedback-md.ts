import { fetchPublicUrl } from "@notra/ai/utils/public-fetch";
import type { AgentReadinessIssue } from "@notra/db/types/agent-readiness";

import { AGENT_READINESS_USER_AGENT } from "../constants/agent-readiness";
import {
  FEEDBACK_MD_CHECK_ID,
  FEEDBACK_MD_CHECK_NAME,
  FEEDBACK_MD_CONTENT_TYPE,
  FEEDBACK_MD_HTML_DOCUMENT_REGEX,
  FEEDBACK_MD_MAX_REDIRECTS,
  FEEDBACK_MD_MAX_RESPONSE_CHARS,
  FEEDBACK_MD_PATH,
  FEEDBACK_MD_REQUEST_TIMEOUT_MS,
  FEEDBACK_MD_REQUIRED_SECTION_REGEX,
  FEEDBACK_MD_SETUP_RECOMMENDATION,
} from "../constants/feedback-md";

function feedbackMdIssue(
  result: AgentReadinessIssue["result"],
  details: string,
  recommendation: string
): AgentReadinessIssue {
  return {
    id: FEEDBACK_MD_CHECK_ID,
    name: FEEDBACK_MD_CHECK_NAME,
    tier: "bonus",
    result,
    details,
    recommendation,
  };
}

export function evaluateFeedbackMarkdown(
  status: number,
  contentType: string | null,
  body: string
): AgentReadinessIssue | null {
  if (status < 200 || status >= 300) {
    return feedbackMdIssue(
      "failed",
      status === 0
        ? "The scan could not retrieve /feedback.md."
        : `GET /feedback.md returned HTTP ${status}.`,
      FEEDBACK_MD_SETUP_RECOMMENDATION
    );
  }

  const mediaType = contentType?.split(";", 1)[0]?.trim().toLowerCase();
  if (mediaType === "text/html" || FEEDBACK_MD_HTML_DOCUMENT_REGEX.test(body)) {
    return feedbackMdIssue(
      "failed",
      "/feedback.md returned HTML instead of a Markdown feedback file.",
      FEEDBACK_MD_SETUP_RECOMMENDATION
    );
  }

  if (!body.trim()) {
    return feedbackMdIssue(
      "failed",
      "/feedback.md was empty.",
      FEEDBACK_MD_SETUP_RECOMMENDATION
    );
  }

  if (!FEEDBACK_MD_REQUIRED_SECTION_REGEX.test(body)) {
    return feedbackMdIssue(
      "partial",
      "/feedback.md exists but has no “Where to send it” heading.",
      "Add a “Where to send it” section with the MCP tool, HTTP endpoint, email address, or issue tracker agents should use."
    );
  }

  if (mediaType !== FEEDBACK_MD_CONTENT_TYPE) {
    return feedbackMdIssue(
      "partial",
      `/feedback.md was served as ${mediaType ?? "an unknown content type"}.`,
      "Serve /feedback.md with Content-Type: text/markdown so agents can identify it reliably."
    );
  }

  return null;
}

async function readFeedbackMarkdown(response: Response): Promise<string> {
  if (!response.body) {
    return "";
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let body = "";
  try {
    while (body.length < FEEDBACK_MD_MAX_RESPONSE_CHARS) {
      const { done, value } = await reader.read();
      if (done) {
        body += decoder.decode();
        break;
      }
      body += decoder.decode(value, { stream: true });
    }
    return body.slice(0, FEEDBACK_MD_MAX_RESPONSE_CHARS);
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

export async function checkFeedbackMarkdown(
  targetUrl: string,
  signal?: AbortSignal
): Promise<AgentReadinessIssue | null> {
  const feedbackUrl = new URL(FEEDBACK_MD_PATH, targetUrl);
  try {
    const response = await fetchPublicUrl(
      feedbackUrl,
      {
        signal,
        headers: {
          Accept: `${FEEDBACK_MD_CONTENT_TYPE},text/plain;q=0.9`,
          "User-Agent": AGENT_READINESS_USER_AGENT,
        },
      },
      {
        maxRedirects: FEEDBACK_MD_MAX_REDIRECTS,
        timeoutMs: FEEDBACK_MD_REQUEST_TIMEOUT_MS,
      }
    );
    const body = await readFeedbackMarkdown(response);
    return evaluateFeedbackMarkdown(
      response.status,
      response.headers.get("content-type"),
      body
    );
  } catch {
    return evaluateFeedbackMarkdown(0, null, "");
  }
}
