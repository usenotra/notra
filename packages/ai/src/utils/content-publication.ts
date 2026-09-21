import type {
  ContentPublication,
  PublicationAncestryValidator,
  PublicationSyncResult,
  PublicationSyncRepair,
  ReconcileContentPublicationParams,
  RecordContentPublicationParams,
} from "@notra/ai/types/content-publication";
import { updatePostRecord } from "@notra/ai/utils/post-service";
import { db } from "@notra/db/drizzle";
import { contentPublications, posts } from "@notra/db/schema";
import { and, desc, eq, gt, ne, or, sql } from "drizzle-orm";
import { customAlphabet } from "nanoid";

const generatePublicationId = customAlphabet(
  "abcdefghijklmnopqrstuvwxyz0123456789",
  16
);

function pullRequestLockKey(repository: string, pullRequestNumber: number) {
  return `${repository.toLowerCase()}#${pullRequestNumber}`;
}

async function lockPullRequest(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  repository: string,
  pullRequestNumber: number
) {
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${pullRequestLockKey(repository, pullRequestNumber)}, 0))`
  );
}

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
    status: ContentPublication["status"];
  },
  post?: {
    contentType: string;
    title: string;
    markdown: string | null;
  } | null
): ContentPublication {
  return {
    ...row,
    contentType:
      (post?.contentType as ContentPublication["contentType"]) ?? null,
    title: post?.title ?? null,
    markdown: post?.markdown ?? null,
  };
}

export async function recordContentPublication(
  params: RecordContentPublicationParams,
  publishedAt: string
) {
  const id = generatePublicationId();
  const status = params.status ?? "open";
  return await db.transaction(async (tx) => {
    await lockPullRequest(
      tx,
      `${params.owner}/${params.repo}`,
      params.pullRequestNumber
    );
    // Publication creation and content synchronization lock the post first.
    // This serializes ownership changes with revision-guarded post updates.
    await tx
      .select({ id: posts.id })
      .from(posts)
      .where(
        and(
          eq(posts.id, params.postId),
          eq(posts.organizationId, params.organizationId)
        )
      )
      .for("update");

    const newer = await tx.query.contentPublications.findFirst({
      where: and(
        eq(contentPublications.organizationId, params.organizationId),
        eq(contentPublications.postId, params.postId),
        gt(contentPublications.createdAt, new Date(publishedAt)),
        or(
          ne(contentPublications.repositoryId, params.repositoryId),
          ne(contentPublications.pullRequestNumber, params.pullRequestNumber)
        )
      ),
      columns: { id: true },
    });
    if (newer) {
      return null;
    }

    const existingTarget = await tx.query.contentPublications.findFirst({
      where: and(
        eq(contentPublications.repositoryId, params.repositoryId),
        eq(contentPublications.pullRequestNumber, params.pullRequestNumber)
      ),
    });
    // Check the target before retiring the post's current mapping. A stale
    // terminal retry and a PR already owned by another post are both no-ops.
    if (
      existingTarget &&
      (existingTarget.organizationId !== params.organizationId ||
        existingTarget.postId !== params.postId ||
        existingTarget.status !== "open")
    ) {
      return null;
    }

    if (status === "open") {
      // A post keeps one open publication. Republishing after its pull request
      // closed, or into another repository, supersedes the older row instead of
      // violating contentPublications_open_post_uidx.
      await tx
        .update(contentPublications)
        .set({ status: "closed", updatedAt: new Date() })
        .where(
          and(
            eq(contentPublications.organizationId, params.organizationId),
            eq(contentPublications.postId, params.postId),
            eq(contentPublications.status, "open"),
            or(
              ne(contentPublications.repositoryId, params.repositoryId),
              ne(
                contentPublications.pullRequestNumber,
                params.pullRequestNumber
              )
            )
          )
        );
    }

    const [row] = await tx
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
        createdAt: new Date(publishedAt),
      })
      .onConflictDoUpdate({
        target: [
          contentPublications.repositoryId,
          contentPublications.pullRequestNumber,
        ],
        // A delayed writer must not steal a PR mapping from another post or
        // resurrect a terminal publication.
        setWhere: and(
          eq(contentPublications.postId, params.postId),
          eq(contentPublications.status, "open")
        ),
        set: {
          owner: params.owner,
          repo: params.repo,
          path: params.path,
          branch: params.branch,
          pullRequestUrl: params.pullRequestUrl,
          // Advance a republish only from its recorded baseline. Replays must
          // not overwrite a newer publish or a concurrent content sync.
          headSha: sql`case
            when ${contentPublications.headSha} is not distinct from ${params.previousHeadSha ?? null}
              and ${contentPublications.createdAt} <= ${publishedAt}::timestamp
            then coalesce(${params.headSha ?? null}, ${contentPublications.headSha})
            else ${contentPublications.headSha}
          end`,
          status,
          createdAt: sql`greatest(${contentPublications.createdAt}, ${publishedAt}::timestamp)`,
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
  });
}

/**
 * The delayed retry of a publication write that failed at publish time. The
 * post may have been published again since, and replaying the older write
 * would close that newer mapping, so it is skipped then.
 */
export async function reconcileContentPublication({
  publication,
  publishedAt,
}: ReconcileContentPublicationParams) {
  return await recordContentPublication(publication, publishedAt);
}

/** Atomically updates a post and its publication revision if it still owns the post. */
export async function syncContentPublication(
  repair: PublicationSyncRepair,
  isAncestor: PublicationAncestryValidator
): Promise<PublicationSyncResult> {
  const snapshot = await db.query.contentPublications.findFirst({
    where: and(
      eq(contentPublications.id, repair.publicationId),
      eq(contentPublications.organizationId, repair.organizationId),
      eq(contentPublications.postId, repair.postId)
    ),
    columns: { headSha: true, status: true },
  });
  if (!snapshot || snapshot.status !== "open") {
    return { status: "superseded" };
  }
  if (snapshot.headSha === repair.commitSha) {
    return { status: "synchronized", markdown: repair.markdown };
  }
  // Null is an explicit initial baseline. Otherwise only move forwards along
  // the PR's commit graph; manual and unrelated intermediary commits are safe.
  if (
    snapshot.headSha !== null &&
    !(await isAncestor(snapshot.headSha, repair.commitSha))
  ) {
    return { status: "superseded" };
  }
  return await db.transaction(async (tx) => {
    await tx
      .select({ id: posts.id })
      .from(posts)
      .where(
        and(
          eq(posts.id, repair.postId),
          eq(posts.organizationId, repair.organizationId)
        )
      )
      .for("update");
    const [publication] = await tx
      .select({
        id: contentPublications.id,
        headSha: contentPublications.headSha,
      })
      .from(contentPublications)
      .where(
        and(
          eq(contentPublications.id, repair.publicationId),
          eq(contentPublications.organizationId, repair.organizationId),
          eq(contentPublications.postId, repair.postId),
          eq(contentPublications.status, "open")
        )
      )
      .for("update");
    if (!publication) {
      return { status: "superseded" } as const;
    }
    // Idempotent repair: do not overwrite post content after this revision was
    // already recorded by a successful newer execution.
    if (publication.headSha === repair.commitSha) {
      return { status: "synchronized", markdown: repair.markdown } as const;
    }
    if (publication.headSha !== snapshot.headSha) {
      return { status: "retry" } as const;
    }

    await updatePostRecord(
      {
        organizationId: repair.organizationId,
        postId: repair.postId,
        markdown: repair.markdown,
        title: repair.title,
      },
      tx
    );
    await tx
      .update(contentPublications)
      .set({
        headSha: repair.commitSha,
        branch: repair.branch,
        updatedAt: new Date(),
      })
      .where(eq(contentPublications.id, repair.publicationId));
    return { status: "synchronized", markdown: repair.markdown } as const;
  });
}

export async function closeContentPublicationForPullRequest(params: {
  owner: string;
  repo: string;
  pullRequestNumber: number;
  merged: boolean;
  repositoryId?: string;
}) {
  return await db.transaction(async (tx) => {
    await lockPullRequest(
      tx,
      `${params.owner}/${params.repo}`,
      params.pullRequestNumber
    );
    const rows = await tx
      .update(contentPublications)
      .set({
        status: params.merged ? "merged" : "closed",
        updatedAt: new Date(),
      })
      .where(
        and(
          sql`lower(${contentPublications.owner}) = ${params.owner.toLowerCase()}`,
          sql`lower(${contentPublications.repo}) = ${params.repo.toLowerCase()}`,
          eq(contentPublications.pullRequestNumber, params.pullRequestNumber),
          params.repositoryId
            ? eq(contentPublications.repositoryId, params.repositoryId)
            : undefined,
          eq(contentPublications.status, "open")
        )
      )
      .returning({ id: contentPublications.id });
    return rows.length;
  });
}

export async function findContentPublicationForPullRequest(params: {
  organizationId: string;
  owner: string;
  repo: string;
  pullRequestNumber: number;
}): Promise<ContentPublication | null> {
  const publication = await db.query.contentPublications.findFirst({
    where: and(
      eq(contentPublications.organizationId, params.organizationId),
      eq(contentPublications.owner, params.owner),
      eq(contentPublications.repo, params.repo),
      eq(contentPublications.pullRequestNumber, params.pullRequestNumber),
      eq(contentPublications.status, "open")
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
}): Promise<ContentPublication | null> {
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
