export interface PreviewCommentFixture {
  id: number;
  body: string;
  user: { type: "Bot" | "User" };
  performed_via_github_app: { id: number } | null;
}

export interface PreviewPullRequestFixture {
  state: string;
  head: { sha: string; repo: { id: number } | null };
  base: { ref: string; repo: { id: number } };
}
