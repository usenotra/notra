import {
  createBrandAnalysisJob,
  createBrandAnalysisJobId,
  getBrandAnalysisJob,
  setBrandAnalysisJobStatus,
  updateBrandAnalysisJob,
} from "@notra/ai/jobs/brand-analysis";
import {
  brandSettings,
  contentTriggers,
  geoContentBriefs,
  projects,
} from "@notra/db/schema";
import { and, asc, desc, eq, inArray, ne } from "drizzle-orm";
import { Effect } from "effect";

import {
  BrandAnalysisJobNotFoundError,
  BrandAnalysisQueueFailedError,
  BrandIdentityCreateFailedError,
  BrandIdentityDatabaseError,
  BrandIdentityDefaultDeleteError,
  BrandIdentityInUseError,
  BrandIdentityNameDuplicateError,
  BrandIdentityNotFoundError,
} from "../errors/brand-identities";
import type {
  CreateBrandIdentityProgramInput,
  CreateBrandIdentityProgramSuccess,
  DeleteBrandIdentityProgramInput,
  DeleteBrandIdentityProgramSuccess,
  GetBrandAnalysisJobProgramInput,
  GetBrandAnalysisJobProgramSuccess,
  GetBrandIdentityProgramInput,
  GetBrandIdentityProgramSuccess,
  ListBrandIdentitiesProgramInput,
  ListBrandIdentitiesProgramSuccess,
  PatchBrandIdentityProgramInput,
  PatchBrandIdentityProgramSuccess,
} from "../types/brand-identities";
import type { DbClient } from "../types/db";
import { triggerBrandAnalysisWorkflow } from "../utils/brand-analysis";
import {
  brandIdentityQueryColumns,
  selectBrandIdentityColumns,
} from "../utils/brand-identities";
import { isConstraintViolation, isPgUniqueViolation } from "../utils/pg-errors";
import {
  deleteQstashSchedulesForTriggers,
  getTriggersForBrandIdentity,
} from "../utils/triggers";

const database = <A>(operation: () => Promise<A>) =>
  Effect.tryPromise({
    try: operation,
    catch: (cause) => new BrandIdentityDatabaseError({ cause }),
  });

const mapCreateInsertError = (cause: unknown) => {
  if (isPgUniqueViolation(cause)) {
    if (isConstraintViolation(cause, "brandSettings_org_name_uidx")) {
      return new BrandIdentityNameDuplicateError();
    }

    return new BrandIdentityCreateFailedError();
  }

  return new BrandIdentityDatabaseError({ cause });
};

async function insertBrandIdentity(
  db: DbClient,
  values: {
    id: string;
    organizationId: string;
    name: string;
    isDefault: boolean;
    websiteUrl: string;
  }
) {
  try {
    return await db
      .insert(brandSettings)
      .values(values)
      .returning(selectBrandIdentityColumns());
  } catch (error) {
    if (!isConstraintViolation(error, "brandSettings_org_default_uidx")) {
      throw error;
    }

    return db
      .insert(brandSettings)
      .values({ ...values, isDefault: false })
      .returning(selectBrandIdentityColumns());
  }
}

function queueFailureMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Failed to queue brand identity analysis";
}

function getBrandAnalysisJobKey(jobId: string) {
  return `brand-analysis:job:${jobId}`;
}

function failBrandAnalysisQueue(
  input: CreateBrandIdentityProgramInput,
  brandIdentityId: string,
  jobId: string,
  options: {
    deleteBrandIdentity: boolean;
    cleanupJobKey: boolean;
    markJobFailed: boolean;
    errorMessage: string;
  }
) {
  return Effect.gen(function* () {
    if (options.markJobFailed) {
      yield* Effect.tryPromise({
        try: () =>
          setBrandAnalysisJobStatus(input.redis, jobId, "failed", {
            step: null,
            currentStep: 0,
            totalSteps: 3,
            error: options.errorMessage,
          }),
        catch: () => undefined,
      }).pipe(Effect.ignore);
    }

    if (options.cleanupJobKey) {
      yield* Effect.tryPromise({
        try: () => input.redis.del(getBrandAnalysisJobKey(jobId)),
        catch: () => undefined,
      }).pipe(Effect.ignore);
    }

    if (options.deleteBrandIdentity) {
      yield* database(() =>
        input.db
          .delete(brandSettings)
          .where(
            and(
              eq(brandSettings.id, brandIdentityId),
              eq(brandSettings.organizationId, input.organizationId)
            )
          )
      );
    }

    return yield* new BrandAnalysisQueueFailedError();
  });
}

function recoverBeforeWorkflowAccepted(
  input: CreateBrandIdentityProgramInput,
  brandIdentityId: string,
  jobId: string,
  options: { cleanupJobKey: boolean; markJobFailed: boolean }
) {
  return Effect.catch((error: unknown) =>
    failBrandAnalysisQueue(input, brandIdentityId, jobId, {
      deleteBrandIdentity: true,
      cleanupJobKey: options.cleanupJobKey,
      markJobFailed: options.markJobFailed,
      errorMessage: queueFailureMessage(error),
    })
  );
}

function recoverAfterWorkflowAccepted() {
  return Effect.catch(() => Effect.fail(new BrandAnalysisQueueFailedError()));
}

async function isBrandIdentityInUse(
  db: DbClient,
  organizationId: string,
  brandIdentityId: string
) {
  const [project, contentBrief] = await Promise.all([
    db.query.projects.findFirst({
      where: and(
        eq(projects.organizationId, organizationId),
        eq(projects.brandSettingsId, brandIdentityId)
      ),
      columns: { id: true },
    }),
    db.query.geoContentBriefs.findFirst({
      where: and(
        eq(geoContentBriefs.organizationId, organizationId),
        eq(geoContentBriefs.brandSettingsId, brandIdentityId)
      ),
      columns: { id: true },
    }),
  ]);

  return project !== undefined || contentBrief !== undefined;
}

export const listBrandIdentities = Effect.fn("brandIdentities.list")(
  function* ({ db, organizationId }: ListBrandIdentitiesProgramInput) {
    const brandIdentities = yield* database(() =>
      db.query.brandSettings.findMany({
        where: eq(brandSettings.organizationId, organizationId),
        orderBy: [desc(brandSettings.isDefault), asc(brandSettings.createdAt)],
        columns: brandIdentityQueryColumns(),
      })
    );

    return {
      brandIdentities,
    } satisfies ListBrandIdentitiesProgramSuccess;
  }
);

export const createBrandIdentity = Effect.fn("brandIdentities.create")(
  function* (input: CreateBrandIdentityProgramInput) {
    const name = input.body.name?.trim() || "Untitled Brand Voice";
    const websiteUrl = input.body.websiteUrl;
    const newBrandIdentityId = crypto.randomUUID();
    const now = new Date().toISOString();
    const jobId = createBrandAnalysisJobId();

    const hasAnyBrandIdentity = yield* database(() =>
      input.db.query.brandSettings.findFirst({
        where: eq(brandSettings.organizationId, input.organizationId),
        columns: { id: true },
      })
    );

    const insertResult = yield* Effect.tryPromise({
      try: () =>
        insertBrandIdentity(input.db, {
          id: newBrandIdentityId,
          organizationId: input.organizationId,
          name,
          isDefault: !hasAnyBrandIdentity,
          websiteUrl,
        }),
      catch: (cause) => mapCreateInsertError(cause),
    });

    const [brandIdentity] = insertResult;

    if (!brandIdentity) {
      return yield* new BrandIdentityDatabaseError({
        cause: new Error("Failed to create brand identity"),
      });
    }

    const job = yield* Effect.tryPromise({
      try: () =>
        createBrandAnalysisJob(input.redis, {
          id: jobId,
          organizationId: input.organizationId,
          brandIdentityId: brandIdentity.id,
          status: "queued",
          step: null,
          currentStep: 0,
          totalSteps: 3,
          workflowRunId: null,
          error: null,
          createdAt: now,
          updatedAt: now,
          completedAt: null,
        }),
      catch: (cause) => cause,
    }).pipe(
      recoverBeforeWorkflowAccepted(input, brandIdentity.id, jobId, {
        cleanupJobKey: true,
        markJobFailed: false,
      })
    );

    const workflowRunId = yield* Effect.tryPromise({
      try: () =>
        triggerBrandAnalysisWorkflow(input.runtimeEnv, {
          organizationId: input.organizationId,
          url: websiteUrl,
          voiceId: brandIdentity.id,
          jobId,
        }),
      catch: (cause) => cause,
    }).pipe(
      recoverBeforeWorkflowAccepted(input, brandIdentity.id, jobId, {
        cleanupJobKey: false,
        markJobFailed: true,
      })
    );

    const updatedJob = yield* Effect.tryPromise({
      try: () =>
        updateBrandAnalysisJob(input.redis, jobId, {
          workflowRunId,
        }),
      catch: (cause) => cause,
    }).pipe(recoverAfterWorkflowAccepted());

    return {
      job: updatedJob ?? job,
    } satisfies CreateBrandIdentityProgramSuccess;
  }
);

export const getBrandAnalysisJobStatus = Effect.fn(
  "brandIdentities.getAnalysisJob"
)(function* (input: GetBrandAnalysisJobProgramInput) {
  const job = yield* database(() =>
    getBrandAnalysisJob(input.redis, input.jobId)
  );

  if (!job || job.organizationId !== input.organizationId) {
    return yield* new BrandAnalysisJobNotFoundError();
  }

  return {
    job,
  } satisfies GetBrandAnalysisJobProgramSuccess;
});

export const getBrandIdentity = Effect.fn("brandIdentities.get")(function* (
  input: GetBrandIdentityProgramInput
) {
  const brandIdentity = yield* database(() =>
    input.db.query.brandSettings.findFirst({
      where: and(
        eq(brandSettings.id, input.brandIdentityId),
        eq(brandSettings.organizationId, input.organizationId)
      ),
      columns: brandIdentityQueryColumns(),
    })
  );

  return {
    brandIdentity: brandIdentity ?? null,
  } satisfies GetBrandIdentityProgramSuccess;
});

export const patchBrandIdentity = Effect.fn("brandIdentities.patch")(function* (
  input: PatchBrandIdentityProgramInput
) {
  const existingBrandIdentity = yield* database(() =>
    input.db.query.brandSettings.findFirst({
      where: and(
        eq(brandSettings.id, input.brandIdentityId),
        eq(brandSettings.organizationId, input.organizationId)
      ),
      columns: { id: true },
    })
  );

  if (!existingBrandIdentity) {
    return yield* new BrandIdentityNotFoundError();
  }

  const updateData: Partial<typeof brandSettings.$inferInsert> = {
    updatedAt: new Date(),
  };
  const shouldSetDefault = input.body.isDefault === true;
  const { body } = input;

  if (body.name !== undefined) {
    updateData.name = body.name;
  }

  if (body.websiteUrl !== undefined) {
    updateData.websiteUrl = body.websiteUrl;
  }

  if (body.companyName !== undefined) {
    updateData.companyName = body.companyName;
  }

  if (body.companyDescription !== undefined) {
    updateData.companyDescription = body.companyDescription;
  }

  if (body.toneProfile !== undefined) {
    updateData.toneProfile = body.toneProfile;
    if (body.customTone === undefined) {
      updateData.customTone = null;
    }
  }

  if (body.customTone !== undefined) {
    updateData.customTone = body.customTone?.trim() ? body.customTone : null;
  }

  if (body.customInstructions !== undefined) {
    updateData.customInstructions = body.customInstructions;
  }

  if (body.audience !== undefined) {
    updateData.audience = body.audience;
  }

  if (body.language !== undefined) {
    updateData.language = body.language;
  }

  const patchResult = yield* Effect.tryPromise({
    try: () =>
      shouldSetDefault
        ? input.db.transaction(async (tx) => {
            const { updatedAt, ...targetUpdateData } = updateData;

            if (Object.keys(targetUpdateData).length > 0) {
              await tx
                .update(brandSettings)
                .set(targetUpdateData)
                .where(
                  and(
                    eq(brandSettings.id, input.brandIdentityId),
                    eq(brandSettings.organizationId, input.organizationId)
                  )
                );
            }

            await tx
              .update(brandSettings)
              .set({ isDefault: false })
              .where(
                and(
                  eq(brandSettings.organizationId, input.organizationId),
                  eq(brandSettings.isDefault, true),
                  ne(brandSettings.id, input.brandIdentityId)
                )
              );

            return tx
              .update(brandSettings)
              .set({ isDefault: true, updatedAt })
              .where(
                and(
                  eq(brandSettings.id, input.brandIdentityId),
                  eq(brandSettings.organizationId, input.organizationId)
                )
              )
              .returning(selectBrandIdentityColumns());
          })
        : input.db
            .update(brandSettings)
            .set(updateData)
            .where(
              and(
                eq(brandSettings.id, input.brandIdentityId),
                eq(brandSettings.organizationId, input.organizationId)
              )
            )
            .returning(selectBrandIdentityColumns()),
    catch: (cause) => {
      if (isPgUniqueViolation(cause)) {
        return new BrandIdentityNameDuplicateError();
      }

      return new BrandIdentityDatabaseError({ cause });
    },
  });

  const [brandIdentity] = patchResult;

  if (!brandIdentity) {
    return yield* new BrandIdentityNotFoundError();
  }

  return {
    brandIdentity,
  } satisfies PatchBrandIdentityProgramSuccess;
});

export const deleteBrandIdentity = Effect.fn("brandIdentities.delete")(
  function* (input: DeleteBrandIdentityProgramInput) {
    const brandIdentity = yield* database(() =>
      input.db.query.brandSettings.findFirst({
        where: and(
          eq(brandSettings.id, input.brandIdentityId),
          eq(brandSettings.organizationId, input.organizationId)
        ),
        columns: {
          id: true,
          isDefault: true,
        },
      })
    );

    if (!brandIdentity) {
      return yield* new BrandIdentityNotFoundError();
    }

    if (brandIdentity.isDefault) {
      return yield* new BrandIdentityDefaultDeleteError();
    }

    const inUse = yield* database(() =>
      isBrandIdentityInUse(
        input.db,
        input.organizationId,
        input.brandIdentityId
      )
    );

    if (inUse) {
      return yield* new BrandIdentityInUseError();
    }

    const affectedTriggers = yield* database(() =>
      getTriggersForBrandIdentity(
        input.db,
        input.organizationId,
        input.brandIdentityId
      )
    );

    yield* database(() =>
      input.db.transaction(async (tx) => {
        if (affectedTriggers.length > 0) {
          await tx
            .update(contentTriggers)
            .set({
              enabled: false,
              qstashScheduleId: null,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(contentTriggers.organizationId, input.organizationId),
                inArray(
                  contentTriggers.id,
                  affectedTriggers.map((trigger) => trigger.id)
                )
              )
            );
        }

        await tx
          .delete(brandSettings)
          .where(
            and(
              eq(brandSettings.id, input.brandIdentityId),
              eq(brandSettings.organizationId, input.organizationId)
            )
          );
      })
    );

    yield* database(() =>
      deleteQstashSchedulesForTriggers(input.runtimeEnv, affectedTriggers)
    );

    return {
      id: input.brandIdentityId,
      disabledSchedules: affectedTriggers
        .filter((trigger) => trigger.sourceType === "cron")
        .map((trigger) => ({ id: trigger.id, name: trigger.name })),
      disabledEvents: affectedTriggers
        .filter((trigger) => trigger.sourceType !== "cron")
        .map((trigger) => ({ id: trigger.id, name: trigger.name })),
    } satisfies DeleteBrandIdentityProgramSuccess;
  }
);

export const findBrandIdentityNameDuplicate = Effect.fn(
  "brandIdentities.findNameDuplicate"
)(function* ({
  db,
  organizationId,
  name,
}: {
  db: DbClient;
  organizationId: string;
  name: string;
}) {
  const existingBrandIdentityWithName = yield* database(() =>
    db.query.brandSettings.findFirst({
      where: and(
        eq(brandSettings.organizationId, organizationId),
        eq(brandSettings.name, name)
      ),
      columns: { id: true },
    })
  );

  if (existingBrandIdentityWithName) {
    return yield* new BrandIdentityNameDuplicateError();
  }
});
