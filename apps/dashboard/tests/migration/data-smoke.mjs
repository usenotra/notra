import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { SQL } from "bun";

import { LOCAL_ENVIRONMENT } from "../../scripts/migration/constants/environment.mjs";
import { FIXTURE } from "./constants/parity.mjs";
import { parityTarget } from "./utils/parity-target.mjs";
import { rpcRequest } from "./utils/rpc-request.mjs";

const base = parityTarget(process.argv[2]);
const output = resolve(process.argv[3]);
const sql = new SQL(LOCAL_ENVIRONMENT.DATABASE_URL);
const results = [];
const token = `migration-smoke-${randomUUID()}`;
let owned;
let fixtureCreated = false;
try {
  const [database] =
    await sql`SELECT current_database() AS name, current_user AS owner`;
  assert.deepEqual(database, {
    name: "notra_migration_test",
    owner: "notra_test",
  });
  const session = await fetch(`${base}/api/session`, {
    redirect: "manual",
    signal: AbortSignal.timeout(30000),
  });
  assert.equal(session.status, 200);
  assert.equal((await session.json())?.user?.id, FIXTURE.userId);
  results.push({
    check: "isolated-database-and-development-identity",
    passed: true,
  });

  await sql.begin(async (tx) => {
    await tx`INSERT INTO post_collections (id, organization_id, source, name)
      VALUES (${token}, ${FIXTURE.otherOrganizationId}, 'manual', ${token})`;
    await tx`INSERT INTO posts (id, organization_id, collection_id, title, content, markdown, content_type, status)
      VALUES (${token}, ${FIXTURE.otherOrganizationId}, ${token}, ${token}, '<p>Other tenant draft</p>', 'Other tenant draft', 'blog_post', 'draft')`;
  });
  fixtureCreated = true;
  owned = await rpcRequest(base, "content/create", {
    organizationId: FIXTURE.organizationId,
    title: token,
    contentType: "blog_post",
    markdown: "# Original draft",
  });
  assert.equal(typeof owned.contentId, "string");
  assert.equal(typeof owned.collectionId, "string");
  const input = {
    organizationId: FIXTURE.organizationId,
    contentId: owned.contentId,
  };
  results.push({ check: "create-manual-draft", passed: true });

  for (const [check, verify] of [
    [
      "read-created-draft-and-collection",
      async () => {
        const result = await rpcRequest(base, "content/get", input);
        assert.equal(result.content.title, token);
        assert.equal(result.content.markdown, "# Original draft");
        assert.equal(result.content.status, "draft");
        assert.equal(result.collection.id, owned.collectionId);
      },
    ],
    [
      "list-pagination-and-tenant-filter",
      async () => {
        const result = await rpcRequest(base, "content/list", {
          organizationId: FIXTURE.organizationId,
          page: 1,
          pageSize: 100,
        });
        assert.ok(result.posts.some((post) => post.id === owned.contentId));
        assert.equal(
          result.posts.some((post) => post.id === token),
          false
        );
        assert.equal(result.pagination.page, 1);
        assert.equal(result.pagination.pageSize, 100);
        const empty = await rpcRequest(base, "content/list", {
          organizationId: FIXTURE.organizationId,
          page: result.pagination.totalPages + 1,
          pageSize: 100,
        });
        assert.deepEqual(empty.posts, []);
      },
    ],
    [
      "edit-persists-and-sanitizes-html",
      async () => {
        const markdown =
          '# Edited draft\n\n<script>alert("unsafe")</script>\n\n**Safe text**';
        const result = await rpcRequest(base, "content/update", {
          ...input,
          title: `${token}-edited`,
          markdown,
        });
        assert.equal(result.success, true);
        const read = await rpcRequest(base, "content/get", input);
        assert.equal(read.content.title, `${token}-edited`);
        assert.equal(read.content.markdown, markdown);
        assert.ok(read.content.content.includes("<strong>Safe text</strong>"));
        assert.equal(read.content.content.includes("<script>"), false);
        const [row] =
          await sql`SELECT title, markdown FROM posts WHERE id = ${owned.contentId} AND organization_id = ${FIXTURE.organizationId}`;
        assert.equal(row.title, read.content.title);
        assert.equal(row.markdown, markdown);
      },
    ],
    [
      "invalid-edit-rejected-without-write",
      async () => {
        const before = await rpcRequest(base, "content/get", input);
        await rpcRequest(base, "content/update", { ...input, title: "" }, 400);
        await rpcRequest(base, "content/update", input, 400);
        assert.deepEqual(await rpcRequest(base, "content/get", input), before);
      },
    ],
    [
      "cross-tenant-read-update-delete-denied",
      async () => {
        for (const procedure of ["get", "update", "delete"]) {
          const mutation =
            procedure === "update" ? { title: "Forbidden change" } : {};
          await rpcRequest(
            base,
            `content/${procedure}`,
            {
              organizationId: FIXTURE.otherOrganizationId,
              contentId: token,
              ...mutation,
            },
            403
          );
          await rpcRequest(
            base,
            `content/${procedure}`,
            {
              organizationId: FIXTURE.organizationId,
              contentId: token,
              ...mutation,
            },
            404
          );
        }
        const [row] = await sql`SELECT title FROM posts WHERE id = ${token}`;
        assert.equal(row.title, token);
      },
    ],
    [
      "spoofed-public-request-cannot-mutate",
      async () => {
        const response = await fetch(`${base}/rpc/content/delete`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-forwarded-for": "203.0.113.10",
          },
          body: JSON.stringify({ json: input }),
          redirect: "manual",
          signal: AbortSignal.timeout(30000),
        });
        assert.equal(response.status, 403);
        await rpcRequest(base, "content/get", input);
      },
    ],
    [
      "get-cannot-invoke-delete-mutation",
      async () => {
        const response = await fetch(
          `${base}/rpc/content/delete?data=${encodeURIComponent(JSON.stringify({ json: input }))}`,
          {
            redirect: "manual",
            signal: AbortSignal.timeout(30000),
          }
        );
        assert.equal(response.status, 405);
        await rpcRequest(base, "content/get", input);
      },
    ],
    [
      "delete-persists-and-repeat-is-not-found",
      async () => {
        assert.equal(
          (await rpcRequest(base, "content/delete", input)).success,
          true
        );
        await rpcRequest(base, "content/get", input, 404);
        await rpcRequest(base, "content/delete", input, 404);
        assert.equal(
          (await sql`SELECT id FROM posts WHERE id = ${owned.contentId}`)
            .length,
          0
        );
      },
    ],
  ]) {
    try {
      await verify();
      results.push({ check, passed: true });
    } catch (error) {
      results.push({ check, passed: false, error: String(error) });
    }
  }
} catch (error) {
  results.push({ check: "fixture-setup", passed: false, error: String(error) });
} finally {
  try {
    if (owned?.collectionId) {
      await sql`DELETE FROM post_collections WHERE id = ${owned.collectionId} AND organization_id = ${FIXTURE.organizationId}`;
    }
    if (fixtureCreated) {
      await sql`DELETE FROM post_collections WHERE id = ${token} AND organization_id = ${FIXTURE.otherOrganizationId}`;
    }
    results.push({ check: "exact-fixture-cleanup", passed: true });
  } catch (error) {
    results.push({
      check: "exact-fixture-cleanup",
      passed: false,
      error: String(error),
    });
  }
  await sql.close();
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(
    output,
    JSON.stringify({ base, profile: "development-fixture", results }, null, 2),
    { flag: "wx" }
  );
}
console.log(JSON.stringify(results, null, 2));
process.exitCode = results.every((result) => result.passed) ? 0 : 1;
