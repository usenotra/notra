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
import { createGeoProject } from "@notra/geo-core/geo/projects";
import { organizationIdInputSchema } from "@notra/schemas/dashboard/auth/organization";
import {
  dismissSuggestionInputSchema,
  listSuggestionsInputSchema,
} from "@notra/schemas/dashboard/onboarding-agent";
import { companyLogoInputSchema } from "@notra/schemas/dashboard/onboarding/company-logo";
import { ORPCError } from "@orpc/server";
import { and, desc, eq, sql } from "drizzle-orm";

import { COMPANY_LOGO_LOOKUP_TIMEOUT_MS } from "@/constants/company-logo";
import { SELF_SERVE_AGENT_ERROR_MESSAGES } from "@/constants/onboarding-agent";
import { assertOrganizationAccess } from "@/lib/auth/organization";
import {
  getOnboardingAgentState,
  startSelfServeOnboardingAgent,
} from "@/lib/onboarding-agent";
import {
  pickBrandSearchResult,
  pickCompanyLogoUrl,
} from "@/lib/onboarding/company-logo";
import {
  readCachedCompanyLogo,
  writeCachedCompanyLogo,
} from "@/lib/onboarding/company-logo-cache";
import { authorizedProcedure } from "@/lib/orpc/base";
import { runOrpcEffect } from "@/lib/orpc/effect";
import { toGeoOrpcError } from "@/lib/orpc/utils/geo-errors";
import type { CompanyLogoResult } from "@/types/onboarding";
import { resolveOnboardingAgentRunState } from "@/utils/onboarding-agent-run";
import { ratelimit } from "@/utils/ratelimit";

export const onboardingRouter = {
  companyLogo: authorizedProcedure
    .input(companyLogoInputSchema)
    .handler(async ({ context, input }): Promise<CompanyLogoResult> => {
      const cacheKeyInput = {
        query: input.query,
        searchByName: input.searchByName,
      };

      // Ahead of the rate limiter: a cached logo costs nothing upstream, and
      // repeat navigation used to burn the per-query budget on every page view.
      const cached = await readCachedCompanyLogo(cacheKeyInput);
      if (cached) {
        return cached;
      }

      const { success: withinLimit } = await ratelimit.companyLogo.limit(
        `${context.user.id}:${input.query.toLowerCase()}`
      );
      if (!withinLimit) {
        throw new ORPCError("TOO_MANY_REQUESTS", {
          message: "Too many logo lookups. Please try again shortly.",
        });
      }

      const signal = AbortSignal.timeout(COMPANY_LOGO_LOOKUP_TIMEOUT_MS);
      let result: CompanyLogoResult;
      try {
        if (input.searchByName) {
          const response = await searchBrands(input.query, { signal });
          const brand = pickBrandSearchResult(response.results, input.query);
          result = {
            domain: brand?.domain ?? null,
            url: brand?.logo || null,
          };
        } else {
          const response = await retrieveBrand(input.query, { signal });
          result = {
            domain: response.brand?.domain ?? input.query,
            url: pickCompanyLogoUrl(response.brand?.logos),
          };
        }
      } catch {
        // Failures and timeouts are cached as unresolved (short TTL) so every
        // page view does not wait on the same slow lookup again.
        result = {
          domain: input.searchByName ? null : input.query,
          url: null,
        };
      }

      await writeCachedCompanyLogo(cacheKeyInput, result);
      return result;
    }),
  createDevReplayProject: authorizedProcedure
    .input(organizationIdInputSchema)
    .handler(async ({ context, input }) => {
      if (process.env.NODE_ENV !== "development") {
        throw new ORPCError("NOT_FOUND");
      }

      await assertOrganizationAccess({
        headers: context.headers,
        organizationId: input.organizationId,
        user: context.user,
      });

      const project = await runOrpcEffect(
        createGeoProject(input.organizationId, "Onboarding replay"),
        toGeoOrpcError
      );
      return { projectId: project.id };
    }),
  get: authorizedProcedure
    .input(organizationIdInputSchema)
    .handler(async ({ context, input }) => {
      await assertOrganizationAccess({
        headers: context.headers,
        organizationId: input.organizationId,
        user: context.user,
      });

      // Mounted by the sidebar on every page: one round trip instead of five.
      // Columns in a single-table select render unqualified, so the subqueries
      // bind the organization id as a parameter instead of correlating.
      const organizationId = input.organizationId;
      const [org] = await db
        .select({
          onboardingCompleted: organizations.onboardingCompleted,
          onboardingDismissed: organizations.onboardingDismissed,
          hasBrandIdentity: sql<boolean>`exists (select 1 from ${brandSettings} where ${brandSettings.organizationId} = ${organizationId})`,
          hasIntegration: sql<boolean>`exists (select 1 from ${githubIntegrations} where ${githubIntegrations.organizationId} = ${organizationId})`,
          hasSchedule: sql<boolean>`exists (select 1 from ${contentTriggers} where ${contentTriggers.organizationId} = ${organizationId} and ${contentTriggers.sourceType} = 'cron')`,
          hasGeoTracking: sql<boolean>`exists (select 1 from ${geoSettings} where ${geoSettings.organizationId} = ${organizationId})`,
        })
        .from(organizations)
        .where(eq(organizations.id, input.organizationId))
        .limit(1);

      const hasBrandIdentity = org?.hasBrandIdentity ?? false;
      const hasIntegration = org?.hasIntegration ?? false;
      const hasSchedule = org?.hasSchedule ?? false;
      const hasGeoTracking = org?.hasGeoTracking ?? false;
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

      return resolveOnboardingAgentRunState(
        await getOnboardingAgentState(input.organizationId)
      );
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
