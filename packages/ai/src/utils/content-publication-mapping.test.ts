import { afterAll, beforeEach, describe, expect, mock, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

if (process.env.NOTRA_PUBLICATION_MAPPING_SQL_WORKER !== "1") {
  test("content publication mapping SQL regressions", () => {
    const result = spawnSync(
      process.execPath,
      ["test", fileURLToPath(import.meta.url)],
      {
        env: { ...process.env, NOTRA_PUBLICATION_MAPPING_SQL_WORKER: "1" },
        timeout: 25_000,
      }
    );
    expect(result.status, result.stderr.toString()).toBe(0);
  }, 30_000);
} else {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { integer, pgTable, text, timestamp } =
    await import("drizzle-orm/pg-core");

  const posts = pgTable("posts", {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
  });
  const contentPublications = pgTable("content_publications", {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    postId: text("post_id").notNull(),
    repositoryId: text("repository_id").notNull(),
    owner: text("owner").notNull(),
    repo: text("repo").notNull(),
    path: text("path").notNull(),
    branch: text("branch").notNull(),
    pullRequestNumber: integer("pull_request_number").notNull(),
    pullRequestUrl: text("pull_request_url").notNull(),
    headSha: text("head_sha"),
    status: text("status").default("open").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  });

  const client = new PGlite();
  const orm = drizzle(client, { schema: { contentPublications, posts } });
  const db = new Proxy(orm, {
    get(target, property, receiver) {
      if (property === "transaction") {
        return <T>(run: (tx: unknown) => Promise<T>) =>
          target.transaction((tx) =>
            run(
              new Proxy(tx, {
                get(transaction, key, transactionReceiver) {
                  // PGlite does not implement PostgreSQL advisory locks. The
                  // production statement is the only execute() in this path;
                  // row/index behavior remains real PostgreSQL.
                  if (key === "execute") {
                    return async () => [];
                  }
                  const value = Reflect.get(
                    transaction,
                    key,
                    transactionReceiver
                  );
                  return typeof value === "function"
                    ? value.bind(transaction)
                    : value;
                },
              })
            )
          );
      }
      const value = Reflect.get(target, property, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });

  mock.module("@notra/db/drizzle", () => ({ db }));
  mock.module("@notra/db/schema", () => ({ contentPublications, posts }));
  mock.module("@notra/ai/utils/post-service", () => ({
    updatePostRecord: async () => null,
  }));

  await client.exec(`
    create table posts (id text primary key, organization_id text not null);
    create table content_publications (
      id text primary key, organization_id text not null, post_id text not null,
      repository_id text not null, owner text not null, repo text not null,
      path text not null, branch text not null, pull_request_number integer not null,
      pull_request_url text not null, head_sha text, status text not null default 'open',
      created_at timestamp not null default now(), updated_at timestamp not null default now()
    );
    create unique index "contentPublications_repository_pullRequest_uidx"
      on content_publications (repository_id, pull_request_number);
    create unique index "contentPublications_open_post_uidx"
      on content_publications (post_id) where status = 'open';
  `);

  const {
    closeContentPublicationForPullRequest,
    reconcileContentPublication,
    recordContentPublication,
  } = await import("./content-publication");
  const at = (day: number) =>
    `2026-01-${String(day).padStart(2, "0")}T00:00:00.000Z`;
  const publication = (target: "A" | "B", headSha = `${target}-head`) => ({
    organizationId: "org",
    postId: "post",
    repositoryId: `repository-${target}`,
    owner: "notra",
    repo: `repo-${target}`,
    path: "post.md",
    branch: `branch-${target}`,
    pullRequestNumber: target === "A" ? 1 : 2,
    pullRequestUrl: `https://example.test/${target}`,
    headSha,
  });
  const rows = async () =>
    (
      await client.query<{
        repository_id: string;
        status: string;
        head_sha: string | null;
        created_at: Date;
      }>(
        `select repository_id, status, head_sha, created_at from content_publications order by created_at`
      )
    ).rows;
  const insert = async (
    target: "A" | "B",
    createdAt: string,
    status = "open"
  ) => {
    const p = publication(target);
    await client.query(
      `insert into content_publications
       (id, organization_id, post_id, repository_id, owner, repo, path, branch,
        pull_request_number, pull_request_url, head_sha, status, created_at)
       values ($1, 'org', 'post', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        `seed-${target}`,
        p.repositoryId,
        p.owner,
        p.repo,
        p.path,
        p.branch,
        p.pullRequestNumber,
        p.pullRequestUrl,
        p.headSha,
        status,
        createdAt,
      ]
    );
  };

  beforeEach(async () => {
    await client.exec(
      "truncate content_publications, posts; insert into posts values ('post', 'org')"
    );
  });
  afterAll(async () => client.close());

  describe("record/reconcile mapping against PostgreSQL indexes", () => {
    test("reconciliation closes old A before inserting open B", async () => {
      await insert("A", at(1));
      await reconcileContentPublication({
        publication: publication("B"),
        publishedAt: at(2),
      });
      expect(
        (await rows()).map(({ repository_id, status }) => [
          repository_id,
          status,
        ])
      ).toEqual([
        ["repository-A", "closed"],
        ["repository-B", "open"],
      ]);
    });

    for (const [name, write] of [
      [
        "immediate",
        (p: ReturnType<typeof publication>, publishedAt: string) =>
          recordContentPublication(p, publishedAt),
      ],
      [
        "reconcile",
        (p: ReturnType<typeof publication>, publishedAt: string) =>
          reconcileContentPublication({ publication: p, publishedAt }),
      ],
    ] as const) {
      test(`delayed A cannot close newer B through ${name} writer`, async () => {
        await insert("B", at(2));
        expect(await write(publication("A"), at(1))).toBeNull();
        expect(
          (await rows()).map(({ repository_id, status }) => [
            repository_id,
            status,
          ])
        ).toEqual([["repository-B", "open"]]);
      });
    }

    test("newer terminal B still prevents delayed A", async () => {
      await insert("B", at(2), "closed");
      expect(
        await reconcileContentPublication({
          publication: publication("A"),
          publishedAt: at(1),
        })
      ).toBeNull();
      expect(
        (await rows()).map(({ repository_id, status }) => [
          repository_id,
          status,
        ])
      ).toEqual([["repository-B", "closed"]]);
    });

    for (const status of ["open", "closed"]) {
      test(`republishing B advances ordering even when ${status}`, async () => {
        await recordContentPublication(publication("B"), at(1));
        await recordContentPublication(publication("B"), at(3));
        await reconcileContentPublication({
          publication: publication("B"),
          publishedAt: at(1),
        });
        expect(
          (await rows()).map(({ created_at }) =>
            new Date(created_at).toISOString()
          )
        ).toEqual([at(3)]);
        await client.query("update content_publications set status = $1", [
          status,
        ]);
        expect(
          await recordContentPublication(publication("A"), at(2))
        ).toBeNull();
        expect(
          await reconcileContentPublication({
            publication: publication("A"),
            publishedAt: at(2),
          })
        ).toBeNull();
        expect(
          (await rows()).map(({ repository_id, status: state }) => [
            repository_id,
            state,
          ])
        ).toEqual([["repository-B", status]]);
      });
    }

    test("replaying a terminal target does not retire the current mapping", async () => {
      await insert("B", at(1), "closed");
      await insert("A", at(2));
      expect(
        await reconcileContentPublication({
          publication: publication("B"),
          publishedAt: at(3),
        })
      ).toBeNull();
      expect(
        (await rows()).map(({ repository_id, status }) => [
          repository_id,
          status,
        ])
      ).toEqual([
        ["repository-B", "closed"],
        ["repository-A", "open"],
      ]);
    });

    test("republishing advances the head without replaying over a later sync", async () => {
      await recordContentPublication(publication("B", "H1"), at(1));
      const republish = {
        ...publication("B", "H2"),
        previousHeadSha: "H1",
      };
      await recordContentPublication(republish, at(2));
      expect((await rows())[0]?.head_sha).toBe("H2");
      await client.exec("update content_publications set head_sha = 'H3'");
      await reconcileContentPublication({
        publication: republish,
        publishedAt: at(2),
      });
      expect((await rows())[0]?.head_sha).toBe("H3");
    });

    test("a delayed publish cannot advance from a newer publish's baseline", async () => {
      await recordContentPublication(publication("B", "H1"), at(3));
      await recordContentPublication(
        { ...publication("B", "stale"), previousHeadSha: "H1" },
        at(2)
      );
      expect((await rows())[0]?.head_sha).toBe("H1");
    });

    test("identical replay preserves the synchronized head", async () => {
      await recordContentPublication(publication("B", "publish-head"), at(2));
      await client.exec(
        "update content_publications set head_sha = 'synced-head'"
      );
      await reconcileContentPublication({
        publication: publication("B", "publish-head"),
        publishedAt: at(2),
      });
      expect((await rows())[0]?.head_sha).toBe("synced-head");
    });

    test("reconciliation closes only the matching repository integration", async () => {
      await client.exec(`
        insert into posts values ('other-post', 'other-org');
        insert into content_publications
          (id, organization_id, post_id, repository_id, owner, repo, path, branch,
           pull_request_number, pull_request_url, status, created_at)
        values
          ('same-org', 'org', 'post', 'repository-A', 'notra', 'shared', 'post.md', 'a', 7, 'https://example.test/a', 'open', '${at(1)}'),
          ('other-org', 'other-org', 'other-post', 'repository-B', 'notra', 'shared', 'post.md', 'b', 7, 'https://example.test/b', 'open', '${at(1)}');
      `);

      expect(
        await closeContentPublicationForPullRequest({
          owner: "notra",
          repo: "shared",
          pullRequestNumber: 7,
          merged: true,
          repositoryId: "repository-A",
        })
      ).toBe(1);
      expect(
        (
          await client.query<{ repository_id: string; status: string }>(
            "select repository_id, status from content_publications order by repository_id"
          )
        ).rows.map(({ repository_id, status }) => [repository_id, status])
      ).toEqual([
        ["repository-A", "merged"],
        ["repository-B", "open"],
      ]);
    });
  });
}
