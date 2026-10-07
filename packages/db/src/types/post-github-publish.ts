export interface PostGitHubPublish {
  branchName: string;
  owner: string;
  path: string;
  pullRequestNumber: number;
  pullRequestUrl: string;
  repo: string;
  repositoryId: string;
}
