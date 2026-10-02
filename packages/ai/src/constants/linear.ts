export const LINEAR_ISSUES_WITH_RELATIONS_QUERY = `
  query IssuesWithRelations(
    $filter: IssueFilter
    $first: Int
    $after: String
    $orderBy: PaginationOrderBy
  ) {
    issues(filter: $filter, first: $first, after: $after, orderBy: $orderBy) {
      nodes {
        id
        identifier
        title
        description
        priority
        priorityLabel
        createdAt
        updatedAt
        completedAt
        url
        state { name type }
        assignee { name displayName }
        labels { nodes { name } }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

export const LINEAR_ISSUE_PREVIEWS_QUERY = `
  query IssuePreviews(
    $filter: IssueFilter
    $first: Int
    $after: String
    $orderBy: PaginationOrderBy
  ) {
    issues(filter: $filter, first: $first, after: $after, orderBy: $orderBy) {
      nodes {
        id
        identifier
        title
        completedAt
        url
        state { name }
        assignee { name displayName }
      }
    }
  }
`;
