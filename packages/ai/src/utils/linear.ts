import { LinearClient, parseLinearError } from "@linear/sdk";
import { LINEAR_ISSUES_WITH_RELATIONS_QUERY } from "@notra/ai/constants/linear";
import type {
  LinearIssuesQueryResult,
  LinearIssuesQueryVariables,
} from "@notra/ai/types/linear";

export function createLinearClient(accessToken: string): LinearClient {
  return new LinearClient({ accessToken });
}

export async function getLinearIssues(
  client: LinearClient,
  variables: LinearIssuesQueryVariables
) {
  // SDK issue relation getters each fetch separately, even for shared states/users.
  const { issues } = await client.client
    .request<LinearIssuesQueryResult, LinearIssuesQueryVariables>(
      LINEAR_ISSUES_WITH_RELATIONS_QUERY,
      variables
    )
    .catch((error) => {
      throw parseLinearError(error);
    });

  return {
    issues: issues.nodes.map((issue) => ({
      id: issue.id,
      identifier: issue.identifier,
      title: issue.title,
      description: issue.description ? issue.description.slice(0, 500) : null,
      state: issue.state?.name ?? null,
      stateType: issue.state?.type ?? null,
      priority: issue.priority,
      priorityLabel: issue.priorityLabel,
      assignee: issue.assignee?.name ?? issue.assignee?.displayName ?? null,
      labels: issue.labels.nodes.map((label) => label.name),
      createdAt: new Date(issue.createdAt),
      updatedAt: new Date(issue.updatedAt),
      completedAt: issue.completedAt ? new Date(issue.completedAt) : null,
      url: issue.url,
    })),
    pagination: {
      hasNextPage: issues.pageInfo.hasNextPage,
      endCursor: issues.pageInfo.endCursor ?? null,
    },
  };
}
