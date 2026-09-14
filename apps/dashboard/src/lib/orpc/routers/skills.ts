import {
  SkillDuplicateError,
  SkillNotFoundError,
  SkillNotSystemError,
  SkillUpgradeInputError,
  SystemSkillVersionMissingError,
} from "@notra/ai/skills/errors";
import {
  getSkillUpstream,
  listSkillUpstreamStatuses,
  updateSkillContent,
  upgradeSkill,
} from "@notra/ai/skills/functions/upstream";
import { db } from "@notra/db/drizzle";
import { skills } from "@notra/db/schema";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import {
  createSkillInputSchema,
  deleteSkillInputSchema,
  getSkillInputSchema,
  getSkillUpstreamInputSchema,
  importSkillFromUrlInputSchema,
  listSkillsInputSchema,
  updateSkillInputSchema,
  upgradeSkillInputSchema,
} from "@notra/schemas/dashboard/skills";
import { and, eq } from "drizzle-orm";
import { Effect } from "effect";
import { nanoid } from "nanoid";

import { trackServerEvent } from "@/lib/analytics/posthog-server";
import { assertOrganizationAccess } from "@/lib/auth/organization";
import { authorizedProcedure } from "@/lib/orpc/base";
import { parseSkillFrontmatter } from "@/lib/skills/parse-frontmatter";
import { toSkillUpstreamStatus } from "@/utils/skills";

import {
  badRequest,
  conflict,
  forbidden,
  notFound,
  serviceUnavailable,
} from "../utils/errors";

const SKILLS_SH_API_BASE = "https://skills.sh/api/v1/skills";

/** Maps shared typed failures onto oRPC errors at the transport boundary. */
function toSkillRouterError(cause: unknown): Error {
  if (cause instanceof SkillNotFoundError) {
    return notFound("Skill not found");
  }
  if (cause instanceof SkillDuplicateError) {
    return conflict(cause.message);
  }
  if (cause instanceof SkillNotSystemError) {
    return badRequest(cause.message);
  }
  if (cause instanceof SystemSkillVersionMissingError) {
    return notFound(cause.message);
  }
  if (cause instanceof SkillUpgradeInputError) {
    return badRequest(cause.reason);
  }
  return cause instanceof Error ? cause : new Error(String(cause));
}

function runSkillEffect<A, E>(effect: Effect.Effect<A, E>): Promise<A> {
  return Effect.runPromise(effect.pipe(Effect.mapError(toSkillRouterError)));
}

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

      const [rows, upstreamStatuses] = await Promise.all([
        db
          .select({
            id: skills.id,
            name: skills.name,
            description: skills.description,
            isSystem: skills.isSystem,
            updatedAt: skills.updatedAt,
          })
          .from(skills)
          .where(eq(skills.organizationId, input.organizationId)),
        runSkillEffect(
          listSkillUpstreamStatuses({ organizationId: input.organizationId })
        ),
      ]);

      return rows.map((row) => ({
        ...row,
        upstream: row.isSystem ? (upstreamStatuses.get(row.id) ?? null) : null,
      }));
    }),

  getById: authorizedProcedure
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
          eq(skills.id, input.id)
        ),
      });

      if (!row) {
        throw notFound("Skill not found");
      }

      const detail = row.isSystem
        ? await runSkillEffect(
            getSkillUpstream(
              { organizationId: input.organizationId },
              { id: row.id }
            )
          )
        : null;

      return {
        ...row,
        upstream: detail ? toSkillUpstreamStatus(detail) : null,
      };
    }),

  /** Base and latest version with full content, for the diff and merge UI. */
  getUpstream: authorizedProcedure
    .input(getSkillUpstreamInputSchema)
    .handler(async ({ context, input }) => {
      await assertOrganizationAccess({
        headers: context.headers,
        organizationId: input.organizationId,
        user: context.user,
      });

      return await runSkillEffect(
        getSkillUpstream(
          { organizationId: input.organizationId },
          { id: input.id }
        )
      );
    }),

  upgrade: authorizedProcedure
    .input(upgradeSkillInputSchema)
    .handler(async ({ context, input }) => {
      await assertOrganizationAccess({
        headers: context.headers,
        organizationId: input.organizationId,
        user: context.user,
      });

      const [detail, result] = await runSkillEffect(
        Effect.gen(function* () {
          const detail = yield* getSkillUpstream(
            { organizationId: input.organizationId },
            { id: input.id }
          );
          const result = yield* upgradeSkill(
            { organizationId: input.organizationId },
            { id: input.id },
            input.payload
          );
          return [detail, result] as const;
        })
      );

      trackServerEvent({
        event: POSTHOG_EVENTS.SKILL_UPGRADED,
        headers: context.headers,
        userId: context.user.id,
        organizationId: input.organizationId,
        properties: {
          strategy: input.payload.strategy,
          from_version: detail?.baseVersion ?? null,
          to_version: result.version,
        },
      });

      return result;
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
          id: skills.id,
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

      return {
        id: created?.id ?? null,
        name: created?.name ?? input.payload.name,
      };
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
          eq(skills.id, input.id)
        ),
        columns: { id: true, name: true, isSystem: true },
      });

      if (!row) {
        throw notFound("Skill not found");
      }

      const updated = await runSkillEffect(
        updateSkillContent(
          { organizationId: input.organizationId },
          { id: row.id },
          {
            name: input.payload.name,
            description: input.payload.description,
            content: input.payload.content,
          }
        )
      );
      const isRename = updated.name !== row.name;

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

      return { success: true as const, id: updated.id, name: updated.name };
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
          eq(skills.id, input.id)
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
            eq(skills.id, row.id)
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
