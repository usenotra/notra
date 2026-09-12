import { generateGeoContentBrief } from "@notra/ai/agents/geo-writer";
import { describeContentBillingDenial } from "@notra/ai/billing/content-billing";
import { GEO_WRITER_MODEL } from "@notra/ai/constants/models";
import { POST_SLUG_MAX_LENGTH } from "@notra/ai/schemas/post";
import type {
  GeoContentBrief,
  GeoPlannerSitemapPage,
  GeoWriterBrief,
} from "@notra/ai/types/geo-writer";
import {
  createPostRecord,
  updatePostRecord,
} from "@notra/ai/utils/post-service";
import { db } from "@notra/db/drizzle";
import {
  brandSettings,
  brandSitemapPages,
  brandSitemaps,
  geoCompetitors,
  geoContentBriefs,
  geoMentionChecks,
  geoPromptSuggestions,
  geoPrompts,
  geoSettings,
  postCollections,
} from "@notra/db/schema";
import type { PostSourceMetadata } from "@notra/db/schema";
import { buildPostCollectionName } from "@notra/db/utils/post-collections";
import { slugify } from "@notra/utils/slugify";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { Effect } from "effect";

import {
  GEO_WRITER_BRIEFS_LIMIT,
  GEO_WRITER_SITEMAP_PAGE_LIMIT,
  GEO_WRITER_TRIGGER_ID,
  GEO_WRITER_TRIGGER_NAME,
} from "../constants/geo";
import {
  GeoContentBillingService,
  GeoGenerationService,
  GeoWorkflowService,
} from "../deps";
import type {
  GeoContentBriefDetail,
  GeoContentBriefSummary,
  GeoContentBriefsResponse,
  GeoScopeInput,
  GeoWriterPlanInput,
  GeoWriterPlanResponse,
  GeoWriterStartResponse,
  GeoWriterUpdateInput,
} from "../types/geo";
import { REUSABLE_BRIEF_STATUSES } from "../utils/geo-gaps";
import {
  geoBriefToMarkdown,
  markdownToGeoBrief,
} from "../utils/geo-writer-brief-markdown";
import { geoDb } from "./effect";
import {
  GeoContentBriefConflictError,
  GeoContentBriefNotFoundError,
  GeoContentBriefStateError,
  GeoPromptNotFoundError,
  GeoWriterCreditsExhaustedError,
  GeoWriterPlanError,
  GeoWriterStartError,
} from "./errors";
import { evidenceToBaseline, loadPromptEvidence } from "./evidence";
import { loadPlannerGapPrompts } from "./gaps";
import { requireBrandIdentity, requireGeoProject } from "./projects";
import { promptIdFromScanId } from "./prompts";

const BLOG_POST_CONTENT_TYPE = "blog_post";

function toArticleSlug(title: string): string {
  const slug = slugify(title) || "article";
  return slug.slice(0, POST_SLUG_MAX_LENGTH);
}

export function briefProvenanceMetadata(input: {
  brief: GeoWriterBrief;
  sourceKind: string;
  sourceId: string | null;
}): Pick<PostSourceMetadata, "geoSourceKind" | "geoSourceId" | "geoBaseline"> {
  const baseline = input.brief.baseline ?? null;
  return {
    geoSourceKind: input.sourceKind,
    geoSourceId: input.sourceId,
    geoBaseline: baseline
      ? {
          sourcePromptId: baseline.sourcePromptId,
          mentionedEngines: baseline.mentionedEngines,
          totalEngines: baseline.totalEngines,
          capturedAt: baseline.capturedAt,
        }
      : null,
  };
}

const createBriefDraftPost = Effect.fn("geo.writer.draftPost")(
  function* (input: {
    organizationId: string;
    projectId: string;
    briefId: string;
    brief: GeoWriterBrief;
    brandVoiceId: string;
    collectionId: string | null;
    postId: string | null;
    sourceKind: string;
    sourceId: string | null;
  }) {
    if (input.postId && input.collectionId) {
      return { postId: input.postId, collectionId: input.collectionId };
    }
    const provenance = briefProvenanceMetadata(input);

    const brand = yield* geoDb("brand identity lookup failed", () =>
      db.query.brandSettings.findFirst({
        columns: { name: true, companyName: true },
        where: eq(brandSettings.id, input.brandVoiceId),
      })
    );
    const brandVoiceName = brand?.name ?? brand?.companyName ?? "the brand";

    const now = new Date();
    const collectionId = input.collectionId ?? crypto.randomUUID();
    if (!input.collectionId) {
      yield* geoDb("collection create failed", () =>
        db.insert(postCollections).values({
          id: collectionId,
          organizationId: input.organizationId,
          projectId: input.projectId,
          source: "manual",
          sourceId: input.briefId,
          name: buildPostCollectionName([BLOG_POST_CONTENT_TYPE], now),
          nameSource: "generated",
          contentTypes: [BLOG_POST_CONTENT_TYPE],
          sourceMetadata: {
            triggerId: GEO_WRITER_TRIGGER_ID,
            triggerSourceType: "geo",
            prompt: input.brief.targetPrompt,
            brandVoiceId: input.brandVoiceId,
            brandVoiceName,
            briefId: input.briefId,
            projectId: input.projectId,
            ...provenance,
          },
          expectedPostCount: 1,
          completedPostCount: 0,
          createdAt: now,
          updatedAt: now,
        })
      );
    }

    const created = yield* Effect.tryPromise({
      try: () =>
        createPostRecord({
          organizationId: input.organizationId,
          collectionId,
          contentType: BLOG_POST_CONTENT_TYPE,
          contentSubtype: input.brief.contentSubtype,
          title: input.brief.workingTitle,
          slug: toArticleSlug(input.brief.workingTitle),
          markdown: geoBriefToMarkdown(input.brief),
          autoPublish: false,
          sourceMetadata: {
            triggerId: GEO_WRITER_TRIGGER_ID,
            triggerSourceType: "geo",
            prompt: input.brief.targetPrompt,
            brandVoiceId: input.brandVoiceId,
            brandVoiceName,
            briefId: input.briefId,
            projectId: input.projectId,
            ...provenance,
          },
        }),
      catch: (cause) =>
        new GeoWriterPlanError({
          message: "Failed to save the draft article",
          cause,
        }),
    });

    yield* geoDb("brief draft post update failed", () =>
      db
        .update(geoContentBriefs)
        .set({ collectionId, postId: created.postId })
        .where(
          and(
            eq(geoContentBriefs.organizationId, input.organizationId),
            eq(geoContentBriefs.projectId, input.projectId),
            eq(geoContentBriefs.id, input.briefId)
          )
        )
    );

    return { postId: created.postId, collectionId };
  }
);

type BriefRow = typeof geoContentBriefs.$inferSelect;

function toBriefDetail(row: BriefRow): GeoContentBriefDetail {
  return {
    id: row.id,
    topic: row.topic,
    brief: row.brief,
    status: row.status,
    autoApproved: row.autoApproved,
    runId: row.runId,
    postId: row.postId,
    humanized: row.humanized,
    error: row.error,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
  };
}

function toBriefSummary(row: {
  id: string;
  topic: string;
  workingTitle: string;
  status: BriefRow["status"];
  postId: string | null;
  createdAt: Date;
}): GeoContentBriefSummary {
  return {
    id: row.id,
    topic: row.topic,
    workingTitle: row.workingTitle,
    status: row.status,
    postId: row.postId,
    createdAt: row.createdAt.toISOString(),
  };
}

function toPlanResponse(row: BriefRow): GeoWriterPlanResponse {
  return {
    briefId: row.id,
    brief: row.brief,
    status: row.status,
    runId: row.runId,
    postId: row.postId,
  };
}

const loadSitemapPages = Effect.fn("geo.writer.sitemap")(function* (
  brandSettingsId: string,
  sitemapId: string | undefined
) {
  const sitemaps = yield* geoDb("sitemaps lookup failed", () =>
    db
      .select({ id: brandSitemaps.id })
      .from(brandSitemaps)
      .where(
        sitemapId
          ? and(
              eq(brandSitemaps.brandSettingsId, brandSettingsId),
              eq(brandSitemaps.id, sitemapId)
            )
          : eq(brandSitemaps.brandSettingsId, brandSettingsId)
      )
  );
  if (sitemaps.length === 0) {
    return { pages: [] as GeoPlannerSitemapPage[] };
  }

  const pages = yield* geoDb("sitemap pages lookup failed", () =>
    db
      .select({ url: brandSitemapPages.url, title: brandSitemapPages.title })
      .from(brandSitemapPages)
      .where(
        and(
          inArray(
            brandSitemapPages.sitemapId,
            sitemaps.map((sitemap) => sitemap.id)
          ),
          eq(brandSitemapPages.category, "crawled")
        )
      )
      .orderBy(sql`${brandSitemapPages.wordCount} desc nulls last`)
      .limit(GEO_WRITER_SITEMAP_PAGE_LIMIT)
  );

  return { pages };
});

const requireBriefRow = Effect.fn("geo.writer.brief")(function* (
  scope: Required<GeoScopeInput>,
  briefId: string
) {
  const row = yield* geoDb("brief lookup failed", () =>
    db.query.geoContentBriefs.findFirst({
      where: and(
        eq(geoContentBriefs.id, briefId),
        eq(geoContentBriefs.organizationId, scope.organizationId),
        eq(geoContentBriefs.projectId, scope.projectId)
      ),
    })
  );
  if (!row) {
    return yield* Effect.fail(new GeoContentBriefNotFoundError({ briefId }));
  }
  return row;
});

const findReusableBrief = Effect.fn("geo.writer.reusableBrief")(function* (
  scope: Required<GeoScopeInput>,
  sourceKind: Exclude<GeoWriterPlanInput["sourceKind"], "manual" | undefined>,
  sourceId: string
) {
  const row = yield* geoDb("open brief lookup failed", () =>
    db.query.geoContentBriefs.findFirst({
      where: and(
        eq(geoContentBriefs.organizationId, scope.organizationId),
        eq(geoContentBriefs.projectId, scope.projectId),
        eq(geoContentBriefs.sourceKind, sourceKind),
        eq(geoContentBriefs.sourceId, sourceId),
        inArray(geoContentBriefs.status, REUSABLE_BRIEF_STATUSES)
      ),
    })
  );
  return row ?? null;
});

export const listGeoContentBriefs = Effect.fn("geo.writer.briefsList")(
  function* (input: GeoScopeInput) {
    const scope = yield* requireGeoProject(input);
    const rows = yield* geoDb("briefs lookup failed", () =>
      db
        .select({
          id: geoContentBriefs.id,
          topic: geoContentBriefs.topic,
          workingTitle: sql<string>`${geoContentBriefs.brief}->>'workingTitle'`,
          status: geoContentBriefs.status,
          postId: geoContentBriefs.postId,
          createdAt: geoContentBriefs.createdAt,
        })
        .from(geoContentBriefs)
        .where(
          and(
            eq(geoContentBriefs.organizationId, scope.organizationId),
            eq(geoContentBriefs.projectId, scope.projectId)
          )
        )
        .orderBy(desc(geoContentBriefs.createdAt))
        .limit(GEO_WRITER_BRIEFS_LIMIT)
    );
    const response: GeoContentBriefsResponse = {
      briefs: rows.map(toBriefSummary),
    };
    return response;
  }
);

export const getGeoContentBrief = Effect.fn("geo.writer.briefGet")(function* (
  input: GeoScopeInput,
  briefId: string
) {
  const scope = yield* requireGeoProject(input);
  const row = yield* requireBriefRow(scope, briefId);
  return toBriefDetail(row);
});

const REVISABLE_BRIEF_STATUSES = ["draft", "failed"] as const;

export const updateGeoContentBrief = Effect.fn("geo.writer.briefUpdate")(
  function* (input: GeoScopeInput & GeoWriterUpdateInput) {
    const scope = yield* requireGeoProject(input);
    const row = yield* requireBriefRow(scope, input.briefId);
    if (!REVISABLE_BRIEF_STATUSES.some((status) => status === row.status)) {
      return yield* Effect.fail(
        new GeoContentBriefStateError({
          briefId: input.briefId,
          status: row.status,
        })
      );
    }

    const brief = markdownToGeoBrief(input.markdown, {
      workingTitle: input.workingTitle?.trim() || row.brief.workingTitle,
      contentSubtype: row.brief.contentSubtype,
    });
    if (!brief) {
      return yield* Effect.fail(
        new GeoWriterPlanError({
          message:
            "Could not read this as a content plan. Keep the plan field structure and try again.",
        })
      );
    }

    const markdown = geoBriefToMarkdown(brief);
    const updated = yield* Effect.tryPromise({
      try: () =>
        db.transaction(async (tx) => {
          const updatedRows = await tx
            .update(geoContentBriefs)
            .set({
              brief,
              error: null,
              updatedAt: sql<Date>`greatest(
                date_trunc('milliseconds', localtimestamp),
                date_trunc('milliseconds', ${geoContentBriefs.updatedAt}) + interval '1 millisecond'
              )`,
            })
            .where(
              and(
                eq(geoContentBriefs.organizationId, scope.organizationId),
                eq(geoContentBriefs.projectId, scope.projectId),
                eq(geoContentBriefs.id, input.briefId),
                eq(
                  sql<Date>`date_trunc('milliseconds', ${geoContentBriefs.updatedAt})`,
                  new Date(input.expectedUpdatedAt)
                ),
                inArray(geoContentBriefs.status, [...REVISABLE_BRIEF_STATUSES])
              )
            )
            .returning();
          const updatedRow = updatedRows.at(0);
          if (!updatedRow?.postId) {
            return updatedRow;
          }

          const saved = await updatePostRecord(
            {
              organizationId: scope.organizationId,
              postId: updatedRow.postId,
              title: brief.workingTitle,
              markdown,
              contentSubtype: brief.contentSubtype,
            },
            tx
          );
          if (saved.status === "not_found") {
            throw new Error("Associated draft post not found");
          }

          return updatedRow;
        }),
      catch: (cause) =>
        new GeoWriterPlanError({
          message: "Failed to save the revised plan",
          cause,
        }),
    });
    if (!updated) {
      const current = yield* requireBriefRow(scope, input.briefId);
      if (current.status === "draft" || current.status === "failed") {
        return yield* Effect.fail(
          new GeoContentBriefConflictError({
            briefId: input.briefId,
            updatedAt: current.updatedAt.toISOString(),
          })
        );
      }
      return yield* Effect.fail(
        new GeoContentBriefStateError({
          briefId: input.briefId,
          status: current.status,
        })
      );
    }

    return toBriefDetail(updated);
  }
);

const markBriefFailed = (
  scope: Required<GeoScopeInput>,
  briefId: string,
  runId: string,
  reason: string
) =>
  geoDb("brief failure update failed", () =>
    db
      .update(geoContentBriefs)
      .set({ status: "failed", error: reason, completedAt: new Date() })
      .where(
        and(
          eq(geoContentBriefs.organizationId, scope.organizationId),
          eq(geoContentBriefs.projectId, scope.projectId),
          eq(geoContentBriefs.id, briefId),
          eq(geoContentBriefs.runId, runId),
          eq(geoContentBriefs.status, "writing")
        )
      )
  );

const approveAndStartGeoWriterInScope = Effect.fn("geo.writer.startInScope")(
  function* (
    scope: Required<GeoScopeInput>,
    briefId: string,
    options: { autoApproved: boolean } = { autoApproved: false }
  ) {
    const generation = yield* GeoGenerationService;
    const workflows = yield* GeoWorkflowService;
    const now = new Date();
    const runIdPrefix = yield* generation.generateRunId(GEO_WRITER_TRIGGER_ID);
    const runId = `${runIdPrefix}-${crypto.randomUUID()}`;
    const claimedRows = yield* geoDb("brief approve failed", () =>
      db
        .update(geoContentBriefs)
        .set({
          status: "writing",
          autoApproved: options.autoApproved,
          approvedAt: now,
          startedAt: now,
          runId,
          error: null,
          completedAt: null,
        })
        .where(
          and(
            eq(geoContentBriefs.organizationId, scope.organizationId),
            eq(geoContentBriefs.projectId, scope.projectId),
            eq(geoContentBriefs.id, briefId),
            inArray(geoContentBriefs.status, ["draft", "failed"])
          )
        )
        .returning()
    );
    const row = claimedRows.at(0);
    if (!row) {
      const current = yield* requireBriefRow(scope, briefId);
      return yield* Effect.fail(
        new GeoContentBriefStateError({ briefId, status: current.status })
      );
    }

    if (!row.collectionId) {
      yield* createBriefDraftPost({
        organizationId: scope.organizationId,
        projectId: scope.projectId,
        briefId,
        brief: row.brief,
        brandVoiceId: row.brandSettingsId,
        sourceKind: row.sourceKind,
        sourceId: row.sourceId,
        collectionId: row.collectionId,
        postId: row.postId,
      }).pipe(
        Effect.catch((error) =>
          markBriefFailed(
            scope,
            briefId,
            runId,
            "Failed to prepare the writer draft"
          ).pipe(Effect.andThen(Effect.fail(error)))
        )
      );
    }

    yield* generation
      .addActiveGeneration(scope.organizationId, {
        runId,
        triggerId: GEO_WRITER_TRIGGER_ID,
        outputType: BLOG_POST_CONTENT_TYPE,
        triggerName: GEO_WRITER_TRIGGER_NAME,
        startedAt: now.toISOString(),
        source: "dashboard",
      })
      .pipe(
        Effect.mapError((cause) => new GeoWriterStartError({ cause })),
        Effect.catch((error) => {
          console.error("[GEO] writer tracking failed:", error.cause);
          return Effect.void;
        })
      );

    yield* workflows
      .startGeoWriterRun({
        organizationId: scope.organizationId,
        projectId: scope.projectId,
        briefId,
        runId,
      })
      .pipe(
        Effect.mapError((cause) => new GeoWriterStartError({ cause })),
        Effect.catch((error) =>
          markBriefFailed(
            scope,
            briefId,
            runId,
            "Failed to start the writer"
          ).pipe(Effect.andThen(Effect.fail(error)))
        )
      );

    const response: GeoWriterStartResponse = { runId };
    return response;
  }
);

export const approveAndStartGeoWriter = Effect.fn("geo.writer.start")(
  function* (
    input: GeoScopeInput,
    briefId: string,
    options: { autoApproved: boolean } = { autoApproved: false }
  ) {
    const scope = yield* requireGeoProject(input);
    return yield* approveAndStartGeoWriterInScope(scope, briefId, options);
  }
);

export const planGeoContentBrief = Effect.fn("geo.writer.plan")(function* (
  input: GeoScopeInput & GeoWriterPlanInput,
  userId: string | undefined
) {
  const billing = yield* GeoContentBillingService;
  const scope = yield* requireGeoProject(input);

  const topic = yield* resolveWriterTopic(
    scope.organizationId,
    scope.projectId,
    {
      topic: input.topic,
      sourceKind: input.sourceKind,
      sourceId: input.sourceId,
    }
  );

  const sourceKind = input.sourceKind ?? "manual";
  const sourceId = input.sourceId;

  if (sourceKind !== "manual" && sourceId) {
    const open = yield* findReusableBrief(scope, sourceKind, sourceId);
    if (open) {
      if (
        !open.postId &&
        (open.status === "draft" || open.status === "failed")
      ) {
        const repairedDraft = yield* createBriefDraftPost({
          organizationId: scope.organizationId,
          projectId: scope.projectId,
          briefId: open.id,
          brief: open.brief,
          brandVoiceId: open.brandSettingsId,
          sourceKind: open.sourceKind,
          sourceId: open.sourceId,
          collectionId: open.collectionId,
          postId: open.postId,
        });
        return { ...toPlanResponse(open), postId: repairedDraft.postId };
      }
      return toPlanResponse(open);
    }
  }

  const selectedBrandId = input.brandVoiceIds?.at(0);
  if (selectedBrandId) {
    yield* requireBrandIdentity(scope.organizationId, selectedBrandId);
  }
  const brandSettingsId = selectedBrandId ?? scope.brandSettingsId;

  const competitorFilter =
    input.competitorIds && input.competitorIds.length > 0
      ? inArray(geoCompetitors.id, input.competitorIds)
      : undefined;

  const evidenceSourceId =
    sourceId && (sourceKind === "gap" || sourceKind === "prompt")
      ? sourceId
      : null;

  const [brand, settings, competitors, gapData, sitemap, evidence] =
    yield* Effect.all([
      geoDb("brand identity lookup failed", () =>
        db.query.brandSettings.findFirst({
          columns: {
            name: true,
            companyName: true,
            companyDescription: true,
            audience: true,
            websiteUrl: true,
          },
          where: eq(brandSettings.id, brandSettingsId),
        })
      ),
      geoDb("settings lookup failed", () =>
        db.query.geoSettings.findFirst({
          columns: { companyName: true, aliases: true },
          where: eq(geoSettings.projectId, scope.projectId),
        })
      ),
      geoDb("competitors lookup failed", () =>
        db
          .select({ name: geoCompetitors.name, domain: geoCompetitors.domain })
          .from(geoCompetitors)
          .where(
            competitorFilter
              ? and(
                  eq(geoCompetitors.projectId, scope.projectId),
                  competitorFilter
                )
              : eq(geoCompetitors.projectId, scope.projectId)
          )
      ),
      loadPlannerGapPrompts(scope.projectId),
      loadSitemapPages(brandSettingsId, input.sitemapId),
      evidenceSourceId
        ? loadPromptEvidence(scope.projectId, evidenceSourceId)
        : Effect.succeed(null),
    ]);

  const companyName =
    settings?.companyName?.trim() || brand?.companyName?.trim() || "the brand";

  const planningRunId = `${GEO_WRITER_TRIGGER_ID}-plan-${crypto.randomUUID()}`;
  const gate = yield* billing
    .gateContentBilling({
      organizationId: scope.organizationId,
      executionId: planningRunId,
      outputType: BLOG_POST_CONTENT_TYPE,
      countTowardQuota: false,
    })
    .pipe(
      Effect.mapError(
        (cause) =>
          new GeoWriterPlanError({
            message: "Failed to reserve AI credits for planning",
            cause,
          })
      )
    );
  if (!gate.allowed) {
    return yield* Effect.fail(
      new GeoWriterCreditsExhaustedError({
        message: describeContentBillingDenial(gate),
      })
    );
  }

  const generated = yield* Effect.tryPromise({
    try: () =>
      generateGeoContentBrief({
        organizationId: scope.organizationId,
        input: {
          topic,
          contentSubtype: input.contentSubtype,
          brand: {
            companyName,
            aliases: settings?.aliases ?? [],
            websiteUrl: brand?.websiteUrl ?? null,
            description: brand?.companyDescription ?? null,
            audience: brand?.audience ?? null,
          },
          competitors,
          gapPrompts: gapData.gaps,
          sitemapPages: sitemap.pages,
          evidence,
          existingPageUrl: input.existingPageUrl ?? null,
        },
      }),
    catch: (cause) => cause,
  }).pipe(
    Effect.flatMap((result) =>
      billing
        .finalizeContentBilling({
          reservation: gate,
          action: "confirm",
          usage: result.usage,
          fallbackModelId: GEO_WRITER_MODEL,
          properties: {
            source: "geo_writer_planner",
            run_id: planningRunId,
            markup_applied: gate.useMarkup,
          },
          logPrefix: "GeoWriterPlanner",
        })
        .pipe(Effect.map(() => result))
    ),
    Effect.mapError(
      (cause) =>
        new GeoWriterPlanError({
          message:
            cause instanceof Error
              ? cause.message
              : "Failed to plan the article",
          cause,
        })
    ),
    Effect.tapError(() =>
      billing
        .finalizeContentBilling({
          reservation: gate,
          action: "release",
          logPrefix: "GeoWriterPlanner",
        })
        .pipe(
          Effect.catch((releaseError) =>
            Effect.sync(() => {
              console.error(
                "[GEO] planner credit release failed:",
                releaseError
              );
            })
          )
        )
    )
  );

  const baseline = evidence ? evidenceToBaseline(evidence) : null;
  const brief: GeoWriterBrief = {
    ...generated.brief,
    contentSubtype: input.contentSubtype ?? generated.brief.contentSubtype,
    baseline,
  };

  const briefId = crypto.randomUUID();
  const inserted = yield* geoDb("brief create failed", () =>
    db
      .insert(geoContentBriefs)
      .values({
        id: briefId,
        organizationId: scope.organizationId,
        projectId: scope.projectId,
        brandSettingsId,
        createdByUserId: userId ?? null,
        topic,
        brief,
        status: "draft",
        sourceKind,
        sourceId: sourceId ?? null,
      })
      .onConflictDoNothing()
      .returning({ id: geoContentBriefs.id })
  );
  if (inserted.length === 0 && sourceKind !== "manual" && sourceId) {
    const winner = yield* findReusableBrief(scope, sourceKind, sourceId);
    if (winner) {
      return toPlanResponse(winner);
    }
  }

  const draft = yield* createBriefDraftPost({
    organizationId: scope.organizationId,
    projectId: scope.projectId,
    briefId,
    brief,
    brandVoiceId: brandSettingsId,
    sourceKind,
    sourceId: sourceId ?? null,
    collectionId: null,
    postId: null,
  });

  if (!input.autoApprove) {
    const response: GeoWriterPlanResponse = {
      briefId,
      brief,
      status: "draft",
      runId: null,
      postId: draft.postId,
    };
    return response;
  }

  const started = yield* approveAndStartGeoWriterInScope(scope, briefId, {
    autoApproved: true,
  });
  const response: GeoWriterPlanResponse = {
    briefId,
    brief,
    status: "writing",
    runId: started.runId,
    postId: draft.postId,
  };
  return response;
});

const resolveWriterTopic = Effect.fn("geo.writer.topic")(function* (
  organizationId: string,
  projectId: string,
  input: {
    topic: string;
    sourceKind?: GeoWriterPlanInput["sourceKind"];
    sourceId?: string;
  }
) {
  const sourceId = input.sourceId;
  if (
    !(
      sourceId &&
      (input.sourceKind === "gap" ||
        input.sourceKind === "prompt" ||
        input.sourceKind === "search_console")
    )
  ) {
    return input.topic;
  }

  if (input.sourceKind === "search_console") {
    const suggestion = yield* geoDb("prompt suggestion lookup failed", () =>
      db.query.geoPromptSuggestions.findFirst({
        columns: { prompt: true },
        where: and(
          eq(geoPromptSuggestions.id, sourceId),
          eq(geoPromptSuggestions.organizationId, organizationId)
        ),
      })
    );
    if (!suggestion) {
      return yield* Effect.fail(
        new GeoPromptNotFoundError({ promptId: sourceId })
      );
    }
    return suggestion.prompt;
  }

  const promptRow = yield* geoDb("prompt lookup failed", () =>
    db.query.geoPrompts.findFirst({
      columns: { prompt: true },
      where: and(
        eq(geoPrompts.id, promptIdFromScanId(sourceId)),
        eq(geoPrompts.projectId, projectId)
      ),
    })
  );
  if (promptRow) {
    return promptRow.prompt;
  }

  const check = yield* geoDb("gap prompt lookup failed", () =>
    db
      .select({ prompt: geoMentionChecks.prompt })
      .from(geoMentionChecks)
      .where(
        and(
          eq(geoMentionChecks.projectId, projectId),
          eq(geoMentionChecks.promptId, sourceId)
        )
      )
      .orderBy(desc(geoMentionChecks.capturedAt))
      .limit(1)
  );
  const scanPrompt = check.at(0);
  if (!scanPrompt) {
    return yield* Effect.fail(
      new GeoPromptNotFoundError({ promptId: sourceId })
    );
  }
  return scanPrompt.prompt;
});
