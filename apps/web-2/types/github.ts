export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
  contributions: number;
  type: string;
}

export interface GitHubLabel {
  name: string;
  color: string;
}

interface GitHubUserRef {
  login: string;
  avatar_url: string;
  html_url: string;
}

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  html_url: string;
  state: string;
  user: GitHubUserRef;
  created_at: string;
  labels: GitHubLabel[];
  pull_request?: { url: string };
}

export interface GitHubPR {
  id: number;
  number: number;
  title: string;
  html_url: string;
  state: string;
  user: GitHubUserRef;
  created_at: string;
  draft: boolean;
}

export interface GitHubRepo {
  name: string;
  full_name: string;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  language: string | null;
  description: string | null;
  private: boolean;
}

export interface GitHubSearchCount {
  total_count: number;
}

export interface GitHubSearchPRs extends GitHubSearchCount {
  items: { user: GitHubUserRef }[];
}

interface ContributorsStats {
  totalStars: number;
  totalForks: number;
  totalIssues: number | null;
  totalPullRequests: number | null;
  totalContributors: number;
}

export interface ContributorsData {
  repo: GitHubRepo | null;
  contributors: GitHubUser[];
  issues: GitHubIssue[];
  prs: GitHubPR[];
  notraAiPrCount: number;
  stats: ContributorsStats;
}

export interface IssueTypeBadge {
  type: string;
  className: string;
}

export interface OgContributor extends GitHubUser {
  displayLogin: string;
}
