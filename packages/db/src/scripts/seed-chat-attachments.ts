import { randomUUID } from "node:crypto";

import { desc, eq } from "drizzle-orm";

import { db } from "../drizzle";
import { chatAttachments, members, organizations } from "../schema";

const SAMPLE_CHAT_ATTACHMENTS = [
  {
    filename: "Q3-brand-guidelines.pdf",
    mediaType: "application/pdf",
    size: 1_248_512,
    daysAgo: 2,
  },
  {
    filename: "product-hero.png",
    mediaType: "image/png",
    size: 486_400,
    daysAgo: 5,
  },
  {
    filename: "campaign-brief.md",
    mediaType: "text/markdown",
    size: 12_288,
    daysAgo: 8,
  },
  {
    filename: "competitor-teardown.pdf",
    mediaType: "application/pdf",
    size: 892_160,
    daysAgo: 12,
  },
  {
    filename: "logo-lockup.webp",
    mediaType: "image/webp",
    size: 64_512,
    daysAgo: 18,
  },
  {
    filename: "interview-notes.txt",
    mediaType: "text/plain",
    size: 4096,
    daysAgo: 21,
  },
] as const;

async function listTargetOrganizations() {
  const slug = process.env.SEED_ORGANIZATION_SLUG;
  if (slug) {
    const organization = await db.query.organizations.findFirst({
      where: eq(organizations.slug, slug),
      columns: { id: true, slug: true },
    });
    if (!organization) {
      throw new Error(`No organization found for slug "${slug}"`);
    }
    return [organization];
  }

  return db.query.organizations.findMany({
    columns: { id: true, slug: true },
    orderBy: [desc(organizations.createdAt)],
  });
}

async function resolveMemberUserId(organizationId: string) {
  const membership = await db.query.members.findFirst({
    where: eq(members.organizationId, organizationId),
    columns: { userId: true },
  });
  if (!membership) {
    throw new Error(`No members found for organization ${organizationId}`);
  }
  return membership.userId;
}

async function main() {
  const orgs = await listTargetOrganizations();
  if (orgs.length === 0) {
    throw new Error("No organization found");
  }

  const now = Date.now();

  for (const organization of orgs) {
    const userId = await resolveMemberUserId(organization.id);
    const rows = SAMPLE_CHAT_ATTACHMENTS.map((sample) => ({
      id: randomUUID(),
      organizationId: organization.id,
      userId,
      key: `organization/${organization.id}/chat/sample/${sample.filename}`,
      filename: sample.filename,
      mediaType: sample.mediaType,
      size: sample.size,
      createdAt: new Date(now - sample.daysAgo * 24 * 60 * 60 * 1000),
    }));

    await db
      .insert(chatAttachments)
      .values(rows)
      .onConflictDoNothing({ target: chatAttachments.key });

    console.log(
      `Seeded ${rows.length} sample attachments for ${organization.slug}`
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
