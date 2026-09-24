import {
  GITHUB_MENTION_ITERATE_HINT,
  GITHUB_MENTION_REPLY_DIFF,
} from "@notra/ai/constants/github-mention";
import { GITHUB_MENTION_RATE_LIMIT } from "@notra/ai/constants/rate-limits";
import type {
  GitHubMentionChangedFile,
  GitHubMentionProposal,
  GitHubMentionSuggestion,
} from "@notra/ai/types/github-mention";
import {
  formatGitHubMentionSuggestionBlock,
  formatGitHubMentionSuggestionDiff,
} from "@notra/ai/utils/github-mention-suggestion";

const SHORT_SHA_LENGTH = 7;
const PULL_REQUEST_NUMBER_PATTERN = /\/pull\/(\d+)/;

function clipLine(line: string) {
  return line.length > GITHUB_MENTION_REPLY_DIFF.lineLengthLimit
    ? `${line.slice(0, GITHUB_MENTION_REPLY_DIFF.lineLengthLimit)}…`
    : line;
}

/** Keeps only added and removed lines; hunks are separated by a gap marker. */
function changedLinesFromPatch(patch: string) {
  const lines: string[] = [];
  for (const line of patch.split("\n")) {
    if (line.startsWith("@@")) {
      if (lines.length > 0) {
        lines.push("  ⋯");
      }
      continue;
    }
    if (line.startsWith("+") || line.startsWith("-")) {
      lines.push(clipLine(line));
    }
  }
  while (lines.at(-1) === "  ⋯") {
    lines.pop();
  }
  return lines;
}

function fenceFor(lines: readonly string[]) {
  return lines.some((line) => line.includes("```")) ? "````" : "```";
}

function inlineCode(value: string) {
  const longestRun = Math.max(
    0,
    ...[...value.matchAll(/`+/g)].map((match) => match[0].length)
  );
  const fence = "`".repeat(longestRun + 1);
  const padding = /^[` ]|[` ]$/.test(value) ? " " : "";
  return `${fence}${padding}${value}${padding}${fence}`;
}

export function buildGitHubMentionDiffSection(
  files: readonly GitHubMentionChangedFile[]
) {
  const shown = files.slice(0, GITHUB_MENTION_REPLY_DIFF.fileLimit);
  const blocks: string[] = [];
  let remaining = GITHUB_MENTION_REPLY_DIFF.totalLineLimit;
  let totalLines = 0;
  let omitted = false;

  for (const file of shown) {
    const label = files.length > 1 ? `${inlineCode(file.path)}\n` : "";
    if (!file.patch) {
      blocks.push(
        `${label || `${inlineCode(file.path)}\n`}_No text diff available._`
      );
      continue;
    }
    const all = changedLinesFromPatch(file.patch);
    const lines = all.slice(0, Math.max(remaining, 0));
    if (lines.length === 0) {
      omitted ||= all.length > 0;
      continue;
    }
    if (lines.length < all.length) {
      lines.push(`  ⋯ ${all.length - lines.length} more lines`);
    }
    remaining -= lines.length;
    totalLines += lines.length;
    const fence = fenceFor(lines);
    blocks.push(`${label}${fence}diff\n${lines.join("\n")}\n${fence}`);
  }

  if (blocks.length === 0) {
    return "";
  }
  const hiddenFiles = files.length - shown.length;
  if (hiddenFiles > 0) {
    blocks.push(`_…and ${hiddenFiles} more files._`);
  }
  if (omitted) {
    blocks.push("_…additional diff omitted (line limit reached)._");
  }
  const body = blocks.join("\n\n");
  if (totalLines <= GITHUB_MENTION_REPLY_DIFF.inlineLineLimit) {
    return body;
  }
  return `<details>\n<summary>Show what changed</summary>\n\n${body}\n\n</details>`;
}

export function buildGitHubMentionReplyFooter(params: {
  owner: string;
  repo: string;
  commitSha: string;
  files: readonly GitHubMentionChangedFile[];
  followUpPullRequestUrl: string | null;
}) {
  const shortSha = params.commitSha.slice(0, SHORT_SHA_LENGTH);
  const commitUrl = `https://github.com/${params.owner}/${params.repo}/commit/${params.commitSha}`;
  const parts: string[] = [];
  const followUpNumber = params.followUpPullRequestUrl?.match(
    PULL_REQUEST_NUMBER_PATTERN
  )?.[1];
  if (followUpNumber) {
    parts.push(`Draft PR #${followUpNumber}`);
  }
  parts.push(`[\`${shortSha}\`](${commitUrl})`);
  if (params.files.length === 1 && params.files[0]) {
    parts.push(inlineCode(params.files[0].path));
  } else if (params.files.length > 1) {
    parts.push(`${params.files.length} files`);
  }
  if (params.files.length > 0) {
    const additions = params.files.reduce((sum, f) => sum + f.additions, 0);
    const deletions = params.files.reduce((sum, f) => sum + f.deletions, 0);
    parts.push(`+${additions} −${deletions}`);
  }
  parts.push(GITHUB_MENTION_ITERATE_HINT);
  return `<sub>${parts.join(" · ")}</sub>`;
}

const HUNK_HEADER_PATTERN = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/;

/**
 * Where to anchor the reply under "Files changed": the added lines of the first
 * changed hunk, or the line right before a pure deletion. Line numbers refer to
 * the new file, which is what GitHub expects for `side: RIGHT`.
 */
export function findGitHubMentionReplyAnchor(
  files: readonly GitHubMentionChangedFile[],
  preferredPath: string | null
) {
  const ordered = [...files].sort(
    (a, b) =>
      Number(b.path === preferredPath) - Number(a.path === preferredPath)
  );
  for (const file of ordered) {
    if (!file.patch) {
      continue;
    }
    let newLine = 0;
    let firstAdded: number | null = null;
    let lastAdded: number | null = null;
    let deletionAt: number | null = null;
    for (const line of file.patch.split("\n")) {
      const header = line.match(HUNK_HEADER_PATTERN);
      if (header) {
        if (firstAdded !== null) {
          break;
        }
        newLine = Number(header[1]);
        continue;
      }
      if (line.startsWith("+")) {
        firstAdded ??= newLine;
        lastAdded = newLine;
        newLine += 1;
      } else if (line.startsWith("-")) {
        // The line before the removed text always exists; the one after may not
        // (deletion at the end of the file).
        deletionAt ??= Math.max(newLine - 1, 1);
      } else if (line.startsWith(" ")) {
        newLine += 1;
      }
    }
    if (firstAdded !== null && lastAdded !== null) {
      return { path: file.path, startLine: firstAdded, line: lastAdded };
    }
    if (deletionAt !== null) {
      return { path: file.path, startLine: null, line: deletionAt };
    }
  }
  return null;
}

/** A closing offer ("Want me to ...?") reads better below the diff than above it. */
function splitFollowUpQuestion(text: string) {
  const paragraphs = text.trim().split(/\n{2,}/);
  const last = paragraphs.at(-1) ?? "";
  if (paragraphs.length < 2 || !last.trimEnd().endsWith("?")) {
    return { summary: text.trim(), followUpQuestion: "" };
  }
  return {
    summary: paragraphs.slice(0, -1).join("\n\n"),
    followUpQuestion: last,
  };
}

/** The agent writes the prose; the diff and the footer come from the real commit. */
export function buildGitHubMentionReply(params: {
  text: string;
  owner: string;
  repo: string;
  commitSha: string | null;
  files: readonly GitHubMentionChangedFile[];
  followUpPullRequestUrl: string | null;
}) {
  if (!params.commitSha) {
    return params.text;
  }
  const { summary, followUpQuestion } = splitFollowUpQuestion(params.text);
  return [
    summary,
    buildGitHubMentionDiffSection(params.files),
    followUpQuestion,
    buildGitHubMentionReplyFooter({
      owner: params.owner,
      repo: params.repo,
      commitSha: params.commitSha,
      files: params.files,
      followUpPullRequestUrl: params.followUpPullRequestUrl,
    }),
  ]
    .filter(Boolean)
    .join("\n\n");
}

function proposalFooter(
  proposals: readonly GitHubMentionProposal[],
  howToApply: string
) {
  const [first] = proposals;
  const where =
    proposals.length === 1 && first
      ? inlineCode(first.path)
      : `${proposals.length} files`;
  return `<sub>Suggestion · ${where} · ${howToApply} · ${GITHUB_MENTION_ITERATE_HINT}</sub>`;
}

/**
 * Reply for a proposed edit. `inline` puts the suggestion into the reply
 * itself (a review thread on exactly those lines); without it the suggestions
 * travel as separate review comments and this is the text above them.
 */
export function buildGitHubMentionProposalReply(params: {
  text: string;
  proposals: readonly GitHubMentionProposal[];
  inline: GitHubMentionSuggestion | null;
}) {
  const { summary, followUpQuestion } = splitFollowUpQuestion(params.text);
  return [
    summary,
    params.inline
      ? formatGitHubMentionSuggestionBlock(params.inline.replacement)
      : "",
    followUpQuestion,
    proposalFooter(params.proposals, "commit it from the suggestion to apply"),
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** Same proposal as plain diffs, for when GitHub refuses the suggestion comments. */
export function buildGitHubMentionProposalFallbackReply(params: {
  text: string;
  proposals: readonly GitHubMentionProposal[];
}) {
  const { summary, followUpQuestion } = splitFollowUpQuestion(params.text);
  const blocks = params.proposals.flatMap((proposal) =>
    proposal.suggestions.map(
      (suggestion) =>
        `${params.proposals.length > 1 ? `${inlineCode(proposal.path)}\n` : ""}${formatGitHubMentionSuggestionDiff(suggestion)}`
    )
  );
  return [
    summary,
    ...blocks,
    followUpQuestion,
    proposalFooter(
      params.proposals,
      "tell me to apply it and I will commit it"
    ),
  ]
    .filter(Boolean)
    .join("\n\n");
}

/**
 * Says the limit is temporary and when it lifts, so nobody reads it as the bot
 * being broken or out of credits.
 */
export function buildGitHubMentionRateLimitReply(resetAt: number) {
  const minutes = Math.max(1, Math.ceil((resetAt - Date.now()) / 60_000));
  const wait = minutes === 1 ? "a minute" : `about ${minutes} minutes`;
  return `I have handled a lot of mentions for this organization in the last ${GITHUB_MENTION_RATE_LIMIT.windowLabel}, so I paused here rather than let that run away. Mention me again in ${wait} and I will pick this up.`;
}
