import {
  EVE_AGENT_ORGANIZATION_HEADER,
  EVE_AGENT_RESERVATION_HEADER,
  EVE_AGENT_SERVICE_USERNAME,
} from "@notra/ai/constants/onboarding-agent";
import {
  createSlackConnectChannelWithInvite,
  hasSlackConnectConfigured,
} from "@notra/ai/integrations/slack";
import { buildExternalChannelName } from "@notra/ai/utils/slack";
import { db } from "@notra/db/drizzle";
import { brandSettings, organizations } from "@notra/db/schema";
import {
  eveCreateSessionResponseSchema,
  OnboardingAgentCompensationError,
  OnboardingAgentTriggerError,
} from "@notra/schemas/dashboard/onboarding-agent";
import { getVercelOidcToken } from "@vercel/oidc";
import { and, eq, isNull, lt, or } from "drizzle-orm";
import { Effect } from "effect";
import { Client } from "eve/client";
import { isFreeEmail } from "free-email-domains-list";

import {
  AGENT_RUN_HARD_LIMIT_MS,
  AGENT_RUN_LEASE_MARGIN_MS,
  EVE_CREATE_SESSION_ROUTE_PATH,
  EVE_SESSION_TASK_MODE,
  TRAILING_SLASH_PATTERN,
} from "@/constants/onboarding-agent";
import {
  resolveCompanyDomain,
  resolveReachableWebsiteUrl,
} from "@/lib/onboarding/company-domain";
import { isEduEmail } from "@/lib/onboarding/edu-email";
import { buildOnboardingAgentMessage } from "@/lib/onboarding/onboarding-agent-message";
import { startOnboardingAgentRun } from "@/lib/workflows/start";
import type {
  EnsureDefaultBrandIdentityInput,
  LaunchReservedOnboardingAgentInput,
  OnboardingSlackInviteInput,
  OnboardingSlackInviteResult,
  SelfServeOnboardingAgentResult,
  StartOnboardingAgentSessionInput,
  StartSelfServeOnboardingAgentInput,
} from "@/types/onboarding-agent";

function getEveOnboardingAgentUrl() {
  const url = process.env.EVE_ONBOARDING_AGENT_URL;
  if (!url) {
    throw new Error("EVE_ONBOARDING_AGENT_URL is not configured");
  }
  return url.replace(TRAILING_SLASH_PATTERN, "");
}

async function createEveAgentClient(
  organizationId: string,
  reservedAt: string
) {
  const clientOptions = {
    headers: {
      [EVE_AGENT_ORGANIZATION_HEADER]: organizationId,
      [EVE_AGENT_RESERVATION_HEADER]: reservedAt,
    },
    host: getEveOnboardingAgentUrl(),
    redirect: "error" as const,
  };

  const token = await getVercelOidcToken().catch(() => null);
  if (token) {
    return new Client({
      ...clientOptions,
      auth: { vercelOidc: { token } },
    });
  }

  const password = process.env.EVE_ONBOARDING_AGENT_PASSWORD;
  if (password) {
    return new Client({
      ...clientOptions,
      auth: {
        basic: { password, username: EVE_AGENT_SERVICE_USERNAME },
      },
    });
  }

  throw new Error(
    "Onboarding agent auth is not configured: no Vercel OIDC token and EVE_ONBOARDING_AGENT_PASSWORD is not set"
  );
}

export async function reserveInitialOnboardingAgentRun(
  organizationId: string
): Promise<Date | null> {
  const reservedAt = new Date();
  const staleBefore = new Date(
    reservedAt.getTime() - (AGENT_RUN_HARD_LIMIT_MS + AGENT_RUN_LEASE_MARGIN_MS)
  );
  const reserved = await db
    .update(organizations)
    .set({ onboardingAgentStartedAt: reservedAt })
    .where(
      and(
        eq(organizations.id, organizationId),
        eq(organizations.onboardingAgentRan, false),
        or(
          isNull(organizations.onboardingAgentStartedAt),
          lt(organizations.onboardingAgentStartedAt, staleBefore)
        )
      )
    )
    .returning({ id: organizations.id });
  return reserved.length > 0 ? reservedAt : null;
}

export async function releaseOnboardingAgentReservation(
  organizationId: string,
  reservedAt: Date
): Promise<void> {
  await db
    .update(organizations)
    .set({ onboardingAgentStartedAt: null })
    .where(
      and(
        eq(organizations.id, organizationId),
        eq(organizations.onboardingAgentRan, false),
        eq(organizations.onboardingAgentStartedAt, reservedAt)
      )
    );
}

export const launchReservedOnboardingAgent = Effect.fn(
  "launchReservedOnboardingAgent"
)(function* ({ payload, reservedAt }: LaunchReservedOnboardingAgentInput) {
  const organizationId = payload.organizationId;
  return yield* Effect.tryPromise({
    try: () =>
      startOnboardingAgentRun({
        ...payload,
        reservedAt: reservedAt.toISOString(),
      }),
    catch: (cause) =>
      new OnboardingAgentTriggerError({ cause, organizationId }),
  }).pipe(
    Effect.catchTag("OnboardingAgentTriggerError", (triggerError) =>
      Effect.tryPromise({
        try: () =>
          releaseOnboardingAgentReservation(organizationId, reservedAt),
        catch: (cause) =>
          new OnboardingAgentCompensationError({
            cause,
            organizationId,
            triggerCause: triggerError.cause,
          }),
      }).pipe(Effect.flatMap(() => Effect.fail(triggerError)))
    )
  );
});

export async function startOnboardingAgentSession({
  organizationId,
  domain,
  reservedAt,
}: StartOnboardingAgentSessionInput) {
  const client = await createEveAgentClient(organizationId, reservedAt);
  const response = await client.fetch(EVE_CREATE_SESSION_ROUTE_PATH, {
    body: JSON.stringify({
      message: buildOnboardingAgentMessage(domain, organizationId),
      mode: EVE_SESSION_TASK_MODE,
    }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Failed to start onboarding agent session (${response.status}): ${body}`
    );
  }
  const payload = eveCreateSessionResponseSchema.parse(await response.json());
  return { sessionId: payload.sessionId };
}

export async function sendOnboardingSlackInvite({
  email,
  organizationName,
}: OnboardingSlackInviteInput): Promise<OnboardingSlackInviteResult> {
  const normalizedEmail = email.trim().toLowerCase();
  if (
    !hasSlackConnectConfigured() ||
    isFreeEmail(normalizedEmail) ||
    isEduEmail(normalizedEmail)
  ) {
    return { invited: false };
  }

  try {
    const channelName = buildExternalChannelName(organizationName);
    const result = await createSlackConnectChannelWithInvite({
      channelName,
      email,
      externalLimited: false,
    });
    return { channelId: result.channelId, invited: true };
  } catch (error) {
    console.error(
      `[Onboarding Agent] Slack Connect invite failed for ${organizationName}`,
      error
    );
    return { invited: false };
  }
}

export async function ensureDefaultBrandIdentity({
  companyName,
  organizationId,
  websiteUrl,
}: EnsureDefaultBrandIdentityInput) {
  const existing = await db.query.brandSettings.findFirst({
    columns: { id: true },
    where: and(
      eq(brandSettings.organizationId, organizationId),
      eq(brandSettings.isDefault, true)
    ),
  });
  if (existing) {
    return;
  }

  await db
    .insert(brandSettings)
    .values({
      companyName,
      id: crypto.randomUUID(),
      isDefault: true,
      name: companyName,
      organizationId,
      websiteUrl,
    })
    .onConflictDoNothing();

  const created = await db.query.brandSettings.findFirst({
    columns: { id: true },
    where: and(
      eq(brandSettings.organizationId, organizationId),
      eq(brandSettings.isDefault, true)
    ),
  });
  if (!created) {
    throw new Error("Failed to create the default brand identity");
  }
}

export async function startSelfServeOnboardingAgent({
  email,
  organizationId,
}: StartSelfServeOnboardingAgentInput): Promise<SelfServeOnboardingAgentResult> {
  const organization = await db.query.organizations.findFirst({
    columns: {
      name: true,
      onboardingAgentRan: true,
      onboardingAgentStartedAt: true,
    },
    where: eq(organizations.id, organizationId),
  });
  if (!organization) {
    throw new Error("Organization not found");
  }
  if (organization.onboardingAgentRan) {
    return { reason: "already-ran", started: false };
  }
  if (
    organization.onboardingAgentStartedAt &&
    Date.now() - organization.onboardingAgentStartedAt.getTime() <
      AGENT_RUN_HARD_LIMIT_MS
  ) {
    return { reason: "already-running", started: false };
  }

  const brand = await db.query.brandSettings.findFirst({
    columns: { websiteUrl: true },
    where: and(
      eq(brandSettings.organizationId, organizationId),
      eq(brandSettings.isDefault, true)
    ),
  });

  const resolution = resolveCompanyDomain({
    email,
    websiteUrl: brand?.websiteUrl ?? undefined,
  });
  if (!resolution) {
    return { reason: "no-company-domain", started: false };
  }

  const websiteUrl = await resolveReachableWebsiteUrl(resolution.domain);
  if (!websiteUrl) {
    return { reason: "website-unreachable", started: false };
  }

  await ensureDefaultBrandIdentity({
    companyName: organization.name,
    organizationId,
    websiteUrl,
  });

  const reservedAt = await reserveInitialOnboardingAgentRun(organizationId);
  if (!reservedAt) {
    return { reason: "already-running", started: false };
  }

  await Effect.runPromise(
    launchReservedOnboardingAgent({
      payload: { domain: resolution.domain, organizationId },
      reservedAt,
    })
  );

  return { started: true };
}

export async function getOnboardingAgentState(organizationId: string) {
  const organization = await db.query.organizations.findFirst({
    columns: { onboardingAgentRan: true, onboardingAgentStartedAt: true },
    where: eq(organizations.id, organizationId),
  });
  return {
    ran: organization?.onboardingAgentRan ?? false,
    startedAt: organization?.onboardingAgentStartedAt ?? null,
  };
}
