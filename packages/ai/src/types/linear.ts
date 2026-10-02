import type { LinearDocument } from "@linear/sdk";

export type LinearIssuesQueryVariables = Pick<
  LinearDocument.IssuesQueryVariables,
  "filter" | "first" | "after" | "orderBy"
>;

export interface LinearIssuesQueryResult {
  issues: {
    nodes: (Pick<
      LinearDocument.Issue,
      | "id"
      | "identifier"
      | "title"
      | "description"
      | "priority"
      | "priorityLabel"
      | "url"
    > & {
      createdAt: string;
      updatedAt: string;
      completedAt: string | null;
      state: Pick<LinearDocument.WorkflowState, "name" | "type"> | null;
      assignee: Pick<LinearDocument.User, "name" | "displayName"> | null;
      labels: { nodes: Pick<LinearDocument.IssueLabel, "name">[] };
    })[];
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  };
}
