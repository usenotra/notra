import {
  GITHUB_MENTION_DEFAULT_APP_SLUG,
  GITHUB_MENTION_SEPARATE_PR_PATTERNS,
  GITHUB_MENTION_THREAD_CONTEXT,
} from "@notra/ai/constants/github-mention";
import type { GitHubMentionThreadComment } from "@notra/ai/types/github-mention";

const MENTION_HANDLE_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i;
const FENCED_CODE_PATTERN = /(?:```|~~~)[\s\S]*?(?:```|~~~|$)/g;
const INLINE_CODE_PATTERN = /`[^`\n]*`/g;
const QUOTED_LINE_PATTERN = /^[ \t]*>.*$/gm;
// GitHub hides everything after an unterminated `<!--`, so that counts too.
const HTML_COMMENT_PATTERN = /<!--[\s\S]*?(?:-->|$)/g;
// A mention must not be glued to a preceding word, so `jan@notra.dev` or
// `path/@notra` do not count.
// `@org/team` is a team mention, so a handle followed by a slash is skipped too.
const MENTION_PATTERN =
  /(?<![\w.@/-])@([a-z0-9][a-z0-9-]*)(?:\[bot\])?(?![\w/-])/gi;
// People rarely type the exact App slug. Any handle from the Notra family
// counts: @notra, @notra-ai, @notrabot, @notra-dev-acme, ...
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

/**
 * One pass is not enough: removing the inner comment of `<!-<!-- x -->- @notra -->`
 * leaves a new comment behind. Repeat until nothing changes.
 */
function removeHtmlComments(body: string) {
  let current = body;
  let previous = "";
  while (current !== previous) {
    previous = current;
    current = current.replace(HTML_COMMENT_PATTERN, "");
  }
  return current;
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
  return NOTRA_FAMILY_HANDLE_PATTERN.test(normalizeHandle(handle));
}

export function isGitHubBotSender(sender: { login: string; type?: string }) {
  return (
    sender.type === "Bot" ||
    sender.login.toLowerCase().endsWith("[bot]") ||
    getGitHubMentionAppHandles().includes(normalizeHandle(sender.login))
  );
}

export function wantsSeparatePullRequest(body: string) {
  return GITHUB_MENTION_SEPARATE_PR_PATTERNS.some((pattern) =>
    pattern.test(body)
  );
}

const REPLY_DECORATION_PATTERNS = [
  /<details>[\s\S]*?<\/details>/g,
  /(`{3,})diff\n[\s\S]*?\n\1/g,
  /<sub>[\s\S]*?<\/sub>/g,
] as const;

function stripReplyDecoration(body: string) {
  let text = body;
  for (const pattern of REPLY_DECORATION_PATTERNS) {
    text = text.replace(pattern, "");
  }
  return text.replace(/\n{3,}/g, "\n\n");
}

/**
 * The conversation before the mention, so "yes, do that" has something to
 * refer to. Keeps repository members and Notra itself, drops other bots (review
 * bots are long and irrelevant) and outside commenters, and strips the diff and
 * footer from Notra's replies.
 */
export function buildGitHubMentionThread(params: {
  comments: readonly GitHubMentionThreadComment[];
  current: { id: number; kind: "issue" | "review"; threadRootId?: number };
}) {
  const appHandles = new Set(getGitHubMentionAppHandles());
  const isNotraComment = (comment: GitHubMentionThreadComment) =>
    comment.authorIsBot && appHandles.has(normalizeHandle(comment.authorLogin));
  const thread: Array<{ author: string; body: string }> = [];
  // A review mention only needs its own thread. An issue mention also needs the
  // threads Notra replied in (its inline replies live there), but not every
  // unrelated review discussion on a busy pull request.
  const reviewRootIds =
    params.current.kind === "review" && params.current.threadRootId != null
      ? new Set([params.current.threadRootId])
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
    // Other bots are noise, and people without a role on the repository are
    // not part of the conversation the commenter is steering.
    if (!isNotra && (comment.authorIsBot || !comment.authorIsTrusted)) {
      continue;
    }
    const body = (
      isNotra ? stripReplyDecoration(comment.body) : comment.body
    ).trim();
    if (!body) {
      continue;
    }
    const author = isNotra ? "Notra (you)" : `@${comment.authorLogin}`;
    thread.push({
      author:
        comment.kind === "review" ? `${author}, in a review thread` : author,
      body:
        body.length > GITHUB_MENTION_THREAD_CONTEXT.commentLengthLimit
          ? `${body.slice(0, GITHUB_MENTION_THREAD_CONTEXT.commentLengthLimit)}…`
          : body,
    });
  }
  return thread.slice(-GITHUB_MENTION_THREAD_CONTEXT.commentLimit);
}
