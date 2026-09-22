import type {
  ContributorsData,
  GitHubIssue,
  GitHubLabel,
  GitHubPR,
  GitHubRepo,
  GitHubSearchCount,
  GitHubSearchPRs,
  GitHubUser,
  IssueTypeBadge,
} from "~types/github";

const GITHUB_OWNER = "usenotra";
const GITHUB_REPO = "notra";
export const GITHUB_REPO_URL = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}`;
const NOTRA_AI_BOT_AUTHOR = "app/notra-ai";
const NOTRA_AI_BOT_ID = -1;

const GITHUB_CACHE_TAG = "github-contributors";

const REVALIDATE_SECONDS = 3600;

const EMPTY_DATA: ContributorsData = {
  repo: null,
  contributors: [],
  issues: [],
  prs: [],
  notraAiPrCount: 0,
  stats: {
    totalStars: 0,
    totalForks: 0,
    totalIssues: null,
    totalPullRequests: null,
    totalContributors: 0,
  },
};

function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": `${GITHUB_OWNER}-${GITHUB_REPO}-site`,
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: buildHeaders(),
      next: {
        revalidate: REVALIDATE_SECONDS,
        tags: [GITHUB_CACHE_TAG],
      },
    });
    if (!res.ok) {
      return null;
    }
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function byNewest<T extends { created_at: string }>(a: T, b: T): number {
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}

export async function fetchContributorsData(): Promise<ContributorsData> {
  const base = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}`;

  const search = "https://api.github.com/search/issues";
  const repoQuery = `repo:${GITHUB_OWNER}/${GITHUB_REPO}+state:open`;

  const [
    repo,
    contributorsRaw,
    issuesRaw,
    prsRaw,
    issueSearch,
    prSearch,
    notraAiSearch,
  ] = await Promise.all([
    fetchJson<GitHubRepo>(base),
    fetchJson<GitHubUser[]>(`${base}/contributors?per_page=100`),
    fetchJson<GitHubIssue[]>(
      `${base}/issues?state=open&per_page=20&sort=created&direction=desc`
    ),
    fetchJson<GitHubPR[]>(
      `${base}/pulls?state=open&per_page=5&sort=created&direction=desc`
    ),
    fetchJson<GitHubSearchCount>(
      `${search}?q=${repoQuery}+is:issue&per_page=1`
    ),
    fetchJson<GitHubSearchCount>(`${search}?q=${repoQuery}+is:pr&per_page=1`),
    fetchJson<GitHubSearchPRs>(
      `${search}?q=repo:${GITHUB_OWNER}/${GITHUB_REPO}+is:pr+author:${NOTRA_AI_BOT_AUTHOR}&per_page=10&sort=created&order=desc`
    ),
    fetchJson<GitHubSearchCount>(
      `${search}?q=repo:${GITHUB_OWNER}/${GITHUB_REPO}+is:pr+is:merged+author:${NOTRA_AI_BOT_AUTHOR}&per_page=1`
    ),
  ]);

  if (!(repo || contributorsRaw || issuesRaw || prsRaw)) {
    return EMPTY_DATA;
  }

  const contributors = (contributorsRaw ?? []).filter(
    (c) => c.type === "User" && !c.login.endsWith("[bot]")
  );

  const issues = (issuesRaw ?? [])
    .filter((issue) => !issue.pull_request)
    .sort(byNewest)
    .slice(0, 5);

  const prs = (prsRaw ?? []).slice().sort(byNewest).slice(0, 5);

  const notraAiUser = notraAiSearch?.items[0]?.user;
  const notraAiPrCount = notraAiSearch?.total_count ?? 0;
  const notraAiContributor: GitHubUser[] =
    notraAiUser && notraAiPrCount > 0
      ? [
          {
            ...notraAiUser,
            id: NOTRA_AI_BOT_ID,
            contributions: notraAiPrCount,
            type: "Bot",
          },
        ]
      : [];

  return {
    repo,
    contributors: [...notraAiContributor, ...contributors]
      .sort((a, b) => b.contributions - a.contributions)
      .slice(0, 24),
    issues,
    prs,
    notraAiPrCount,
    stats: {
      totalStars: repo?.stargazers_count ?? 0,
      totalForks: repo?.forks_count ?? 0,
      totalIssues: issueSearch?.total_count ?? null,
      totalPullRequests: prSearch?.total_count ?? null,
      totalContributors: contributors.length,
    },
  };
}

const TRAILING_ZERO_DECIMAL = /\.0$/;

export function formatContributionCount(count: number): string {
  if (count >= 1000) {
    const thousands = count / 1000;
    return `${thousands.toFixed(thousands >= 10 ? 0 : 1).replace(TRAILING_ZERO_DECIMAL, "")}k`;
  }
  return count.toString();
}

export function formatGitHubDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function getIssueTypeFromLabels(labels: GitHubLabel[]): IssueTypeBadge {
  const lowered = labels.map((l) => l.name.toLowerCase());
  if (lowered.some((name) => name.includes("bug"))) {
    return {
      type: "Bug",
      className: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
    };
  }
  if (
    lowered.some(
      (name) => name.includes("feature") || name.includes("enhancement")
    )
  ) {
    return {
      type: "Feature",
      className:
        "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
    };
  }
  if (lowered.some((name) => name.includes("doc"))) {
    return {
      type: "Docs",
      className:
        "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
    };
  }
  return {
    type: "Issue",
    className:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300",
  };
}

export function formatNotraAiPrCountLabel(prCount: number): string {
  return `${prCount} pull request${prCount === 1 ? "" : "s"}`;
}

export function formatViewAllLabel(total: number | null): string {
  return total === null ? "View all" : `View all (${total})`;
}
