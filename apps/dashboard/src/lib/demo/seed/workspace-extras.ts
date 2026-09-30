import { seedSystemSkills } from "@notra/ai/skills/seed";
import { db } from "@notra/db/drizzle";
import {
  connectedSocialAccounts,
  contentTriggerLookbackWindows,
  contentTriggers,
  geoAgentReadinessReports,
  geoPersonas,
  githubIntegrations,
  members,
  skills,
  trackedSocialAccounts,
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
  DEMO_SEED_SOCIAL_ACCOUNTS,
  DEMO_SEED_TEAMMATES,
} from "@/constants/demo-seed-workspace";
import type { DemoSeedContext } from "@/types/demo";

/**
 * Teammates are real user rows so the members page and "created by" labels
 * work. Emails get the organization id appended to stay globally unique.
 */
export async function seedDemoTeam(context: DemoSeedContext) {
  const clock = createDemoClock(context.now, context.timeZone);
  const teammates = DEMO_SEED_TEAMMATES.map((teammate) => {
    const [local, domain] = teammate.email.split("@");
    return {
      ...teammate,
      userId: crypto.randomUUID(),
      email: `${local}+${context.organizationId.slice(0, 8)}@${domain}`,
      joinedAt: clock.ago({ days: teammate.joinedDaysAgo }),
    };
  });
  await db.insert(users).values(
    teammates.map((teammate) => ({
      id: teammate.userId,
      name: teammate.name,
      email: teammate.email,
      emailVerified: true,
      createdAt: teammate.joinedAt,
      updatedAt: teammate.joinedAt,
    }))
  );
  await db.insert(members).values(
    teammates.map((teammate) => ({
      id: crypto.randomUUID(),
      organizationId: context.organizationId,
      userId: teammate.userId,
      role: teammate.role,
      createdAt: teammate.joinedAt,
    }))
  );
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

  const schedules = DEMO_SEED_SCHEDULES.map((schedule, index) => ({
    ...schedule,
    index,
    triggerId: crypto.randomUUID(),
    createdAt: clock.ago({ days: 60 - index * 14 }),
  }));
  await db.insert(contentTriggers).values(
    schedules.map((schedule) => ({
      id: schedule.triggerId,
      organizationId: context.organizationId,
      name: schedule.name,
      sourceType: "cron",
      sourceConfig: { cron: schedule.cron },
      targets: { repositoryIds: [repositoryId] },
      outputType: schedule.outputType,
      outputConfig: { instructions: schedule.instructions },
      dedupeHash: `demo-${schedule.outputType}-${schedule.index}`,
      qstashScheduleId: `demo-schedule-${schedule.triggerId}`,
      enabled: true,
      autoPublish: schedule.autoPublish,
      createdAt: schedule.createdAt,
      updatedAt: schedule.createdAt,
    }))
  );
  await db.insert(contentTriggerLookbackWindows).values(
    schedules.map((schedule) => ({
      triggerId: schedule.triggerId,
      window: schedule.lookbackWindow,
      updatedAt: schedule.createdAt,
    }))
  );
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

const NON_HANDLE_CHARACTERS = /[^a-z0-9]+/g;

/** The company's own X and LinkedIn accounts plus two tracked rivals. */
export async function seedDemoSocial(context: DemoSeedContext) {
  const clock = createDemoClock(context.now, context.timeZone);
  const handle =
    context.companyName.toLowerCase().replaceAll(NON_HANDLE_CHARACTERS, "") ||
    "fieldnote";
  const rows = DEMO_SEED_SOCIAL_ACCOUNTS.map((account) => {
    const username = account.username ?? handle;
    const joinedAt = clock.ago({ days: account.joinedDaysAgo });
    return {
      id: crypto.randomUUID(),
      organizationId: context.organizationId,
      provider: account.provider,
      providerAccountId: `demo-${account.provider}-${username}`,
      username,
      displayName: account.displayName ?? context.companyName,
      profileImageUrl: null,
      verified: account.verified,
      verifiedType: account.verified ? "business" : null,
      createdAt: joinedAt,
      updatedAt: joinedAt,
      kind: account.kind,
    };
  });
  const strip = ({ kind: _kind, ...row }: (typeof rows)[number]) => row;
  await Promise.all([
    db
      .insert(connectedSocialAccounts)
      .values(rows.filter((row) => row.kind === "connected").map(strip)),
    db
      .insert(trackedSocialAccounts)
      .values(rows.filter((row) => row.kind === "tracked").map(strip)),
  ]);
}
