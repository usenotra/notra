import type { ReactNode } from "react";

import type { GitHubIssue, GitHubPR, GitHubUser } from "./github";

export interface ContributorsSectionHeaderProps {
  title: string;
  description: string;
}

export interface ContributorsGridProps {
  contributors: GitHubUser[];
}

export interface ActivityCardProps {
  title: string;
  description: string;
  viewAllHref: string;
  viewAllLabel: string;
  children: ReactNode;
}

export interface ActivityRowProps {
  href: string;
  title: string;
  number: number;
  badgeLabel: string;
  badgeClassName: string;
  authorLogin: string;
  authorAvatarUrl: string;
  createdAt: string;
  isLast: boolean;
}

export interface IssueListProps {
  issues: GitHubIssue[];
}

export interface PullRequestListProps {
  prs: GitHubPR[];
}

export interface ViewAllLinkProps {
  href: string;
  children: string;
}
