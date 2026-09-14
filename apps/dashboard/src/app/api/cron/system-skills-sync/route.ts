import { publishSystemSkills } from "@notra/ai/skills/registry";
import { db } from "@notra/db/drizzle";

export const maxDuration = 60;

/**
 * Fallback for the API boot publish (`apps/api/src/utils/system-skills.ts`).
 * Idempotent: with nothing new in code it publishes nothing.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (
    !cronSecret ||
    request.headers.get("authorization") !== `Bearer ${cronSecret}`
  ) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const result = await publishSystemSkills(db);
    return Response.json(result);
  } catch (error) {
    console.error("[cron] system skills sync failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return Response.json(
      { error: "System skills sync failed" },
      { status: 500 }
    );
  }
}
