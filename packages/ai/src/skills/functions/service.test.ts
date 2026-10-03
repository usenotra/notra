import { expect, mock, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

if (process.env.NOTRA_SKILL_SERVICE_TEST_WORKER !== "1") {
  test("system skill defaults and organization edits", () => {
    const result = spawnSync(
      process.execPath,
      ["test", fileURLToPath(import.meta.url)],
      {
        env: { ...process.env, NOTRA_SKILL_SERVICE_TEST_WORKER: "1" },
        timeout: 25_000,
      }
    );
    expect(result.status, result.stderr.toString()).toBe(0);
  }, 30_000);
} else {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { eq } = await import("drizzle-orm");
  const { skills } = await import("@notra/db/schema");
  const { getConversationalBlogPostPrompt } =
    await import("../../prompts/blog_post/conversational");
  const { UNSLOP_CONTENT } = await import("../unslop-content");

  const client = new PGlite();
  const db = drizzle(client, { schema: { skills } });
  mock.module("@notra/db/drizzle", () => ({ db }));
  await client.exec(`
    create table skills (
      id text primary key,
      organization_id text not null,
      name text not null,
      description text not null,
      content text not null,
      is_system boolean not null default false,
      created_at timestamp not null default now(),
      updated_at timestamp not null default now(),
      unique (organization_id, name)
    );
  `);

  const { listSkillCatalog, loadSkillByName } = await import("./service");
  const ctx = { organizationId: "existing-org" };

  test("updates untouched blog defaults without discarding organization edits", async () => {
    await db.insert(skills).values({
      id: "blog",
      organizationId: ctx.organizationId,
      name: "blog-post",
      description: "Blog writing",
      content: "old seeded prompt",
      isSystem: true,
      createdAt: new Date("2025-01-01"),
      updatedAt: new Date("2025-01-01"),
    });

    expect((await loadSkillByName(ctx, "blog-post"))?.content).toBe(
      getConversationalBlogPostPrompt()
    );

    await db
      .update(skills)
      .set({ content: "Our own blog guidance" })
      .where(eq(skills.id, "blog"));
    expect((await loadSkillByName(ctx, "blog-post"))?.content).toBe(
      "Our own blog guidance"
    );
  });

  test("backfills unslop in the catalog and honors organization edits", async () => {
    expect((await loadSkillByName(ctx, "unslop"))?.content).toBe(
      UNSLOP_CONTENT
    );

    const catalog = await listSkillCatalog(ctx);
    expect(catalog.skills.some((skill) => skill.name === "unslop")).toBe(true);
    expect((await loadSkillByName(ctx, "unslop"))?.content).toBe(
      UNSLOP_CONTENT
    );

    await db
      .update(skills)
      .set({ content: "Our own final edit" })
      .where(eq(skills.name, "unslop"));
    expect((await loadSkillByName(ctx, "unslop"))?.content).toBe(
      "Our own final edit"
    );
  });
}
