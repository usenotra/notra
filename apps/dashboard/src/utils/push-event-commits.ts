import { githubPushEventCommitsSchema } from "@notra/schemas/dashboard/github-webhook";

export function getPushCommitMessages(data: unknown): string[] {
  const parsed = githubPushEventCommitsSchema.safeParse(data);
  if (!parsed.success) {
    return [];
  }
  return parsed.data.commits.map((commit) => commit.message);
}
