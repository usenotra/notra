import "dotenv/config";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { nanoid } from "nanoid";
// biome-ignore lint/performance/noNamespaceImport: Required for drizzle schema
import * as schema from "../src/schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is not defined");
  process.exit(1);
}

const db = drizzle(databaseUrl, { schema });

async function seed() {
  console.log("Starting automation seed...");

  const orgs = await db.select().from(schema.organizations);

  if (orgs.length === 0) {
    console.log("No organizations found. Please create an organization first.");
    process.exit(1);
  }

  console.log(`Found ${orgs.length} organizations`);

  for (const org of orgs) {
    console.log(`Seeding automation triggers for ${org.name} (${org.id})`);

    await db
      .delete(schema.contentTriggers)
      .where(eq(schema.contentTriggers.organizationId, org.id));

    const now = new Date();
    const triggersToInsert = [
      {
        id: nanoid(),
        organizationId: org.id,
        sourceType: "github_webhook",
        sourceConfig: { eventTypes: ["release"] },
        targets: { repositoryIds: ["seed-repo-1", "seed-repo-2"] },
        outputType: "changelog",
        outputConfig: null,
        dedupeHash: nanoid(),
        enabled: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: nanoid(),
        organizationId: org.id,
        sourceType: "cron",
        sourceConfig: {
          cron: {
            cadence: "weekly",
            hour: 9,
            minute: 0,
            dayOfWeek: 1,
          },
        },
        targets: { repositoryIds: ["seed-repo-3"] },
        outputType: "investor_update",
        outputConfig: null,
        dedupeHash: nanoid(),
        enabled: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: nanoid(),
        organizationId: org.id,
        sourceType: "github_webhook",
        sourceConfig: { eventTypes: ["push", "star"] },
        targets: { repositoryIds: ["seed-repo-4"] },
        outputType: "twitter_post",
        outputConfig: null,
        dedupeHash: nanoid(),
        enabled: false,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: nanoid(),
        organizationId: org.id,
        sourceType: "cron",
        sourceConfig: {
          cron: {
            cadence: "daily",
            hour: 16,
            minute: 30,
          },
        },
        targets: { repositoryIds: ["seed-repo-5"] },
        outputType: "blog_post",
        outputConfig: null,
        dedupeHash: nanoid(),
        enabled: false,
        createdAt: now,
        updatedAt: now,
      },
    ];

    await db.insert(schema.contentTriggers).values(triggersToInsert);
    console.log(
      `Inserted ${triggersToInsert.length} automation triggers for ${org.name}`,
    );
  }

  console.log("Automation seed completed successfully!");
  process.exit(0);
}

seed().catch((error) => {
  console.error("Automation seed failed:", error);
  process.exit(1);
});
