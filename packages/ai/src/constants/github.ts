export const GITHUB_CONTENT_POST_TRAILER = "Notra-Post: ";

/** GitHub App tokens author this commit as the App bot. */
export const GITHUB_CREATE_COMMIT_ON_BRANCH_MUTATION = `
  mutation CreateCommitOnBranch($input: CreateCommitOnBranchInput!) {
    createCommitOnBranch(input: $input) {
      commit {
        oid
      }
    }
  }
`;
