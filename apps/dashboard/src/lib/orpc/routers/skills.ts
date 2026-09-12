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
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";

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

      const rows = await db
        .select({
          id: skills.id,
          name: skills.name,
          description: skills.description,
          isSystem: skills.isSystem,
          updatedAt: skills.updatedAt,
        })
        .from(skills)
        .where(eq(skills.organizationId, input.organizationId));

      return rows;
    }),

  getByName: authorizedProcedure
    .input(getSkillInputSchema)
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
        throw conflict(`A skill named "${input.payload.name}" already exists`);
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
        throw forbidden("System skills cannot be renamed");
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
          throw conflict(`A skill named "${nextName}" already exists`);
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
        throw forbidden("System skills cannot be deleted");
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
        throw badRequest("Invalid URL");
      }

      if (!pathname) {
        throw badRequest("URL must point to a specific skill");
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
      } catch (error) {
        throw serviceUnavailable(
          `Failed to reach skills.sh: ${(error as Error).message}`
        );
      }

      if (response.status === 404) {
        throw notFound("Skill not found on skills.sh");
      }

      if (!response.ok) {
        throw serviceUnavailable(
          `skills.sh returned ${response.status} ${response.statusText}`
        );
      }

      const data = (await response.json()) as SkillsShSkill;
      const file = pickPrimarySkillFile(data.files ?? []);
      if (!file) {
        throw badRequest("Skill has no importable files");
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
