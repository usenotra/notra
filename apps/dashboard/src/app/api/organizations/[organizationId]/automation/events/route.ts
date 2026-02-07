import { db } from "@notra/db/drizzle";
import { contentTriggers } from "@notra/db/schema";
import crypto from "crypto";
import { and, eq, ne } from "drizzle-orm";
import { customAlphabet } from "nanoid";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { withOrganizationAuth } from "@/lib/auth/organization";
import { deleteQstashSchedule } from "@/lib/triggers/qstash";
import type { Trigger } from "@/types/triggers";
import { configureTriggerBodySchema } from "@/utils/schemas/integrations";

const COMING_SOON = true;
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
  if (COMING_SOON) {
    return NextResponse.json({ triggers: [] });
  }

  try {
    const { organizationId } = await params;
    const auth = await withOrganizationAuth(request, organizationId);

    if (!auth.success) {
      return auth.response;
    }

    const triggers = await db.query.contentTriggers.findMany({
      where: and(
        eq(contentTriggers.organizationId, organizationId),
        eq(contentTriggers.sourceType, "github_webhook")
      ),
      orderBy: (items, { desc }) => [desc(items.createdAt)],
    });

    return NextResponse.json({ triggers });
  } catch (error) {
    console.error("Error fetching automation events:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  if (COMING_SOON) {
    return NextResponse.json({ error: "Feature coming soon" }, { status: 503 });
  }

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
        { status: 400 }
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

    if (sourceType !== "github_webhook") {
      return NextResponse.json(
        { error: "Only event triggers are supported here" },
        { status: 400 }
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
        eq(contentTriggers.dedupeHash, dedupeHash)
      ),
    });

    if (existing) {
      return NextResponse.json(
        { error: "Duplicate trigger", code: "DUPLICATE_TRIGGER" },
        { status: 409 }
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

    return NextResponse.json({ trigger });
  } catch (error) {
    console.error("Error creating automation event:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  if (COMING_SOON) {
    return NextResponse.json({ error: "Feature coming soon" }, { status: 503 });
  }

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
        { status: 400 }
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
        { status: 400 }
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

    if (sourceType !== "github_webhook") {
      return NextResponse.json(
        { error: "Only event triggers are supported here" },
        { status: 400 }
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
        ne(contentTriggers.id, triggerId)
      ),
    });

    if (duplicate) {
      return NextResponse.json(
        { error: "Duplicate trigger", code: "DUPLICATE_TRIGGER" },
        { status: 409 }
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
        qstashScheduleId: null,
        updatedAt: new Date(),
      })
      .where(eq(contentTriggers.id, triggerId))
      .returning();

    if (trigger?.qstashScheduleId) {
      await deleteQstashSchedule(trigger.qstashScheduleId);
    }

    return NextResponse.json({ trigger });
  } catch (error) {
    console.error("Error updating automation event:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  if (COMING_SOON) {
    return NextResponse.json({ error: "Feature coming soon" }, { status: 503 });
  }

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
        { status: 400 }
      );
    }

    const existing = await db.query.contentTriggers.findFirst({
      where: and(
        eq(contentTriggers.id, triggerId),
        eq(contentTriggers.organizationId, organizationId)
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
          eq(contentTriggers.organizationId, organizationId)
        )
      );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting automation event:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
