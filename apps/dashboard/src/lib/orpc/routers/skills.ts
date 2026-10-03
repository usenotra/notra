import { ensureUnslopSkill } from "@notra/ai/skills/seed";
import { db } from "@notra/db/drizzle";
import { skills } from "@notra/db/schema";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import {
  createSkillInputSchema,
  deleteSkillInputSchema,
  getSkillInputSchema,
  importSkillFromUrlInputSchema,
  listSkillsInputSchema,
  updateSkillInputSchema,
} from "@notra/schemas/dashboard/skills";
import { and, asc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getTranslations } from "next-intl/server";

import { trackServerEvent } from "@/lib/analytics/posthog-server";
import { assertOrganizationAccess } from "@/lib/auth/organization";
import { authorizedProcedure } from "@/lib/orpc/base";
import { parseSkillFrontmatter } from "@/lib/skills/parse-frontmatter";

import {
  badRequest,
  conflict,
  forbidden,
  notFound,
  serviceUnavailable,
} from "../utils/errors";

const SKILLS_SH_API_BASE = "https://skills.sh/api/v1/skills";

interface SkillsShFile {
  path: string;
  contents: string;
}

interface SkillsShSkill {
  id?: string;
  source?: string;
  slug?: string;
  files?: SkillsShFile[] | null;
}

const SKILL_MD_REGEX = /(^|\/)SKILL\.md$/i;

function pickPrimarySkillFile(files: SkillsShFile[]): SkillsShFile | null {
  const named = files.find((f) => SKILL_MD_REGEX.test(f.path));
  if (named) {
    return named;
  }
  const anyMd = files.find((f) => f.path.toLowerCase().endsWith(".md"));
  return anyMd ?? files[0] ?? null;
}

export const skillsRouter = {
  list: authorizedProcedure
    .input(listSkillsInputSchema)
    .handler(async ({ context, input }) => {
      await assertOrganizationAccess({
        headers: context.headers,
        organizationId: input.organizationId,
        user: context.user,
      });

      await ensureUnslopSkill(input.organizationId);
      const rows = await db
        .select({
          id: skills.id,
          name: skills.name,
          description: skills.description,
          isSystem: skills.isSystem,
          updatedAt: skills.updatedAt,
        })
        .from(skills)
        .where(eq(skills.organizationId, input.organizationId))
        .orderBy(asc(skills.name));

      return rows.map((row) => ({
        ...row,
        updatedAt: row.updatedAt.toISOString(),
      }));
    }),

  getByName: authorizedProcedure
    .input(getSkillInputSchema)
    .handler(async ({ context, input }) => {
      await assertOrganizationAccess({
        headers: context.headers,
        organizationId: input.organizationId,
        user: context.user,
      });

      if (input.name === "unslop") {
        await ensureUnslopSkill(input.organizationId);
      }
      const row = await db.query.skills.findFirst({
        where: and(
          eq(skills.organizationId, input.organizationId),
          eq(skills.name, input.name)
        ),
      });

      if (!row) {
        throw notFound("Skill not found");
      }

      return row;
    }),

  create: authorizedProcedure
    .input(createSkillInputSchema)
    .handler(async ({ context, input }) => {
      await assertOrganizationAccess({
        headers: context.headers,
        organizationId: input.organizationId,
        user: context.user,
      });

      const existing = await db.query.skills.findFirst({
        where: and(
          eq(skills.organizationId, input.organizationId),
          eq(skills.name, input.payload.name)
        ),
        columns: { id: true },
      });

      if (existing) {
        const tErrors = await getTranslations("errors.skills");
        throw conflict(tErrors("nameTaken", { name: input.payload.name }));
      }

      const [created] = await db
        .insert(skills)
        .values({
          id: nanoid(),
          organizationId: input.organizationId,
          name: input.payload.name,
          description: input.payload.description,
          content: input.payload.content,
          isSystem: false,
        })
        .returning({
          name: skills.name,
        });

      trackServerEvent({
        event: POSTHOG_EVENTS.SKILL_CREATED,
        headers: context.headers,
        userId: context.user.id,
        organizationId: input.organizationId,
        properties: {
          has_frontmatter:
            parseSkillFrontmatter(input.payload.content) !== null,
        },
      });

      return { name: created?.name ?? input.payload.name };
    }),

  update: authorizedProcedure
    .input(updateSkillInputSchema)
    .handler(async ({ context, input }) => {
      await assertOrganizationAccess({
        headers: context.headers,
        organizationId: input.organizationId,
        user: context.user,
      });

      const row = await db.query.skills.findFirst({
        where: and(
          eq(skills.organizationId, input.organizationId),
          eq(skills.name, input.name)
        ),
        columns: { id: true, isSystem: true },
      });

      if (!row) {
        throw notFound("Skill not found");
      }

      const nextName = input.payload.name ?? input.name;
      const isRename = nextName !== input.name;

      if (isRename && row.isSystem) {
        const tErrors = await getTranslations("errors.skills");
        throw forbidden(tErrors("systemSkillRename"));
      }

      if (isRename) {
        const conflictRow = await db.query.skills.findFirst({
          where: and(
            eq(skills.organizationId, input.organizationId),
            eq(skills.name, nextName)
          ),
          columns: { id: true },
        });

        if (conflictRow) {
          const tErrors = await getTranslations("errors.skills");
          throw conflict(tErrors("nameTaken", { name: nextName }));
        }
      }

      await db
        .update(skills)
        .set({
          name: nextName,
          description: input.payload.description,
          content: input.payload.content,
        })
        .where(
          and(
            eq(skills.organizationId, input.organizationId),
            eq(skills.name, input.name)
          )
        );

      trackServerEvent({
        event: POSTHOG_EVENTS.SKILL_UPDATED,
        headers: context.headers,
        userId: context.user.id,
        organizationId: input.organizationId,
        properties: {
          is_rename: isRename,
          is_system: row.isSystem,
          has_frontmatter:
            parseSkillFrontmatter(input.payload.content) !== null,
        },
      });

      return { success: true as const, name: nextName };
    }),

  delete: authorizedProcedure
    .input(deleteSkillInputSchema)
    .handler(async ({ context, input }) => {
      await assertOrganizationAccess({
        headers: context.headers,
        organizationId: input.organizationId,
        user: context.user,
      });

      const row = await db.query.skills.findFirst({
        where: and(
          eq(skills.organizationId, input.organizationId),
          eq(skills.name, input.name)
        ),
        columns: { id: true, isSystem: true },
      });

      if (!row) {
        throw notFound("Skill not found");
      }

      if (row.isSystem) {
        const tErrors = await getTranslations("errors.skills");
        throw forbidden(tErrors("systemSkillDelete"));
      }

      await db
        .delete(skills)
        .where(
          and(
            eq(skills.organizationId, input.organizationId),
            eq(skills.name, input.name)
          )
        );

      trackServerEvent({
        event: POSTHOG_EVENTS.SKILL_DELETED,
        headers: context.headers,
        userId: context.user.id,
        organizationId: input.organizationId,
      });

      return { success: true as const };
    }),

  importFromUrl: authorizedProcedure
    .input(importSkillFromUrlInputSchema)
    .handler(async ({ context, input }) => {
      let pathname: string;
      let sourceHost: string;
      try {
        const sourceUrl = new URL(input.url);
        pathname = sourceUrl.pathname.replace(/^\/+|\/+$/g, "");
        sourceHost = sourceUrl.hostname;
      } catch {
        const tErrors = await getTranslations("errors.skills");
        throw badRequest(tErrors("invalidUrl"));
      }

      if (!pathname) {
        const tErrors = await getTranslations("errors.skills");
        throw badRequest(tErrors("urlNotSkill"));
      }

      const apiKey = process.env.SKILLS_SH_API_KEY;
      const headers: Record<string, string> = { Accept: "application/json" };
      if (apiKey) {
        headers.Authorization = `Bearer ${apiKey}`;
      }

      let response: Response;
      try {
        response = await fetch(`${SKILLS_SH_API_BASE}/${pathname}`, {
          headers,
        });
      } catch {
        const tErrors = await getTranslations("errors.skills");
        throw serviceUnavailable(tErrors("skillsShUnavailable"));
      }

      if (response.status === 404) {
        throw notFound("Skill not found on skills.sh");
      }

      if (!response.ok) {
        const tErrors = await getTranslations("errors.skills");
        throw serviceUnavailable(tErrors("skillsShUnavailable"));
      }

      const data = (await response.json()) as SkillsShSkill;
      const file = pickPrimarySkillFile(data.files ?? []);
      if (!file) {
        const tErrors = await getTranslations("errors.skills");
        throw badRequest(tErrors("noImportableFiles"));
      }

      const parsed = parseSkillFrontmatter(file.contents);
      const fallbackName = data.slug ?? "";
      const name = parsed?.name ?? fallbackName;
      const description = parsed?.description ?? "";
      const content = parsed?.body ?? file.contents;

      trackServerEvent({
        event: POSTHOG_EVENTS.SKILL_IMPORTED_FROM_URL,
        headers: context.headers,
        userId: context.user.id,
        properties: {
          source_host: sourceHost,
          has_frontmatter: parsed !== null,
          file_count: data.files?.length ?? 0,
        },
      });

      return {
        name,
        description,
        content,
        source: data.source ?? null,
        slug: data.slug ?? null,
      };
    }),
};
