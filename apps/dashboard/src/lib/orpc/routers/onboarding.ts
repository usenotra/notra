import { retrieveBrand, searchBrands } from "@notra/ai/utils/context-dev";
import { db } from "@notra/db/drizzle";
import {
  brandSettings,
  contentTriggers,
  geoSettings,
  githubIntegrations,
  onboardingSuggestions,
  organizations,
} from "@notra/db/schema";
import { organizationIdInputSchema } from "@notra/schemas/dashboard/auth/organization";
import {
  dismissSuggestionInputSchema,
  listSuggestionsInputSchema,
} from "@notra/schemas/dashboard/onboarding-agent";
import { companyLogoInputSchema } from "@notra/schemas/dashboard/onboarding/company-logo";
import { ORPCError } from "@orpc/server";
import { and, desc, eq } from "drizzle-orm";

import {
  AGENT_RUN_HARD_LIMIT_MS,
  SELF_SERVE_AGENT_ERROR_MESSAGES,
} from "@/constants/onboarding-agent";
import { assertOrganizationAccess } from "@/lib/auth/organization";
import {
  getOnboardingAgentState,
  startSelfServeOnboardingAgent,
} from "@/lib/onboarding-agent";
import {
  pickBrandSearchResult,
  pickCompanyLogoUrl,
} from "@/lib/onboarding/company-logo";
import { authorizedProcedure } from "@/lib/orpc/base";
import { ratelimit } from "@/utils/ratelimit";

export const onboardingRouter = {
  companyLogo: authorizedProcedure
    .input(companyLogoInputSchema)
    .handler(async ({ context, input }) => {
      const { success: withinLimit } = await ratelimit.companyLogo.limit(
        `${context.user.id}:${input.query.toLowerCase()}`
      );
      if (!withinLimit) {
        throw new ORPCError("TOO_MANY_REQUESTS", {
          message: "Too many logo lookups. Please try again shortly.",
        });
      }

      try {
        if (!input.searchByName) {
          const response = await retrieveBrand(input.query);
          return {
            domain: response.brand?.domain ?? input.query,
            url: pickCompanyLogoUrl(response.brand?.logos),
          };
        }

        const response = await searchBrands(input.query);
        const brand = pickBrandSearchResult(response.results, input.query);
        return {
          domain: brand?.domain ?? null,
          url: brand?.logo || null,
        };
      } catch {
        return {
          domain: input.searchByName ? null : input.query,
          url: null,
        };
      }
    }),
  get: authorizedProcedure
    .input(organizationIdInputSchema)
    .handler(async ({ context, input }) => {
      await assertOrganizationAccess({
        headers: context.headers,
        organizationId: input.organizationId,
        user: context.user,
      });

      const [org, brand, integration, schedule, geo] = await Promise.all([
        db.query.organizations.findFirst({
          columns: { onboardingCompleted: true, onboardingDismissed: true },
          where: eq(organizations.id, input.organizationId),
        }),
        db.query.brandSettings.findFirst({
          columns: { id: true },
          where: eq(brandSettings.organizationId, input.organizationId),
        }),
        db.query.githubIntegrations.findFirst({
          columns: { id: true },
          where: eq(githubIntegrations.organizationId, input.organizationId),
        }),
        db.query.contentTriggers.findFirst({
          columns: { id: true },
          where: and(
            eq(contentTriggers.organizationId, input.organizationId),
            eq(contentTriggers.sourceType, "cron")
          ),
        }),
        db.query.geoSettings.findFirst({
          columns: { id: true },
          where: eq(geoSettings.organizationId, input.organizationId),
        }),
      ]);

      const hasBrandIdentity = !!brand;
      const hasIntegration = !!integration;
      const hasSchedule = !!schedule;
      const hasGeoTracking = !!geo;
      const onboardingCompleted = org?.onboardingCompleted ?? false;
      const onboardingDismissed = org?.onboardingDismissed ?? false;

      if (
        hasBrandIdentity &&
        hasIntegration &&
        hasSchedule &&
        !onboardingCompleted
      ) {
        await db
          .update(organizations)
          .set({ onboardingCompleted: true })
          .where(eq(organizations.id, input.organizationId));
      }

      return {
        hasBrandIdentity,
        hasIntegration,
        hasSchedule,
        hasGeoTracking,
        onboardingCompleted:
          hasBrandIdentity && hasIntegration && hasSchedule
            ? true
            : onboardingCompleted,
        onboardingDismissed,
      };
    }),
  agentRun: authorizedProcedure
    .input(organizationIdInputSchema)
    .handler(async ({ context, input }) => {
      await assertOrganizationAccess({
        headers: context.headers,
        organizationId: input.organizationId,
        user: context.user,
      });

      const { ran, startedAt } = await getOnboardingAgentState(
        input.organizationId
      );
      const running =
        !ran &&
        startedAt !== null &&
        Date.now() - startedAt.getTime() < AGENT_RUN_HARD_LIMIT_MS;

      return { ran, running, startedAt };
    }),
  runAgent: authorizedProcedure
    .input(organizationIdInputSchema)
    .handler(async ({ context, input }) => {
      await assertOrganizationAccess({
        headers: context.headers,
        organizationId: input.organizationId,
        user: context.user,
      });

      const { success: withinLimit } = await ratelimit.onboardingAgent.limit(
        input.organizationId
      );
      if (!withinLimit) {
        throw new ORPCError("TOO_MANY_REQUESTS", {
          message:
            "Too many onboarding agent requests. Please try again shortly.",
        });
      }

      const result = await startSelfServeOnboardingAgent({
        email: context.user.email,
        organizationId: input.organizationId,
      });

      if (
        !result.started &&
        (result.reason === "no-company-domain" ||
          result.reason === "website-unreachable")
      ) {
        throw new ORPCError("BAD_REQUEST", {
          message: SELF_SERVE_AGENT_ERROR_MESSAGES[result.reason],
        });
      }

      return { started: result.started };
    }),
  suggestions: authorizedProcedure
    .input(listSuggestionsInputSchema)
    .handler(async ({ context, input }) => {
      await assertOrganizationAccess({
        headers: context.headers,
        organizationId: input.organizationId,
        user: context.user,
      });

      const filters = [
        eq(onboardingSuggestions.organizationId, input.organizationId),
      ];
      if (!input.includeDismissed) {
        filters.push(eq(onboardingSuggestions.dismissed, false));
      }

      return await db.query.onboardingSuggestions.findMany({
        orderBy: [desc(onboardingSuggestions.createdAt)],
        where: and(...filters),
      });
    }),
  dismissSuggestion: authorizedProcedure
    .input(dismissSuggestionInputSchema)
    .handler(async ({ context, input }) => {
      await assertOrganizationAccess({
        headers: context.headers,
        organizationId: input.organizationId,
        user: context.user,
      });

      const updated = await db
        .update(onboardingSuggestions)
        .set({ dismissed: true })
        .where(
          and(
            eq(onboardingSuggestions.id, input.suggestionId),
            eq(onboardingSuggestions.organizationId, input.organizationId)
          )
        )
        .returning({ id: onboardingSuggestions.id });

      if (!updated[0]) {
        throw new ORPCError("NOT_FOUND", {
          message: "Suggestion not found",
        });
      }

      return { id: updated[0].id };
    }),
};
