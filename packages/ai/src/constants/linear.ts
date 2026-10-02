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
