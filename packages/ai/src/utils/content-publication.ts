import type {
  GitHubMentionPublication,
  RecordContentPublicationParams,
} from "@notra/ai/types/github-mention";
import { db } from "@notra/db/drizzle";
import { contentPublications, posts } from "@notra/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { customAlphabet } from "nanoid";

const generatePublicationId = customAlphabet(
  "abcdefghijklmnopqrstuvwxyz0123456789",
  16
);

function toPublication(
  row: {
    id: string;
    postId: string;
    repositoryId: string;
    owner: string;
    repo: string;
    path: string;
    branch: string;
    pullRequestNumber: number;
    pullRequestUrl: string;
    headSha: string | null;
    status: GitHubMentionPublication["status"];
  },
  post?: {
    contentType: string;
    title: string;
    markdown: string | null;
  } | null
): GitHubMentionPublication {
  return {
    ...row,
    contentType:
      (post?.contentType as GitHubMentionPublication["contentType"]) ?? null,
    title: post?.title ?? null,
    markdown: post?.markdown ?? null,
  };
}

export async function recordContentPublication(
  params: RecordContentPublicationParams
) {
  const id = generatePublicationId();
  const status = params.status ?? "open";
  const [row] = await db
    .insert(contentPublications)
    .values({
      id,
      organizationId: params.organizationId,
      postId: params.postId,
      repositoryId: params.repositoryId,
      owner: params.owner,
      repo: params.repo,
      path: params.path,
      branch: params.branch,
      pullRequestNumber: params.pullRequestNumber,
      pullRequestUrl: params.pullRequestUrl,
      headSha: params.headSha ?? null,
      status,
    })
    .onConflictDoUpdate({
      target: [
        contentPublications.repositoryId,
        contentPublications.pullRequestNumber,
      ],
      set: {
        postId: params.postId,
        path: params.path,
        branch: params.branch,
        pullRequestUrl: params.pullRequestUrl,
        headSha: params.headSha ?? null,
        status,
        updatedAt: new Date(),
      },
    })
    .returning({
      id: contentPublications.id,
      postId: contentPublications.postId,
      repositoryId: contentPublications.repositoryId,
      owner: contentPublications.owner,
      repo: contentPublications.repo,
      path: contentPublications.path,
      branch: contentPublications.branch,
      pullRequestNumber: contentPublications.pullRequestNumber,
      pullRequestUrl: contentPublications.pullRequestUrl,
      headSha: contentPublications.headSha,
      status: contentPublications.status,
    });

  return row ?? null;
}

export async function updateContentPublicationHead(params: {
  publicationId: string;
  organizationId: string;
  headSha: string;
  branch?: string;
}) {
  await db
    .update(contentPublications)
    .set({
      headSha: params.headSha,
      ...(params.branch ? { branch: params.branch } : {}),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(contentPublications.id, params.publicationId),
        eq(contentPublications.organizationId, params.organizationId)
      )
    );
}

export async function findContentPublicationForPullRequest(params: {
  organizationId: string;
  owner: string;
  repo: string;
  pullRequestNumber: number;
}): Promise<GitHubMentionPublication | null> {
  const publication = await db.query.contentPublications.findFirst({
    where: and(
      eq(contentPublications.organizationId, params.organizationId),
      eq(contentPublications.owner, params.owner),
      eq(contentPublications.repo, params.repo),
      eq(contentPublications.pullRequestNumber, params.pullRequestNumber)
    ),
    orderBy: [desc(contentPublications.updatedAt)],
  });
  if (!publication) {
    return null;
  }
  const post = await db.query.posts.findFirst({
    where: and(
      eq(posts.id, publication.postId),
      eq(posts.organizationId, params.organizationId)
    ),
    columns: {
      contentType: true,
      title: true,
      markdown: true,
    },
  });
  return toPublication(publication, post);
}

export async function findOpenContentPublicationForPost(params: {
  organizationId: string;
  postId: string;
}): Promise<GitHubMentionPublication | null> {
  const publication = await db.query.contentPublications.findFirst({
    where: and(
      eq(contentPublications.organizationId, params.organizationId),
      eq(contentPublications.postId, params.postId),
      eq(contentPublications.status, "open")
    ),
  });
  if (!publication) {
    return null;
  }
  const post = await db.query.posts.findFirst({
    where: and(
      eq(posts.id, publication.postId),
      eq(posts.organizationId, params.organizationId)
    ),
    columns: {
      contentType: true,
      title: true,
      markdown: true,
    },
  });
  return toPublication(publication, post);
}
