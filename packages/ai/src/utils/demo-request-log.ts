import { realtime } from "@notra/ai/realtime";
import {
  DEMO_REQUEST_BODY_MAX_CHARS,
  DEMO_REQUEST_LOG_MAX_ROWS,
} from "@notra/db/constants/demo";
import { db } from "@notra/db/drizzle";
import { demoRequestLog, demoSandboxes } from "@notra/db/schema";
import type {
  DemoRequestEvent,
  DemoRequestRecordInput,
} from "@notra/db/types/demo";
import { demoRequestChannel } from "@notra/db/utils/demo-channel";
import { and, desc, eq, lt } from "drizzle-orm";

function truncate(body: string | null): string | null {
  if (body === null || body.length <= DEMO_REQUEST_BODY_MAX_CHARS) {
    return body;
  }
  return `${body.slice(0, DEMO_REQUEST_BODY_MAX_CHARS)}…`;
}

/**
 * Records one request in the visitor's demo feed and pushes it to the
 * dashboard over realtime. Keeps only the newest rows per sandbox. Never
 * throws: the feed is a nice-to-have next to the request it describes.
 */
export async function recordDemoRequest(
  input: DemoRequestRecordInput
): Promise<DemoRequestEvent | null> {
  try {
    const sandbox = await db.query.demoSandboxes.findFirst({
      columns: { anonymousId: true },
      where: eq(demoSandboxes.organizationId, input.organizationId),
    });
    if (!sandbox) {
      return null;
    }

    const createdAt = new Date();
    const event: DemoRequestEvent = {
      id: crypto.randomUUID(),
      source: input.source,
      method: input.method,
      path: input.path,
      status: input.status,
      durationMs: Math.round(input.durationMs),
      createdAt: createdAt.toISOString(),
      affected: input.affected ?? [],
    };

    await db.insert(demoRequestLog).values({
      id: event.id,
      anonymousId: sandbox.anonymousId,
      source: event.source,
      method: event.method,
      path: event.path,
      status: event.status,
      durationMs: event.durationMs,
      requestBody: truncate(input.requestBody),
      responseBody: truncate(input.responseBody),
      affected: event.affected,
      createdAt,
    });

    const cutoff = await db.query.demoRequestLog.findFirst({
      columns: { createdAt: true },
      where: eq(demoRequestLog.anonymousId, sandbox.anonymousId),
      orderBy: [desc(demoRequestLog.createdAt)],
      offset: DEMO_REQUEST_LOG_MAX_ROWS,
    });
    if (cutoff) {
      await db
        .delete(demoRequestLog)
        .where(
          and(
            eq(demoRequestLog.anonymousId, sandbox.anonymousId),
            lt(demoRequestLog.createdAt, cutoff.createdAt)
          )
        );
    }

    await realtime
      ?.channel(demoRequestChannel(input.organizationId))
      .emit("demo.request", event);
    return event;
  } catch (error) {
    console.error("[demo] Failed to record request", error);
    return null;
  }
}
