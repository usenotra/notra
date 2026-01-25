import crypto from "node:crypto";
import { withOrganizationAuth } from "@/lib/auth/organization";
import { db } from "@notra/db/drizzle";
import { contentTriggers } from "@notra/db/schema";
import { and, eq, ne } from "drizzle-orm";
import { customAlphabet } from "nanoid";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { TriggerSourceConfig, TriggerTarget } from "@/types/triggers";
import { configureTriggerBodySchema } from "@/utils/schemas/integrations";
import {
  buildCronExpression,
  createQstashSchedule,
  deleteQstashSchedule,
} from "@/lib/triggers/qstash";

const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 16);

function normalizeTriggerConfig({
  sourceConfig,
  targets,
}: {
  sourceConfig: TriggerSourceConfig;
  targets: TriggerTarget;
}) {
  const eventTypes = sourceConfig.eventTypes
    ? [...sourceConfig.eventTypes].sort()
    : sourceConfig.eventTypes;

  const repositoryIds = targets.repositoryIds
    ? [...targets.repositoryIds].sort()
    : [];

  return {
    sourceConfig: {
      ...sourceConfig,
      eventTypes,
    },
    targets: {
      repositoryIds,
    },
  };
}

function hashTrigger({
  sourceType,
  sourceConfig,
  targets,
  outputType,
}: {
  sourceType: string;
  sourceConfig: TriggerSourceConfig;
  targets: TriggerTarget;
  outputType: string;
}) {
  const normalized = normalizeTriggerConfig({ sourceConfig, targets });
  const payload = JSON.stringify({
    sourceType,
    sourceConfig: normalized.sourceConfig,
    targets: normalized.targets,
    outputType,
  });
  return crypto.createHash("sha256").update(payload).digest("hex");
}

interface RouteContext {
  params: Promise<{ organizationId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { organizationId } = await params;
    const auth = await withOrganizationAuth(request, organizationId);

    if (!auth.success) {
      return auth.response;
    }

    const triggers = await db.query.contentTriggers.findMany({
      where: eq(contentTriggers.organizationId, organizationId),
      orderBy: (triggers, { desc }) => [desc(triggers.createdAt)],
    });

    return NextResponse.json({ triggers });
  } catch (error) {
    console.error("Error fetching triggers:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { organizationId } = await params;
    const auth = await withOrganizationAuth(request, organizationId);

    if (!auth.success) {
      return auth.response;
    }

    const body = await request.json();
    const bodyValidation = configureTriggerBodySchema.safeParse(body);

    if (!bodyValidation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: bodyValidation.error.issues,
        },
        { status: 400 },
      );
    }

    const {
      sourceType,
      sourceConfig,
      targets,
      outputType,
      outputConfig,
      enabled,
    } = bodyValidation.data;

    const normalized = normalizeTriggerConfig({ sourceConfig, targets });
    const dedupeHash = hashTrigger({
      sourceType,
      sourceConfig: normalized.sourceConfig,
      targets: normalized.targets,
      outputType,
    });

    const existing = await db.query.contentTriggers.findFirst({
      where: and(
        eq(contentTriggers.organizationId, organizationId),
        eq(contentTriggers.dedupeHash, dedupeHash),
      ),
    });

    if (existing) {
      return NextResponse.json(
        { error: "Duplicate trigger", code: "DUPLICATE_TRIGGER" },
        { status: 409 },
      );
    }

    const [trigger] = await db
      .insert(contentTriggers)
      .values({
        id: nanoid(),
        organizationId,
        sourceType,
        sourceConfig: normalized.sourceConfig,
        targets: normalized.targets,
        outputType,
        outputConfig: outputConfig ?? null,
        dedupeHash,
        enabled,
      })
      .returning();

    if (trigger && sourceType === "cron" && sourceConfig.cron) {
      const cronExpression = buildCronExpression(sourceConfig.cron);
      if (cronExpression) {
        const scheduleId = await createQstashSchedule({
          triggerId: trigger.id,
          cron: cronExpression,
        });
        await db
          .update(contentTriggers)
          .set({ qstashScheduleId: scheduleId })
          .where(eq(contentTriggers.id, trigger.id));
        trigger.qstashScheduleId = scheduleId;
      }
    }

    return NextResponse.json({ trigger });
  } catch (error) {
    console.error("Error creating trigger:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const { organizationId } = await params;
    const auth = await withOrganizationAuth(request, organizationId);

    if (!auth.success) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);
    const triggerId = searchParams.get("triggerId");
    if (!triggerId) {
      return NextResponse.json(
        { error: "Trigger ID required" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const bodyValidation = configureTriggerBodySchema.safeParse(body);

    if (!bodyValidation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: bodyValidation.error.issues,
        },
        { status: 400 },
      );
    }

    const {
      sourceType,
      sourceConfig,
      targets,
      outputType,
      outputConfig,
      enabled,
    } = bodyValidation.data;

    const normalized = normalizeTriggerConfig({ sourceConfig, targets });
    const dedupeHash = hashTrigger({
      sourceType,
      sourceConfig: normalized.sourceConfig,
      targets: normalized.targets,
      outputType,
    });

    const duplicate = await db.query.contentTriggers.findFirst({
      where: and(
        eq(contentTriggers.organizationId, organizationId),
        eq(contentTriggers.dedupeHash, dedupeHash),
        ne(contentTriggers.id, triggerId),
      ),
    });

    if (duplicate) {
      return NextResponse.json(
        { error: "Duplicate trigger", code: "DUPLICATE_TRIGGER" },
        { status: 409 },
      );
    }

    const [trigger] = await db
      .update(contentTriggers)
      .set({
        sourceType,
        sourceConfig: normalized.sourceConfig,
        targets: normalized.targets,
        outputType,
        outputConfig: outputConfig ?? null,
        dedupeHash,
        enabled,
        updatedAt: new Date(),
      })
      .where(eq(contentTriggers.id, triggerId))
      .returning();

    if (trigger) {
      if (trigger.qstashScheduleId && sourceType !== "cron") {
        await deleteQstashSchedule(trigger.qstashScheduleId);
        await db
          .update(contentTriggers)
          .set({ qstashScheduleId: null })
          .where(eq(contentTriggers.id, trigger.id));
        trigger.qstashScheduleId = null;
      }

      if (sourceType === "cron" && sourceConfig.cron) {
        const cronExpression = buildCronExpression(sourceConfig.cron);
        if (cronExpression) {
          if (trigger.qstashScheduleId) {
            await deleteQstashSchedule(trigger.qstashScheduleId);
          }
          const scheduleId = await createQstashSchedule({
            triggerId: trigger.id,
            cron: cronExpression,
          });
          await db
            .update(contentTriggers)
            .set({ qstashScheduleId: scheduleId })
            .where(eq(contentTriggers.id, trigger.id));
          trigger.qstashScheduleId = scheduleId;
        }
      }
    }

    return NextResponse.json({ trigger });
  } catch (error) {
    console.error("Error updating trigger:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const { organizationId } = await params;
    const auth = await withOrganizationAuth(request, organizationId);

    if (!auth.success) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);
    const triggerId = searchParams.get("triggerId");
    if (!triggerId) {
      return NextResponse.json(
        { error: "Trigger ID required" },
        { status: 400 },
      );
    }

    const existing = await db.query.contentTriggers.findFirst({
      where: and(
        eq(contentTriggers.id, triggerId),
        eq(contentTriggers.organizationId, organizationId),
      ),
    });

    if (!existing) {
      return NextResponse.json({ success: true });
    }

    if (existing.qstashScheduleId) {
      await deleteQstashSchedule(existing.qstashScheduleId);
    }

    await db
      .delete(contentTriggers)
      .where(
        and(
          eq(contentTriggers.id, triggerId),
          eq(contentTriggers.organizationId, organizationId),
        ),
      );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting trigger:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
