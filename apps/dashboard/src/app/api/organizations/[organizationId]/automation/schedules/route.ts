import { withOrganizationAuth } from "@/lib/auth/organization";
import { db } from "@notra/db/drizzle";
import { contentTriggers } from "@notra/db/schema";
import { and, eq, ne } from "drizzle-orm";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { Trigger } from "@/types/triggers";
import { configureTriggerBodySchema } from "@/utils/schemas/integrations";
import {
  buildCronExpression,
  createQstashSchedule,
  deleteQstashSchedule,
} from "@/lib/triggers/qstash";
import { customAlphabet } from "nanoid";
import crypto from "crypto";

const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 16);

interface RouteContext {
  params: Promise<{ organizationId: string }>;
}

function normalizeTriggerConfig({
  sourceConfig,
  targets,
}: {
  sourceConfig: Trigger["sourceConfig"];
  targets: Trigger["targets"];
}) {
  const eventTypes = sourceConfig.eventTypes
    ? [...sourceConfig.eventTypes].sort()
    : sourceConfig.eventTypes;

  const repositoryIds = [...targets.repositoryIds].sort();

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
  sourceConfig: Trigger["sourceConfig"];
  targets: Trigger["targets"];
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

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { organizationId } = await params;
    const auth = await withOrganizationAuth(request, organizationId);

    if (!auth.success) {
      return auth.response;
    }

    const triggers = await db.query.contentTriggers.findMany({
      where: and(
        eq(contentTriggers.organizationId, organizationId),
        eq(contentTriggers.sourceType, "cron"),
      ),
      orderBy: (items, { desc }) => [desc(items.createdAt)],
    });

    return NextResponse.json({ triggers });
  } catch (error) {
    console.error("Error fetching automation schedules:", error);
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

    if (sourceType !== "cron") {
      return NextResponse.json(
        { error: "Only schedule triggers are supported here" },
        { status: 400 },
      );
    }

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

    const triggerId = nanoid();
    let qstashScheduleId: string | null = null;

    if (sourceConfig.cron) {
      const cronExpression = buildCronExpression(sourceConfig.cron);
      if (cronExpression) {
        qstashScheduleId = await createQstashSchedule({
          triggerId,
          cron: cronExpression,
        });
      }
    }

    try {
      const [trigger] = await db
        .insert(contentTriggers)
        .values({
          id: triggerId,
          organizationId,
          sourceType,
          sourceConfig: normalized.sourceConfig,
          targets: normalized.targets,
          outputType,
          outputConfig: outputConfig ?? null,
          dedupeHash,
          enabled,
          qstashScheduleId,
        })
        .returning();

      return NextResponse.json({ trigger });
    } catch (dbError) {
      if (qstashScheduleId) {
        await deleteQstashSchedule(qstashScheduleId).catch(() => {});
      }
      throw dbError;
    }
  } catch (error) {
    console.error("Error creating automation schedule:", error);
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

    if (sourceType !== "cron") {
      return NextResponse.json(
        { error: "Only schedule triggers are supported here" },
        { status: 400 },
      );
    }

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

    const existing = await db.query.contentTriggers.findFirst({
      where: and(
        eq(contentTriggers.id, triggerId),
        eq(contentTriggers.organizationId, organizationId),
      ),
    });

    if (!existing) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }

    const oldQstashScheduleId = existing.qstashScheduleId ?? null;
    let newQstashScheduleId: string | null = null;

    if (sourceConfig.cron) {
      const cronExpression = buildCronExpression(sourceConfig.cron);
      if (cronExpression) {
        newQstashScheduleId = await createQstashSchedule({
          triggerId,
          cron: cronExpression,
        });
      }
    }

    try {
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
          qstashScheduleId: newQstashScheduleId,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(contentTriggers.id, triggerId),
            eq(contentTriggers.organizationId, organizationId),
          ),
        )
        .returning();

      if (oldQstashScheduleId) {
        await deleteQstashSchedule(oldQstashScheduleId).catch(() => {});
      }

      return NextResponse.json({ trigger });
    } catch (dbError) {
      if (newQstashScheduleId) {
        await deleteQstashSchedule(newQstashScheduleId).catch(() => {});
      }
      throw dbError;
    }
  } catch (error) {
    console.error("Error updating automation schedule:", error);
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
    console.error("Error deleting automation schedule:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
