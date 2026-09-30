import { db } from "@notra/db/drizzle";
import { projects } from "@notra/db/schema";
import { and, eq } from "drizzle-orm";

export async function validatedOnboardingProjectId(
  organizationId: string,
  requestedProjectId?: string
): Promise<string | undefined> {
  if (!requestedProjectId) {
    return undefined;
  }

  const project = await db.query.projects.findFirst({
    columns: { id: true },
    where: and(
      eq(projects.id, requestedProjectId),
      eq(projects.organizationId, organizationId)
    ),
  });
  return project?.id;
}
