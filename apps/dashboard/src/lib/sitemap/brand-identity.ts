import "@tanstack/react-start/server-only";
import { db } from "@notra/db/drizzle";
import { brandSettings } from "@notra/db/schema";
import { and, eq } from "drizzle-orm";

export function getSitemapBrandIdentity(
  organizationId: string,
  voiceId: string
) {
  return db.query.brandSettings.findFirst({
    where: and(
      eq(brandSettings.id, voiceId),
      eq(brandSettings.organizationId, organizationId)
    ),
    columns: {
      id: true,
      websiteUrl: true,
    },
  });
}
