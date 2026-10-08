import type { AgentReadinessIssue } from "@notra/db/types/agent-readiness";

import {
  AGENT_READINESS_GREAT_THRESHOLD,
  AGENT_READINESS_NEEDS_IMPROVEMENT_THRESHOLD,
  AGENT_READINESS_PROMPT_WORK_RULES,
  AGENT_READINESS_RESULT_ORDER,
  AGENT_READINESS_STALE_RUNNING_MS,
} from "../constants/agent-readiness";
import type {
  AgentReadinessChangedCheck,
  AgentReadinessComparison,
  AgentReadinessIssueChange,
  AgentReadinessIssueGroups,
  AgentReadinessRunningScan,
  AgentReadinessScoreBand,
} from "../types/agent-readiness";
import { areWebsiteUrlsEquivalent, stripWebsiteProtocol } from "./geo-website";

export function canReuseAgentReadinessScan(
  running: AgentReadinessRunningScan,
  targetUrl: string,
  now = Date.now()
): boolean {
  return (
    areWebsiteUrlsEquivalent(running.targetUrl, targetUrl) &&
    now - running.createdAt.getTime() < AGENT_READINESS_STALE_RUNNING_MS
  );
}

function sortOpenIssues(
  left: AgentReadinessIssue,
  right: AgentReadinessIssue
): number {
  const byResult =
    AGENT_READINESS_RESULT_ORDER[left.result] -
    AGENT_READINESS_RESULT_ORDER[right.result];
  if (byResult !== 0) {
    return byResult;
  }
  return left.name.localeCompare(right.name);
}

/** Splits open checks into action groups, not scan-status buckets. */
export function groupAgentReadinessIssues(
  issues: AgentReadinessIssue[]
): AgentReadinessIssueGroups {
  return {
    mustDo: issues
      .filter((issue) => issue.tier === "essential")
      .sort(sortOpenIssues),
    shouldDo: issues
      .filter((issue) => issue.tier !== "essential")
      .sort(sortOpenIssues),
  };
}

export function toAgentReadinessApiErrorMessage(
  code: string | null | undefined,
  targetUrl: string,
  status: number
): string {
  const domain = stripWebsiteProtocol(targetUrl);

  if (code === "invalid_url" || status === 400) {
    return `We couldn't reach ${domain}. Make sure the website URL is public and correct, then try again.`;
  }
  if (code === "rate_limit_exceeded" || status === 429) {
    return "Too many scans are running right now. Wait a minute and try again.";
  }
  return "The scan service is temporarily unavailable. Please try again shortly.";
}

export function getAgentReadinessScanErrorMessage(
  errorMessage: string | null | undefined,
  targetUrl: string
): string {
  if (!errorMessage) {
    return "The last scan failed. Try running it again.";
  }
  if (/scan service returned HTTP 400/i.test(errorMessage)) {
    return toAgentReadinessApiErrorMessage("invalid_url", targetUrl, 400);
  }
  return errorMessage;
}

function resultInstruction(issue: AgentReadinessIssue): string {
  return issue.result === "failed"
    ? "failed — needs a full implementation"
    : "partial — some pieces exist; close the remaining gap";
}

function describeIssue(issue: AgentReadinessIssue, index: number): string {
  const lines = [`${index + 1}. ${issue.name} (${resultInstruction(issue)})`];
  if (issue.details) {
    lines.push(`   Evidence: ${issue.details}`);
  }
  if (issue.recommendation) {
    lines.push(`   Recommended fix: ${issue.recommendation}`);
  }
  return lines.join("\n");
}

function formatIssueSection(
  heading: string,
  intro: string,
  issues: AgentReadinessIssue[]
): string[] {
  if (issues.length === 0) {
    return [];
  }
  return [
    `## ${heading}`,
    intro,
    "",
    ...issues.map((issue, index) => describeIssue(issue, index)),
    "",
  ];
}

/** A paste-ready prompt for a coding agent to implement one flagged fix. */
export function buildAgentReadinessFixPrompt(
  targetUrl: string,
  issue: AgentReadinessIssue
): string {
  const priority =
    issue.tier === "essential"
      ? "Must do (essential)"
      : "Should do (recommended)";
  const lines = [
    `You are a coding agent working in this repository. Notra flagged an agent-readiness gap on ${targetUrl}.`,
    "",
    `Priority: ${priority}`,
    `Status: ${resultInstruction(issue)}`,
    `Check: ${issue.name}`,
  ];
  if (issue.details) {
    lines.push(`Evidence: ${issue.details}`);
  }
  if (issue.recommendation) {
    lines.push(`Recommended fix: ${issue.recommendation}`);
  }
  lines.push(
    "",
    "Implement this fix only. Stay scoped. After you are done, note the files you changed."
  );
  return lines.join("\n");
}

/** A paste-ready prompt covering the open backlog, grouped by priority. */
export function buildAgentReadinessAllFixesPrompt(
  targetUrl: string,
  issues: AgentReadinessIssue[]
): string {
  const groups = groupAgentReadinessIssues(issues);

  return [
    `# Agent-readiness fixes for ${targetUrl}`,
    "",
    "You are a coding agent working in this repository. Notra scanned this site for how well AI agents can discover, understand, and use it. Treat the sections below as a prioritized backlog, not a flat list.",
    "",
    "## How to work",
    ...AGENT_READINESS_PROMPT_WORK_RULES.map(
      (rule, index) => `${index + 1}. ${rule}`
    ),
    "",
    ...formatIssueSection(
      "Must do",
      "These are essential. Until they pass, the site is not reliably agent-friendly.",
      groups.mustDo
    ),
    ...formatIssueSection(
      "Should do",
      "Recommended improvements. Do these only after Must do is done.",
      groups.shouldDo
    ),
  ]
    .join("\n")
    .trimEnd();
}

/** Maps a score onto the Speed Insights-style band. */
export function getAgentReadinessScoreBand(
  score: number
): AgentReadinessScoreBand {
  if (score >= AGENT_READINESS_GREAT_THRESHOLD) {
    return { key: "great" };
  }
  if (score >= AGENT_READINESS_NEEDS_IMPROVEMENT_THRESHOLD) {
    return { key: "needs-improvement" };
  }
  return { key: "poor" };
}

function toChangedCheck(
  issue: AgentReadinessIssue,
  previousResult: AgentReadinessIssue["result"] | null,
  result: AgentReadinessIssue["result"] | null
): AgentReadinessChangedCheck {
  return {
    id: issue.id,
    name: issue.name,
    tier: issue.tier,
    previousResult,
    result,
  };
}

/** Diffs the open checks of two completed scans by check id. */
export function compareAgentReadinessIssues(
  previous: AgentReadinessIssue[],
  current: AgentReadinessIssue[]
): Omit<AgentReadinessComparison, "previousScore" | "previousScannedAt"> {
  const previousById = new Map(previous.map((issue) => [issue.id, issue]));
  const currentIds = new Set(current.map((issue) => issue.id));
  const added: AgentReadinessChangedCheck[] = [];
  const improved: AgentReadinessChangedCheck[] = [];
  const worsened: AgentReadinessChangedCheck[] = [];

  for (const issue of current) {
    const before = previousById.get(issue.id);
    if (!before) {
      added.push(toChangedCheck(issue, null, issue.result));
    } else if (before.result === "failed" && issue.result === "partial") {
      improved.push(toChangedCheck(issue, before.result, issue.result));
    } else if (before.result === "partial" && issue.result === "failed") {
      worsened.push(toChangedCheck(issue, before.result, issue.result));
    }
  }

  return {
    resolved: previous
      .filter((issue) => !currentIds.has(issue.id))
      .map((issue) => toChangedCheck(issue, issue.result, null)),
    added,
    improved,
    worsened,
  };
}

/** Check id → how it moved since the previous scan, for row badges. */
export function getAgentReadinessIssueChanges(
  comparison: AgentReadinessComparison | null
): Map<string, AgentReadinessIssueChange> {
  const changes = new Map<string, AgentReadinessIssueChange>();
  for (const check of comparison?.added ?? []) {
    changes.set(check.id, "added");
  }
  for (const check of comparison?.improved ?? []) {
    changes.set(check.id, "improved");
  }
  for (const check of comparison?.worsened ?? []) {
    changes.set(check.id, "worsened");
  }
  return changes;
}
