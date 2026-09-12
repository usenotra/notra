import { db } from "@notra/db/drizzle";
import {
  brandReferences,
  brandSettings,
  connectedSocialAccounts,
  githubIntegrations,
  linearIntegrations,
  posts,
} from "@notra/db/schema";
import { globalSearchInputSchema } from "@notra/schemas/dashboard/search";
import { and, desc, eq, ilike, inArray, or } from "drizzle-orm";

import { assertOrganizationAccess } from "@/lib/auth/organization";
import { projectScopedCollectionIds } from "@/lib/content/project-scope";
import { baseProcedure } from "@/lib/orpc/base";

const LIKE_ESCAPE_PATTERN = /[\\%_]/g;

function toLikePattern(input: string): string {
  return `%${input.replace(LIKE_ESCAPE_PATTERN, (char) => `\\${char}`)}%`;
}

export const searchRouter = {
  global: baseProcedure
    .input(globalSearchInputSchema)
    .handler(async ({ context, input }) => {
      await assertOrganizationAccess({
        headers: context.headers,
        organizationId: input.organizationId,
      });

      const pattern = toLikePattern(input.query);
      const orgFilter = eq(posts.organizationId, input.organizationId);
      const projectCollectionIds = projectScopedCollectionIds(
        input.organizationId,
        input.projectId
      );
      const postFilter = projectCollectionIds
        ? and(orgFilter, inArray(posts.collectionId, projectCollectionIds))
        : orgFilter;

      const [
        postRows,
        voiceRows,
        referenceRows,
        githubRows,
        linearRows,
        socialRows,
      ] = await Promise.all([
        db
          .select({
            id: posts.id,
            title: posts.title,
            slug: posts.slug,
            status: posts.status,
            updatedAt: posts.updatedAt,
          })
          .from(posts)
          .where(
            and(
              postFilter,
              or(ilike(posts.title, pattern), ilike(posts.slug, pattern))
            )
          )
          .orderBy(desc(posts.updatedAt))
          .limit(input.limit),
        db
          .select({
            id: brandSettings.id,
            name: brandSettings.name,
            companyName: brandSettings.companyName,
            websiteUrl: brandSettings.websiteUrl,
            isDefault: brandSettings.isDefault,
          })
          .from(brandSettings)
          .where(
            and(
              eq(brandSettings.organizationId, input.organizationId),
              or(
                ilike(brandSettings.name, pattern),
                ilike(brandSettings.companyName, pattern),
                ilike(brandSettings.websiteUrl, pattern)
              )
            )
          )
          .orderBy(desc(brandSettings.updatedAt))
          .limit(input.limit),
        db
          .select({
            id: brandReferences.id,
            voiceId: brandReferences.brandSettingsId,
            type: brandReferences.type,
            content: brandReferences.content,
            note: brandReferences.note,
          })
          .from(brandReferences)
          .innerJoin(
            brandSettings,
            eq(brandReferences.brandSettingsId, brandSettings.id)
          )
          .where(
            and(
              eq(brandSettings.organizationId, input.organizationId),
              or(
                ilike(brandReferences.content, pattern),
                ilike(brandReferences.note, pattern)
              )
            )
          )
          .orderBy(desc(brandReferences.updatedAt))
          .limit(input.limit),
        db
          .select({
            id: githubIntegrations.id,
            displayName: githubIntegrations.displayName,
            owner: githubIntegrations.owner,
            repo: githubIntegrations.repo,
          })
          .from(githubIntegrations)
          .where(
            and(
              eq(githubIntegrations.organizationId, input.organizationId),
              or(
                ilike(githubIntegrations.displayName, pattern),
                ilike(githubIntegrations.owner, pattern),
                ilike(githubIntegrations.repo, pattern)
              )
            )
          )
          .orderBy(desc(githubIntegrations.updatedAt))
          .limit(input.limit),
        db
          .select({
            id: linearIntegrations.id,
            displayName: linearIntegrations.displayName,
            linearOrganizationName: linearIntegrations.linearOrganizationName,
            linearTeamName: linearIntegrations.linearTeamName,
          })
          .from(linearIntegrations)
          .where(
            and(
              eq(linearIntegrations.organizationId, input.organizationId),
              or(
                ilike(linearIntegrations.displayName, pattern),
                ilike(linearIntegrations.linearOrganizationName, pattern),
                ilike(linearIntegrations.linearTeamName, pattern)
              )
            )
          )
          .orderBy(desc(linearIntegrations.updatedAt))
          .limit(input.limit),
        db
          .select({
            id: connectedSocialAccounts.id,
            provider: connectedSocialAccounts.provider,
            username: connectedSocialAccounts.username,
            displayName: connectedSocialAccounts.displayName,
          })
          .from(connectedSocialAccounts)
          .where(
            and(
              eq(connectedSocialAccounts.organizationId, input.organizationId),
              or(
                ilike(connectedSocialAccounts.username, pattern),
                ilike(connectedSocialAccounts.displayName, pattern),
                ilike(connectedSocialAccounts.provider, pattern)
              )
            )
          )
          .orderBy(desc(connectedSocialAccounts.updatedAt))
          .limit(input.limit),
      ]);

      return {
        posts: postRows,
        voices: voiceRows,
        references: referenceRows,
        githubIntegrations: githubRows,
        linearIntegrations: linearRows,
        socialAccounts: socialRows,
      };
    }),
};
