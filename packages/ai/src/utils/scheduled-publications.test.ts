import { beforeEach, describe, expect, mock, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// Real PostgreSQL semantics (partial unique indexes, row locks, CAS updates)
// through PGlite, in a worker so the mocked db module stays out of other files.
if (process.env.NOTRA_SCHEDULED_PUBLICATIONS_SQL_WORKER !== "1") {
  test("scheduled publication lifecycle (PGlite)", () => {
    const result = spawnSync(
      process.execPath,
      ["test", fileURLToPath(import.meta.url)],
      {
        env: { ...process.env, NOTRA_SCHEDULED_PUBLICATIONS_SQL_WORKER: "1" },
        timeout: 60_000,
      }
    );
    expect(
      result.status,
      `${result.stdout.toString()}\n${result.stderr.toString()}`
    ).toBe(0);
  }, 70_000);
} else {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { generateDrizzleJson, generateMigration } =
    await import("drizzle-kit/api");
  const schemaModule = await import("@notra/db/schema");
  const { eq } = await import("drizzle-orm");

  const schema = {
    postStatusEnum: schemaModule.postStatusEnum,
    postCollectionSourceEnum: schemaModule.postCollectionSourceEnum,
    postCollectionNameSourceEnum: schemaModule.postCollectionNameSourceEnum,
    scheduledPublicationStatusEnum: schemaModule.scheduledPublicationStatusEnum,
    scheduledPublicationDestinationEnum:
      schemaModule.scheduledPublicationDestinationEnum,
    users: schemaModule.users,
    organizations: schemaModule.organizations,
    brandSettings: schemaModule.brandSettings,
    projects: schemaModule.projects,
    postCollections: schemaModule.postCollections,
    posts: schemaModule.posts,
    githubAppInstallations: schemaModule.githubAppInstallations,
    githubIntegrations: schemaModule.githubIntegrations,
    connectedSocialAccounts: schemaModule.connectedSocialAccounts,
    scheduledPublications: schemaModule.scheduledPublications,
    postsRelations: schemaModule.postsRelations,
    scheduledPublicationsRelations: schemaModule.scheduledPublicationsRelations,
  };
  const {
    connectedSocialAccounts,
    githubIntegrations,
    organizations,
    postCollections,
    posts,
    scheduledPublications,
    users,
  } = schema;

  const client = new PGlite();
  const db = drizzle(client, { schema });
  mock.module("@notra/db/drizzle", () => ({ db }));

  const statements = await generateMigration(
    generateDrizzleJson({}),
    generateDrizzleJson(schema)
  );
  for (const statement of statements.filter(
    (sql) => !sql.startsWith("ALTER TABLE")
  )) {
    await client.exec(statement);
  }
  for (const statement of statements.filter((sql) =>
    sql.startsWith("ALTER TABLE")
  )) {
    await client.exec(statement);
  }

  const lifecycle = await import("./scheduled-publications");
  const { listContentCalendar } = await import("./content-calendar");
  const {
    SCHEDULED_PUBLICATION_LEASE_MS,
    SCHEDULED_PUBLICATION_MAX_ATTEMPTS,
    SCHEDULED_PUBLICATION_START_BUDGET_MS,
    SCHEDULED_PUBLICATION_START_RETRY_MS,
  } = await import("../constants/scheduled-publications");

  const ORG = "org-1";
  const MINUTE = 60 * 1000;
  const NOW = new Date("2026-10-01T10:00:00.000Z");
  const SLOT = new Date("2026-10-06T08:00:00.000Z");

  const seedPost = async (
    id: string,
    contentType = "changelog",
    options: { status?: "draft" | "published"; projectId?: string | null } = {}
  ) => {
    await db
      .insert(postCollections)
      .values({
        id: `collection-${id}`,
        organizationId: ORG,
        projectId: options.projectId ?? null,
        source: "manual",
        name: id,
      })
      .onConflictDoNothing();
    await db.insert(posts).values({
      id,
      organizationId: ORG,
      collectionId: `collection-${id}`,
      title: `Post ${id}`,
      content: "<p>hi</p>",
      markdown: "hi",
      contentType,
      status: options.status ?? "draft",
      publishedAt: options.status === "published" ? NOW : null,
    });
  };

  const rowsFor = (postId: string) =>
    db
      .select()
      .from(scheduledPublications)
      .where(eq(scheduledPublications.postId, postId));

  const schedule = (
    postId: string,
    overrides: Partial<
      Parameters<typeof lifecycle.schedulePostPublication>[0]
    > = {}
  ) =>
    lifecycle.schedulePostPublication({
      organizationId: ORG,
      postId,
      scheduledAt: SLOT,
      timeZone: "Europe/Berlin",
      destinations: [],
      userId: "user-1",
      now: NOW,
      ...overrides,
    });

  beforeEach(async () => {
    await client.exec('TRUNCATE "organizations", "users" CASCADE');
    await db.insert(users).values({
      id: "user-1",
      name: "User",
      email: "user@example.com",
    });
    await db.insert(organizations).values({
      id: ORG,
      name: "Org",
      slug: "org",
      createdAt: NOW,
    });
    await db.insert(githubIntegrations).values({
      id: "repo-1",
      organizationId: ORG,
      createdByUserId: "user-1",
      displayName: "acme/site",
      owner: "acme",
      repo: "site",
      defaultBranch: "main",
    });
    await db.insert(connectedSocialAccounts).values({
      id: "x-1",
      organizationId: ORG,
      provider: "twitter",
      providerAccountId: "p-1",
      username: "acme",
      displayName: "Acme",
    });
  });

  describe("schedulePostPublication", () => {
    test("always publishes in Notra and adds validated destinations", async () => {
      await seedPost("p1");
      const outcome = await schedule("p1", {
        destinations: [
          { destination: "github", repositoryId: "repo-1", merge: true },
        ],
      });
      expect(outcome.ok).toBe(true);
      const rows = await rowsFor("p1");
      expect(rows.map((row) => row.destination).sort()).toEqual([
        "github",
        "notra",
      ]);
      for (const row of rows) {
        expect(row.status).toBe("scheduled");
        expect(row.nextAttemptAt.getTime()).toBe(SLOT.getTime());
      }
    });

    test("rejects destinations the content type or organization cannot use", async () => {
      await seedPost("tweet", "twitter_post");
      await seedPost("log");
      expect(
        await schedule("tweet", {
          destinations: [
            { destination: "github", repositoryId: "repo-1", merge: true },
          ],
        })
      ).toEqual({ ok: false, reason: "destination_not_supported" });
      expect(
        await schedule("log", {
          destinations: [
            { destination: "github", repositoryId: "other", merge: true },
          ],
        })
      ).toEqual({ ok: false, reason: "repository_not_found" });
      await seedPost("linkedin", "linkedin_post");
      // The X account cannot post a LinkedIn post.
      expect(
        await schedule("linkedin", {
          destinations: [{ destination: "social", accountId: "x-1" }],
        })
      ).toEqual({ ok: false, reason: "account_not_found" });
      expect((await schedule("missing")).ok).toBe(false);
    });

    test("rejects slots in the past or more than a year ahead", async () => {
      await seedPost("p1");
      expect(
        await schedule("p1", {
          scheduledAt: new Date(NOW.getTime() - 10 * MINUTE),
        })
      ).toEqual({ ok: false, reason: "invalid_time" });
      expect(
        await schedule("p1", {
          scheduledAt: new Date("2027-12-01T00:00:00.000Z"),
        })
      ).toEqual({ ok: false, reason: "invalid_time" });
    });

    test("rescheduling replaces pending rows instead of adding a second schedule", async () => {
      await seedPost("p1");
      await schedule("p1");
      const later = new Date(SLOT.getTime() + 24 * 60 * MINUTE);
      const outcome = await schedule("p1", { scheduledAt: later });
      expect(outcome.ok && outcome.schedule.scheduledAt).toBe(
        later.toISOString()
      );
      const rows = await rowsFor("p1");
      expect(rows.filter((row) => row.status === "scheduled")).toHaveLength(1);
      expect(rows.filter((row) => row.status === "canceled")).toHaveLength(1);
    });

    test("refuses to replace a schedule that is already publishing", async () => {
      await seedPost("p1");
      await schedule("p1");
      await lifecycle.claimDueScheduledPublications({ now: SLOT });
      expect(await schedule("p1")).toEqual({
        ok: false,
        reason: "publishing_in_progress",
      });
    });
  });

  describe("claims", () => {
    test("claims only due rows and fences overlapping sweeps", async () => {
      await seedPost("due");
      await seedPost("later");
      await schedule("due");
      await schedule("later", {
        scheduledAt: new Date(SLOT.getTime() + 60 * MINUTE),
      });

      expect(
        await lifecycle.claimDueScheduledPublications({
          now: new Date(SLOT.getTime() - MINUTE),
        })
      ).toHaveLength(0);
      const claims = await lifecycle.claimDueScheduledPublications({
        now: SLOT,
      });
      expect(claims.map((claim) => claim.postId)).toEqual(["due"]);
      // A second sweep inside the lease finds nothing to do.
      expect(
        await lifecycle.claimDueScheduledPublications({
          now: new Date(SLOT.getTime() + MINUTE),
        })
      ).toHaveLength(0);
      const [row] = await rowsFor("due");
      expect(row?.status).toBe("publishing");
      expect(row?.attempts).toBe(1);
    });

    test("a run that lost its claim can no longer write", async () => {
      await seedPost("p1");
      await schedule("p1");
      const [first] = await lifecycle.claimDueScheduledPublications({
        now: SLOT,
      });
      if (!first) {
        throw new Error("expected a claim");
      }
      // The first run dies; after the lease a later sweep takes over.
      const takeoverAt = new Date(
        SLOT.getTime() + SCHEDULED_PUBLICATION_LEASE_MS + MINUTE
      );
      const [second] = await lifecycle.claimDueScheduledPublications({
        now: takeoverAt,
      });
      expect(second?.claimToken).not.toBe(first.claimToken);
      expect(second?.id).toBe(first.id);

      expect(
        await lifecycle.beginScheduledPublicationAttempt(first, takeoverAt)
      ).toBeNull();
      expect(
        await lifecycle.finishScheduledPublicationAttempt(first, 1, {
          kind: "published",
          result: {},
        })
      ).toBe("superseded");

      const begun = await lifecycle.beginScheduledPublicationAttempt(
        second ?? first,
        takeoverAt
      );
      expect(begun?.attempt.attempts).toBe(2);
    });

    test("a failed hand-off is released without spending an attempt", async () => {
      await seedPost("p1");
      await schedule("p1");
      const [claim] = await lifecycle.claimDueScheduledPublications({
        now: SLOT,
      });
      if (!claim) {
        throw new Error("expected a claim");
      }
      await lifecycle.releaseScheduledPublicationClaim(claim, SLOT);
      const [row] = await rowsFor("p1");
      expect(row?.status).toBe("scheduled");
      expect(row?.attempts).toBe(0);
      expect(row?.claimToken).toBeNull();
      expect(row?.nextAttemptAt.getTime()).toBe(
        SLOT.getTime() + SCHEDULED_PUBLICATION_START_RETRY_MS
      );
      // The late-starting run of the released claim is fenced out.
      expect(
        await lifecycle.beginScheduledPublicationAttempt(claim, SLOT)
      ).toBeNull();
    });
  });

  describe("finishing attempts", () => {
    const claimOne = async (postId: string, at = SLOT) => {
      const claims = await lifecycle.claimDueScheduledPublications({
        now: at,
        postId,
      });
      const claim = claims[0];
      if (!claim) {
        throw new Error("expected a claim");
      }
      const begun = await lifecycle.beginScheduledPublicationAttempt(claim, at);
      if (!begun) {
        throw new Error("expected an attempt");
      }
      return { claim, attempt: begun.attempt };
    };

    test("success records the result and releases the claim", async () => {
      await seedPost("p1");
      await schedule("p1");
      const { claim, attempt } = await claimOne("p1");
      const finish = await lifecycle.finishScheduledPublicationAttempt(
        claim,
        attempt.attempts,
        { kind: "published", result: { pullRequestUrl: "https://x" } },
        SLOT
      );
      expect(finish).toBe("published");
      const [row] = await rowsFor("p1");
      expect(row?.status).toBe("published");
      expect(row?.publishedAt?.getTime()).toBe(SLOT.getTime());
      expect(row?.claimToken).toBeNull();
    });

    test("retryable errors back off until the attempts run out", async () => {
      await seedPost("p1");
      await schedule("p1");
      let at = SLOT;
      const error = {
        kind: "error" as const,
        code: "github_merge_failed",
        message: "checks pending",
        retryable: true,
      };
      for (
        let attempt = 1;
        attempt < SCHEDULED_PUBLICATION_MAX_ATTEMPTS;
        attempt++
      ) {
        const { claim } = await claimOne("p1", at);
        expect(
          await lifecycle.finishScheduledPublicationAttempt(
            claim,
            attempt,
            error,
            at
          )
        ).toBe("retry_scheduled");
        const [row] = await rowsFor("p1");
        expect(row?.status).toBe("scheduled");
        expect(row?.nextAttemptAt.getTime()).toBe(
          at.getTime() + lifecycle.scheduledPublicationRetryDelayMs(attempt)
        );
        at = row?.nextAttemptAt ?? at;
      }
      const { claim } = await claimOne("p1", at);
      expect(
        await lifecycle.finishScheduledPublicationAttempt(
          claim,
          SCHEDULED_PUBLICATION_MAX_ATTEMPTS,
          error,
          at
        )
      ).toBe("failed");
      const [row] = await rowsFor("p1");
      expect(row?.status).toBe("failed");
      expect(row?.lastError).toBe("checks pending");
    });

    test("an interrupted social post is never sent again automatically", async () => {
      await seedPost("tweet", "twitter_post");
      await schedule("tweet", {
        destinations: [{ destination: "social", accountId: "x-1" }],
      });
      const claims = await lifecycle.claimDueScheduledPublications({
        now: SLOT,
      });
      const social = claims.find((claim) => claim.destination === "social");
      if (!social) {
        throw new Error("expected the social claim");
      }
      expect(
        await lifecycle.markScheduledPublicationExternalAttempt(social, SLOT)
      ).toBe(true);
      expect(
        await lifecycle.markScheduledPublicationExternalAttempt(social, SLOT)
      ).toBe(false);

      // The run dies after sending; the next sweep takes the row over.
      const takeoverAt = new Date(
        SLOT.getTime() + SCHEDULED_PUBLICATION_LEASE_MS + MINUTE
      );
      const again = (
        await lifecycle.claimDueScheduledPublications({
          now: takeoverAt,
          postId: "tweet",
        })
      ).find((claim) => claim.destination === "social");
      const begun = again
        ? await lifecycle.beginScheduledPublicationAttempt(again, takeoverAt)
        : null;
      if (!begun) {
        throw new Error("expected the takeover attempt");
      }
      expect(begun.preempted).toMatchObject({
        kind: "error",
        code: "outcome_unknown",
        retryable: false,
      });
    });

    test("a crash loop stops after the attempt budget", async () => {
      await seedPost("p1");
      await schedule("p1");
      let at = SLOT;
      let begun = null;
      for (let run = 0; run <= SCHEDULED_PUBLICATION_MAX_ATTEMPTS; run++) {
        const [claim] = await lifecycle.claimDueScheduledPublications({
          now: at,
        });
        begun = claim
          ? await lifecycle.beginScheduledPublicationAttempt(claim, at)
          : null;
        at = new Date(at.getTime() + SCHEDULED_PUBLICATION_LEASE_MS + MINUTE);
      }
      if (!begun) {
        throw new Error("expected an attempt");
      }
      expect(begun.preempted).toMatchObject({ code: "too_many_attempts" });
    });

    test("a recorded outcome is handed back to the same claim only", async () => {
      await seedPost("p1");
      await schedule("p1");
      const [claim] = await lifecycle.claimDueScheduledPublications({
        now: SLOT,
      });
      if (!claim) {
        throw new Error("expected a claim");
      }
      expect(
        await lifecycle.getRecordedScheduledPublicationAttempt(claim)
      ).toBeNull();
      const outcome = { kind: "published", result: {} } as const;
      await lifecycle.recordScheduledPublicationAttemptOutcome(claim, outcome);
      expect(
        await lifecycle.getRecordedScheduledPublicationAttempt(claim)
      ).toMatchObject({ attempts: 1, destination: "notra", outcome });

      const takeoverAt = new Date(
        SLOT.getTime() + SCHEDULED_PUBLICATION_LEASE_MS + MINUTE
      );
      const [takeover] = await lifecycle.claimDueScheduledPublications({
        now: takeoverAt,
      });
      if (!takeover) {
        throw new Error("expected the takeover");
      }
      expect(
        await lifecycle.getRecordedScheduledPublicationAttempt(claim)
      ).toBeNull();
      expect(
        await lifecycle.getRecordedScheduledPublicationAttempt(takeover)
      ).toBeNull();
    });

    test("runs that never start are ended instead of taken over forever", async () => {
      await seedPost("p1");
      await seedPost("p2");
      await schedule("p1");
      await schedule("p2");
      let at = SLOT;
      for (let run = 0; run <= SCHEDULED_PUBLICATION_MAX_ATTEMPTS; run++) {
        await lifecycle.claimDueScheduledPublications({ now: at });
        at = new Date(at.getTime() + SCHEDULED_PUBLICATION_LEASE_MS + MINUTE);
      }
      await lifecycle.cancelPostSchedule({ organizationId: ORG, postId: "p2" });

      const failed = await lifecycle.settleAbandonedScheduledPublications({
        now: at,
      });

      const [p1] = await rowsFor("p1");
      expect(failed).toEqual(p1 ? [p1.id] : []);
      expect(p1).toMatchObject({
        status: "failed",
        errorCode: "too_many_attempts",
      });
      expect((await rowsFor("p2"))[0]?.status).toBe("canceled");
      expect(
        await lifecycle.claimDueScheduledPublications({ now: at })
      ).toHaveLength(0);
    });
  });

  describe("user actions", () => {
    test("cancel clears pending and failed rows but reports a running one", async () => {
      await seedPost("p1");
      await schedule("p1", {
        destinations: [
          { destination: "github", repositoryId: "repo-1", merge: false },
        ],
      });
      const [claim] = await lifecycle.claimDueScheduledPublications({
        now: SLOT,
        limit: 1,
      });
      const result = await lifecycle.cancelPostSchedule({
        organizationId: ORG,
        postId: "p1",
      });
      expect(result).toEqual({ canceled: 1, inProgress: true });
      const statuses = (await rowsFor("p1")).map((row) => [
        row.id === claim?.id,
        row.status,
      ]);
      expect(statuses).toContainEqual([true, "publishing"]);
      expect(statuses).toContainEqual([false, "canceled"]);
    });

    test("a destination canceled while publishing ends canceled instead of retrying", async () => {
      await seedPost("p1");
      await schedule("p1");
      const [claim] = await lifecycle.claimDueScheduledPublications({
        now: SLOT,
      });
      if (!claim) {
        throw new Error("expected a claim");
      }
      await lifecycle.cancelPostSchedule({ organizationId: ORG, postId: "p1" });
      expect(
        await lifecycle.finishScheduledPublicationAttempt(
          claim,
          1,
          {
            kind: "error",
            code: "github_merge_failed",
            message: "checks pending",
            retryable: true,
          },
          SLOT
        )
      ).toBe("canceled");
      const [row] = await rowsFor("p1");
      expect(row?.status).toBe("canceled");
    });

    test("a run that died after a cancel is not started again", async () => {
      await seedPost("p1");
      await schedule("p1");
      await lifecycle.claimDueScheduledPublications({ now: SLOT });
      await lifecycle.cancelPostSchedule({ organizationId: ORG, postId: "p1" });
      const takeoverAt = new Date(
        SLOT.getTime() + SCHEDULED_PUBLICATION_LEASE_MS + MINUTE
      );
      const [claim] = await lifecycle.claimDueScheduledPublications({
        now: takeoverAt,
      });
      const begun = claim
        ? await lifecycle.beginScheduledPublicationAttempt(claim, takeoverAt)
        : null;
      if (!(claim && begun)) {
        throw new Error("expected the takeover attempt");
      }
      expect(begun.preempted).toMatchObject({ code: "canceled" });
      expect(
        await lifecycle.finishScheduledPublicationAttempt(
          claim,
          begun.attempt.attempts,
          begun.preempted ?? { kind: "published", result: {} },
          takeoverAt
        )
      ).toBe("canceled");
    });

    test("a social post that may be live is neither canceled away nor replaced", async () => {
      await seedPost("tweet", "twitter_post");
      await schedule("tweet", {
        destinations: [{ destination: "social", accountId: "x-1" }],
      });
      const claims = await lifecycle.claimDueScheduledPublications({
        now: SLOT,
      });
      const social = claims.find((claim) => claim.destination === "social");
      const notra = claims.find((claim) => claim.destination === "notra");
      if (!(social && notra)) {
        throw new Error("expected both claims");
      }
      await lifecycle.finishScheduledPublicationAttempt(
        notra,
        1,
        { kind: "published", result: {} },
        SLOT
      );
      await lifecycle.markScheduledPublicationExternalAttempt(social, SLOT);
      await lifecycle.cancelPostSchedule({
        organizationId: ORG,
        postId: "tweet",
      });
      expect(
        await lifecycle.finishScheduledPublicationAttempt(
          social,
          1,
          {
            kind: "error",
            code: "outcome_unknown",
            message: "unconfirmed",
            retryable: false,
          },
          SLOT
        )
      ).toBe("failed");

      // The API and chat pass no expected ids; they still must not repost.
      expect(await schedule("tweet")).toEqual({
        ok: false,
        reason: "unconfirmed_social_post",
      });
      // Dismissing it is the explicit acknowledgement.
      await lifecycle.cancelPostSchedule({
        organizationId: ORG,
        postId: "tweet",
      });
      expect((await schedule("tweet")).ok).toBe(true);
    });

    test("a social post that already went out is not scheduled again", async () => {
      await seedPost("tweet", "twitter_post");
      const social = [{ destination: "social" as const, accountId: "x-1" }];
      await schedule("tweet", { destinations: social });
      for (const claim of await lifecycle.claimDueScheduledPublications({
        now: SLOT,
      })) {
        await lifecycle.finishScheduledPublicationAttempt(
          claim,
          1,
          { kind: "published", result: {} },
          SLOT
        );
      }
      expect(await schedule("tweet", { destinations: social })).toEqual({
        ok: false,
        reason: "social_already_posted",
      });
      // Another account of the same platform can still get it.
      await db.insert(connectedSocialAccounts).values({
        id: "x-2",
        organizationId: ORG,
        provider: "twitter",
        providerAccountId: "p-2",
        username: "acme2",
        displayName: "Acme 2",
      });
      expect(
        (
          await schedule("tweet", {
            destinations: [{ destination: "social", accountId: "x-2" }],
          })
        ).ok
      ).toBe(true);
    });

    test("moving a schedule keeps the pull request opened ahead", async () => {
      await seedPost("p1");
      const github = [
        { destination: "github" as const, repositoryId: "repo-1", merge: true },
      ];
      await schedule("p1", { destinations: github });
      const opened = {
        pullRequestNumber: 7,
        pullRequestUrl: "https://github.com/acme/site/pull/7",
        headSha: "abc",
        contentHash: "hash",
      };
      await lifecycle.recordScheduledPullRequest({
        organizationId: ORG,
        postId: "p1",
        repositoryId: "repo-1",
        result: opened,
      });
      await schedule("p1", {
        destinations: github,
        scheduledAt: new Date(SLOT.getTime() + 24 * 60 * MINUTE),
      });
      const active = (await rowsFor("p1")).filter(
        (row) => row.status === "scheduled"
      );
      expect(
        active.find((row) => row.destination === "github")?.result
      ).toEqual(opened);
      expect(
        active.find((row) => row.destination === "notra")?.result
      ).toBeNull();
    });

    test("a social send that definitely failed can be rescheduled and canceled", async () => {
      await seedPost("tweet", "twitter_post");
      const social = [{ destination: "social" as const, accountId: "x-1" }];
      await schedule("tweet", { destinations: social });
      const claims = await lifecycle.claimDueScheduledPublications({
        now: SLOT,
      });
      const send = claims.find((claim) => claim.destination === "social");
      if (!send) {
        throw new Error("expected the social claim");
      }
      for (const claim of claims) {
        if (claim !== send) {
          await lifecycle.finishScheduledPublicationAttempt(
            claim,
            1,
            { kind: "published", result: {} },
            SLOT
          );
        }
      }
      await lifecycle.markScheduledPublicationExternalAttempt(send, SLOT);
      await lifecycle.cancelPostSchedule({
        organizationId: ORG,
        postId: "tweet",
      });
      expect(
        await lifecycle.finishScheduledPublicationAttempt(
          send,
          1,
          {
            kind: "error",
            code: "social_publish_failed",
            message: "rejected",
            retryable: false,
          },
          SLOT
        )
      ).toBe("canceled");
      const row = (await rowsFor("tweet")).find(
        (item) => item.destination === "social"
      );
      expect(row?.externalAttemptAt).toBeNull();
      expect((await schedule("tweet", { destinations: social })).ok).toBe(true);
    });

    test("a start that failed after a cancel ends canceled", async () => {
      await seedPost("p1");
      await schedule("p1");
      const [claim] = await lifecycle.claimDueScheduledPublications({
        now: SLOT,
      });
      if (!claim) {
        throw new Error("expected a claim");
      }
      await lifecycle.cancelPostSchedule({ organizationId: ORG, postId: "p1" });
      expect(
        await lifecycle.releaseScheduledPublicationClaim(claim, SLOT)
      ).toBe("canceled");
      expect((await rowsFor("p1"))[0]?.status).toBe("canceled");
    });

    test("a late pull request record does not replace a newer one", async () => {
      await seedPost("p1");
      await schedule("p1", {
        destinations: [
          { destination: "github", repositoryId: "repo-1", merge: true },
        ],
      });
      const record = (headSha: string) =>
        lifecycle.recordScheduledPullRequest({
          organizationId: ORG,
          postId: "p1",
          repositoryId: "repo-1",
          result: {
            pullRequestNumber: 7,
            pullRequestUrl: "https://github.com/acme/site/pull/7",
            headSha,
            contentHash: "hash",
          },
        });
      await record("new");
      await record("old");
      const github = (await rowsFor("p1")).find(
        (row) => row.destination === "github"
      );
      expect(github?.result?.headSha).toBe("new");
    });

    test("publish now makes the schedule due immediately", async () => {
      await seedPost("p1");
      await schedule("p1");
      const now = new Date(NOW.getTime() + MINUTE);
      expect(
        await lifecycle.publishPostScheduleNow({
          organizationId: ORG,
          postId: "p1",
          now,
        })
      ).toBe(1);
      expect(
        await lifecycle.claimDueScheduledPublications({ now })
      ).toHaveLength(1);
    });

    test("retry re-arms a failed row unless a newer schedule is active", async () => {
      await seedPost("p1");
      await schedule("p1");
      const [claim] = await lifecycle.claimDueScheduledPublications({
        now: SLOT,
      });
      if (!claim) {
        throw new Error("expected a claim");
      }
      await lifecycle.finishScheduledPublicationAttempt(claim, 1, {
        kind: "error",
        code: "unexpected",
        message: "boom",
        retryable: false,
      });
      const retried = await lifecycle.retryScheduledPublication({
        organizationId: ORG,
        scheduledPublicationId: claim.id,
        now: SLOT,
      });
      expect(retried).toEqual({ ok: true, postId: "p1" });
      const [row] = await rowsFor("p1");
      expect(row?.status).toBe("scheduled");
      expect(row?.attempts).toBe(0);
      expect(
        await lifecycle.retryScheduledPublication({
          organizationId: ORG,
          scheduledPublicationId: claim.id,
        })
      ).toEqual({ ok: false, reason: "not_found" });
    });
  });

  describe("stale views and stuck starts", () => {
    test("replacing a schedule the caller did not see is rejected", async () => {
      await seedPost("tweet", "twitter_post");
      await schedule("tweet", {
        destinations: [{ destination: "social", accountId: "x-1" }],
      });
      const seen = (await rowsFor("tweet")).map((row) => row.id);
      // The sweep publishes both rows while the user still has the page open.
      const claims = await lifecycle.claimDueScheduledPublications({
        now: SLOT,
      });
      for (const claim of claims) {
        await lifecycle.finishScheduledPublicationAttempt(claim, 1, {
          kind: "published",
          result: {},
        });
      }
      expect(await schedule("tweet", { expectedScheduledIds: seen })).toEqual({
        ok: false,
        reason: "conflict",
      });
      expect(
        (await rowsFor("tweet")).filter((row) => row.status === "scheduled")
      ).toHaveLength(0);
    });

    test("replacing exactly the rows on screen works", async () => {
      await seedPost("p1");
      await schedule("p1");
      const seen = (await rowsFor("p1")).map((row) => row.id);
      const later = new Date(SLOT.getTime() + 60 * MINUTE);
      const outcome = await schedule("p1", {
        scheduledAt: later,
        expectedScheduledIds: seen,
      });
      expect(outcome.ok).toBe(true);
    });

    test("a start that keeps failing is given up after the budget", async () => {
      await seedPost("p1");
      await schedule("p1");
      const [early] = await lifecycle.claimDueScheduledPublications({
        now: SLOT,
      });
      if (!early) {
        throw new Error("expected a claim");
      }
      expect(
        await lifecycle.releaseScheduledPublicationClaim(early, SLOT)
      ).toBe("released");
      const late = new Date(
        SLOT.getTime() + SCHEDULED_PUBLICATION_START_BUDGET_MS + MINUTE
      );
      const [again] = await lifecycle.claimDueScheduledPublications({
        now: late,
      });
      if (!again) {
        throw new Error("expected a second claim");
      }
      expect(
        await lifecycle.releaseScheduledPublicationClaim(again, late)
      ).toBe("failed");
      const [row] = await rowsFor("p1");
      expect(row?.status).toBe("failed");
      expect(row?.errorCode).toBe("start_failed");
    });

    test("an attempt carries what earlier attempts achieved", async () => {
      await seedPost("p1");
      await schedule("p1", {
        destinations: [
          { destination: "github", repositoryId: "repo-1", merge: true },
        ],
      });
      const github = (
        await lifecycle.claimDueScheduledPublications({ now: SLOT })
      ).find((claim) => claim.destination === "github");
      if (!github) {
        throw new Error("expected the github claim");
      }
      await lifecycle.finishScheduledPublicationAttempt(
        github,
        1,
        {
          kind: "error",
          code: "github_merge_failed",
          message: "checks pending",
          retryable: true,
          result: { pullRequestNumber: 7, pullRequestUrl: "https://pr/7" },
        },
        SLOT
      );
      const retryAt = new Date(SLOT.getTime() + 2 * MINUTE);
      const [retry] = await lifecycle.claimDueScheduledPublications({
        now: retryAt,
      });
      const begun = retry
        ? await lifecycle.beginScheduledPublicationAttempt(retry, retryAt)
        : null;
      expect(begun?.attempt.result).toEqual({
        pullRequestNumber: 7,
        pullRequestUrl: "https://pr/7",
      });
    });
  });

  describe("listContentCalendar", () => {
    test("shows schedules and published posts", async () => {
      await seedPost("scheduled");
      await seedPost("draft");
      await seedPost("published", "blog_post", { status: "published" });
      await seedPost("other-project", "changelog", {
        projectId: null,
      });
      await schedule("scheduled");

      const calendar = await listContentCalendar({
        organizationId: ORG,
        from: new Date("2026-09-28T00:00:00.000Z"),
        to: new Date("2026-11-09T00:00:00.000Z"),
      });
      expect(
        calendar.entries.map((entry) => [entry.kind, entry.post.id]).sort()
      ).toEqual([
        ["published", "published"],
        ["scheduled", "scheduled"],
      ]);
    });

    test("a post published by its schedule shows up once", async () => {
      await seedPost("p1");
      await schedule("p1");
      const [claim] = await lifecycle.claimDueScheduledPublications({
        now: SLOT,
      });
      if (!claim) {
        throw new Error("expected a claim");
      }
      await db
        .update(posts)
        .set({ status: "published", publishedAt: SLOT })
        .where(eq(posts.id, "p1"));
      await lifecycle.finishScheduledPublicationAttempt(
        claim,
        1,
        { kind: "published", result: {} },
        SLOT
      );
      const calendar = await listContentCalendar({
        organizationId: ORG,
        from: new Date("2026-10-01T00:00:00.000Z"),
        to: new Date("2026-10-31T00:00:00.000Z"),
      });
      expect(calendar.entries).toHaveLength(1);
      expect(calendar.entries[0]?.kind).toBe("scheduled");
    });
  });
}
