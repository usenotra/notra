import { seedSystemSkills } from "@notra/ai/skills/seed";
import { db } from "@notra/db/drizzle";
import {
  contentTriggerLookbackWindows,
  contentTriggers,
  geoAgentReadinessReports,
  geoPersonas,
  githubIntegrations,
  members,
  skills,
  users,
} from "@notra/db/schema";
import { GEO_DEMO_AGENT_READINESS_REPORT } from "@notra/geo-core/constants/geo-demo";
import { normalizeWebsiteUrl } from "@notra/geo-core/utils/geo-website";
import { createDemoClock } from "@notra/utils/demo-clock";

import { DEMO_COMPANY_WEBSITE } from "@/constants/demo";
import {
  DEMO_SEED_GITHUB_REPOSITORY,
  DEMO_SEED_PERSONAS,
  DEMO_SEED_SCHEDULES,
  DEMO_SEED_SKILLS,
  DEMO_SEED_TEAMMATES,
} from "@/constants/demo-seed-workspace";
import type { DemoSeedContext } from "@/types/demo";

/**
 * Teammates are real user rows so the members page and "created by" labels
 * work. Emails get the organization id appended to stay globally unique.
 */
export async function seedDemoTeam(context: DemoSeedContext) {
  const clock = createDemoClock(context.now, context.timeZone);
  for (const teammate of DEMO_SEED_TEAMMATES) {
    const userId = crypto.randomUUID();
    const joinedAt = clock.ago({ days: teammate.joinedDaysAgo });
    const [local, domain] = teammate.email.split("@");
    await db.insert(users).values({
      id: userId,
      name: teammate.name,
      email: `${local}+${context.organizationId.slice(0, 8)}@${domain}`,
      emailVerified: true,
      createdAt: joinedAt,
      updatedAt: joinedAt,
    });
    await db.insert(members).values({
      id: crypto.randomUUID(),
      organizationId: context.organizationId,
      userId,
      role: teammate.role,
      createdAt: joinedAt,
    });
  }
}

export async function seedDemoSkills(context: DemoSeedContext) {
  await seedSystemSkills(context.organizationId);
  await db.insert(skills).values(
    DEMO_SEED_SKILLS.map((skill) => ({
      id: crypto.randomUUID(),
      organizationId: context.organizationId,
      ...skill,
      createdAt: context.now,
      updatedAt: context.now,
    }))
  );
}

/**
 * A sample GitHub repository (no token, so nothing is ever fetched) and the
 * schedules that use it. They are never registered with QStash; the visitor
 * runs them with "Run now".
 */
export async function seedDemoAutomation(context: DemoSeedContext) {
  const clock = createDemoClock(context.now, context.timeZone);
  const repositoryId = crypto.randomUUID();
  const connectedAt = clock.ago({ days: 120 });
  await db.insert(githubIntegrations).values({
    id: repositoryId,
    organizationId: context.organizationId,
    createdByUserId: context.ownerUserId,
    ...DEMO_SEED_GITHUB_REPOSITORY,
    githubRepositoryPrivate: true,
    createdAt: connectedAt,
    updatedAt: connectedAt,
  });

  for (const [index, schedule] of DEMO_SEED_SCHEDULES.entries()) {
    const triggerId = crypto.randomUUID();
    const createdAt = clock.ago({ days: 60 - index * 14 });
    await db.insert(contentTriggers).values({
      id: triggerId,
      organizationId: context.organizationId,
      name: schedule.name,
      sourceType: "cron",
      sourceConfig: { cron: schedule.cron },
      targets: { repositoryIds: [repositoryId] },
      outputType: schedule.outputType,
      outputConfig: { instructions: schedule.instructions },
      dedupeHash: `demo-${schedule.outputType}-${index}`,
      qstashScheduleId: `demo-schedule-${triggerId}`,
      enabled: true,
      autoPublish: schedule.autoPublish,
      createdAt,
      updatedAt: createdAt,
    });
    await db.insert(contentTriggerLookbackWindows).values({
      triggerId,
      window: schedule.lookbackWindow,
      updatedAt: createdAt,
    });
  }
}

export async function seedDemoGeoExtras(
  context: DemoSeedContext & { projectId: string }
) {
  const clock = createDemoClock(context.now, context.timeZone);
  await db.insert(geoPersonas).values(
    DEMO_SEED_PERSONAS.map((persona, index) => {
      const createdAt = clock.ago({ days: 20 - index * 5 });
      return {
        id: crypto.randomUUID(),
        organizationId: context.organizationId,
        projectId: context.projectId,
        ...persona,
        createdAt,
        updatedAt: createdAt,
      };
    })
  );

  const scannedAt = clock.ago({ days: 3, hours: 2 });
  await db.insert(geoAgentReadinessReports).values({
    id: crypto.randomUUID(),
    organizationId: context.organizationId,
    projectId: context.projectId,
    // Must match how the page resolves the brand website.
    targetUrl:
      normalizeWebsiteUrl(DEMO_COMPANY_WEBSITE) ?? DEMO_COMPANY_WEBSITE,
    status: "completed",
    ...GEO_DEMO_AGENT_READINESS_REPORT,
    scannedAt,
    createdAt: scannedAt,
    updatedAt: scannedAt,
  });
}
