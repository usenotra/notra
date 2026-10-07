import "zod/compile";
import { scheduleDestinationSchema } from "@notra/ai/schemas/post-schedules";
import { isValidTimezone } from "@notra/ai/utils/current-date";
// biome-ignore lint/performance/noNamespaceImport: Zod recommended way to import
import * as z from "zod";

import {
  CONTENT_CALENDAR_MAX_RANGE_DAYS,
  CONTENT_CALENDAR_TIME_ZONE_MAX_LENGTH,
} from "../../constants/dashboard/content-calendar";
import {
  contentInputSchema,
  contentOrganizationIdInputSchema,
  contentProjectIdInputSchema,
} from "./content";

const DAY_MS = 24 * 60 * 60 * 1000;

export const schedulePostInputSchema = contentInputSchema.extend({
  scheduledAt: z.iso.datetime({ offset: true }),
  timeZone: z
    .string()
    .trim()
    .min(1)
    .max(CONTENT_CALENDAR_TIME_ZONE_MAX_LENGTH)
    .refine(isValidTimezone, "Unknown time zone"),
  /** External destinations. Publishing in Notra is always part of a schedule. */
  destinations: z
    .array(scheduleDestinationSchema)
    .max(2)
    .refine(
      (destinations) =>
        new Set(destinations.map((item) => item.destination)).size ===
        destinations.length,
      "Each destination can only be added once"
    )
    .default([]),
  /**
   * Pending rows this call replaces, as the client last saw them. The server
   * rejects the call when they changed, so a stale view cannot resend a
   * destination that already went out.
   */
  expectedScheduledIds: z.array(z.string().min(1)).max(10).optional(),
});

export const scheduledPublicationIdInputSchema =
  contentOrganizationIdInputSchema.extend({
    scheduledPublicationId: z.string().trim().min(1),
  });

export const contentCalendarRangeInputSchema = contentOrganizationIdInputSchema
  .extend(contentProjectIdInputSchema.shape)
  .extend({
    from: z.iso.datetime({ offset: true }),
    to: z.iso.datetime({ offset: true }),
  })
  .refine(
    (input) => {
      const span = Date.parse(input.to) - Date.parse(input.from);
      return span > 0 && span <= CONTENT_CALENDAR_MAX_RANGE_DAYS * DAY_MS;
    },
    { message: "Invalid calendar range", path: ["to"] }
  );
