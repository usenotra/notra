import {
  GITHUB_MENTION_DEFAULT_APP_SLUG,
  GITHUB_MENTION_SEPARATE_PR_PATTERNS,
  GITHUB_MENTION_THREAD_CONTEXT,
} from "@notra/ai/constants/github-mention";
import type { GitHubMentionThreadComment } from "@notra/ai/types/github-mention";
import { removeHtmlComments } from "@notra/ai/utils/remove-html-comments";

const MENTION_HANDLE_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i;
const FENCED_CODE_PATTERN = /(?:```|~~~)[\s\S]*?(?:```|~~~|$)/g;
const INLINE_CODE_PATTERN = /`[^`\n]*`/g;
const QUOTED_LINE_PATTERN = /^[ \t]*>.*$/gm;
// A mention must not be glued to a preceding word, so `jan@notra.dev` or
// `path/@notra` do not count.
// `@org/team` is a team mention, so a handle followed by a slash is skipped too.
const MENTION_PATTERN =
  /(?<![\w.@/-])@([a-z0-9][a-z0-9-]*)(?:\[bot\])?(?![\w/-])/gi;
// People rarely type the exact App slug. @usenotra and any handle from the
// Notra family count: @notra, @notra-ai, @notrabot, @notra-dev-acme, ...
const NOTRA_FAMILY_HANDLE_PATTERN = /^notra(?:-[a-z0-9-]*|ai|bot|app)?$/;

function normalizeHandle(value: string) {
  return value
    .trim()
    .replace(/\[bot\]$/i, "")
    .toLowerCase();
}

/**
 * The configured App slug. Mentions also accept the Notra handle family (see
 * `isNotraMentionHandle`); the sender gate in `github-mention-auth` is what
 * keeps a loose mention match from running for strangers.
 */
export function getGitHubMentionAppHandles() {
  const slug =
    process.env.GITHUB_APP_SLUG?.trim() ||
    process.env.GITHUB_APP_NAME?.trim() ||
    GITHUB_MENTION_DEFAULT_APP_SLUG;
  const handle = normalizeHandle(slug);
  return MENTION_HANDLE_PATTERN.test(handle) ? [handle] : [];
}

function stripNonMentionText(body: string) {
  return removeHtmlComments(body)
    .replace(FENCED_CODE_PATTERN, "")
    .replace(INLINE_CODE_PATTERN, "")
    .replace(QUOTED_LINE_PATTERN, "");
}

export function commentMentionsNotra(
  body: string,
  handles: readonly string[] = getGitHubMentionAppHandles()
) {
  const configured = new Set(handles);
  const mentioned = new Set(
    [...stripNonMentionText(body).matchAll(MENTION_PATTERN)].map((match) =>
      normalizeHandle(match[1] ?? "")
    )
  );
  return [...mentioned].some(
    (handle) => configured.has(handle) || isNotraMentionHandle(handle)
  );
}

export function isNotraMentionHandle(handle: string) {
  const normalized = normalizeHandle(handle);
  return (
    normalized === "usenotra" || NOTRA_FAMILY_HANDLE_PATTERN.test(normalized)
  );
}

export function isGitHubBotSender(sender: { login: string; type?: string }) {
  return sender.type === "Bot" || sender.login.toLowerCase().endsWith("[bot]");
}

export function wantsSeparatePullRequest(body: string) {
  const text = stripNonMentionText(body);
  return GITHUB_MENTION_SEPARATE_PR_PATTERNS.some((pattern) =>
    [...text.matchAll(pattern)].some((match) => {
      const prefix = text.slice(
        Math.max(0, (match.index ?? 0) - 20),
        match.index
      );
      return !/\b(?:do not|don't|never)\s*$/i.test(prefix);
    })
  );
}

const REPLY_DECORATION_PATTERNS = [
  /<details>[\s\S]*?<\/details>/g,
  /<sub>[\s\S]*?<\/sub>/g,
] as const;
const REPLY_DIFF_PATTERN = /(`{3,})diff\n[\s\S]*?\n\1/g;
const COMMITTED_REPLY_NOTE = "(This reply came with a commit of the change.)";
const COMMITTED_REPLY_FOOTER_PATTERN =
  /<sub>[\s\S]*?github\.com\/[^/\s]+\/[^/\s]+\/commit\/[a-f\d]+[\s\S]*?<\/sub>/i;

/**
 * The diff and the commit footer say that a reply came with a commit. Both are
 * dropped, so a short note keeps that fact: prose such as "Should I rename the
 * title too?" otherwise reads as if the request were still open.
 */
function stripReplyDecoration(body: string) {
  const committed = COMMITTED_REPLY_FOOTER_PATTERN.test(body);
  let text = committed ? body.replace(REPLY_DIFF_PATTERN, "") : body;
  for (const pattern of REPLY_DECORATION_PATTERNS) {
    text = text.replace(pattern, "");
  }
  text = text.replace(/\n{3,}/g, "\n\n").trim();
  return committed && text ? `${text}\n\n${COMMITTED_REPLY_NOTE}` : text;
}

/**
 * Review bots wrap prompts for coding agents and long analysis in <details>,
 * and hide metadata in HTML comments. Only the finding itself is context.
 */
function stripBotDecoration(body: string) {
  let text = removeHtmlComments(body);
  for (const pattern of REPLY_DECORATION_PATTERNS) {
    text = text.replace(pattern, "");
  }
  return text.replace(/\n{3,}/g, "\n\n");
}

/**
 * The conversation before the mention, so "yes, do that" has something to
 * refer to. Keeps repository members and Notra itself, drops outside commenters
 * and other bots (review bots are long and irrelevant), and strips the diff and
 * footer from Notra's replies. One exception: a mention written in a review
 * thread keeps that thread's bot comments, because "@notra fix this" under a
 * Greptile finding is about the finding.
 */
export function buildGitHubMentionThread(params: {
  comments: readonly GitHubMentionThreadComment[];
  current: { id: number; kind: "issue" | "review"; threadRootId?: number };
}) {
  const appHandles = new Set(getGitHubMentionAppHandles());
  const isNotraComment = (comment: GitHubMentionThreadComment) =>
    comment.authorIsBot && appHandles.has(normalizeHandle(comment.authorLogin));
  const isBotInMentionThread = (comment: GitHubMentionThreadComment) =>
    comment.authorIsBot &&
    comment.kind === "review" &&
    params.current.kind === "review" &&
    comment.threadRootId === params.current.threadRootId;
  const thread: Array<{ author: string; body: string }> = [];
  let mentionThreadRoot: { author: string; body: string } | null = null;
  // A review mention needs its own thread and the threads Notra started: its
  // inline replies to conversation comments live there, and without them those
  // requests look unanswered. An issue mention needs every thread Notra replied
  // in, but not each unrelated review discussion on a busy pull request.
  const reviewRootIds =
    params.current.kind === "review" && params.current.threadRootId != null
      ? new Set([
          params.current.threadRootId,
          ...params.comments
            .filter(
              (comment) =>
                comment.kind === "review" &&
                comment.threadRootId === comment.id &&
                isNotraComment(comment)
            )
            .map((comment) => comment.id),
        ])
      : new Set(
          params.comments
            .filter(
              (comment) => comment.kind === "review" && isNotraComment(comment)
            )
            .map((comment) => comment.threadRootId)
        );
  const ordered = [...params.comments]
    .filter(
      (comment) =>
        comment.kind !== "review" || reviewRootIds.has(comment.threadRootId)
    )
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  for (const comment of ordered) {
    if (
      comment.id === params.current.id &&
      comment.kind === params.current.kind
    ) {
      continue;
    }
    const isNotra = isNotraComment(comment);
    const isReviewBot = !isNotra && isBotInMentionThread(comment);
    // Other bots are noise, and people without a role on the repository are
    // not part of the conversation the commenter is steering.
    if (
      !(isNotra || isReviewBot) &&
      (comment.authorIsBot || !comment.authorIsTrusted)
    ) {
      continue;
    }
    let body = comment.body;
    if (isNotra) {
      body = stripReplyDecoration(body);
    } else if (isReviewBot) {
      body = stripBotDecoration(body);
    }
    body = body.trim();
    if (!body) {
      continue;
    }
    let author = `@${comment.authorLogin}`;
    if (isNotra) {
      author = "Notra (you)";
    } else if (isReviewBot) {
      author = `${author} (review bot)`;
    }
    const entry = {
      author:
        comment.kind === "review" ? `${author}, in a review thread` : author,
      body:
        body.length > GITHUB_MENTION_THREAD_CONTEXT.commentLengthLimit
          ? `${body.slice(0, GITHUB_MENTION_THREAD_CONTEXT.commentLengthLimit)}…`
          : body,
    };
    if (
      comment.id === params.current.threadRootId &&
      comment.kind === "review"
    ) {
      mentionThreadRoot = entry;
    }
    thread.push(entry);
  }
  const recent = thread.slice(-GITHUB_MENTION_THREAD_CONTEXT.commentLimit);
  // The comment a review thread started with is what every reply is about, so
  // a long thread must not push it out.
  if (mentionThreadRoot && !recent.includes(mentionThreadRoot)) {
    return [mentionThreadRoot, ...recent.slice(1)];
  }
  return recent;
}
