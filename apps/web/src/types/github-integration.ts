export interface GithubHeadline {
  pre: string;
  highlight: string;
  secondLinePre: string;
  accent: string;
}

interface GithubPullRequestTab {
  label: string;
  count: string;
  active?: boolean;
}

export interface GithubPullRequest {
  number: string;
  title: string;
  author: string;
  commitCount: string;
  baseBranch: string;
  headBranch: string;
  comment: string;
  commentAge: string;
  mergeCommit: string;
  mergeAge: string;
  tabs: GithubPullRequestTab[];
}

export interface GithubFeature {
  title: string;
  description: string;
}
