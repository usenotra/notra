import { db } from "@notra/db/drizzle";
import { organizations } from "@notra/db/schema";
import { EMAIL_CONFIG } from "@notra/email/utils/config";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { submitFeedbackInputSchema } from "@notra/schemas/dashboard/feedback";
import { eq } from "drizzle-orm";

import { trackServerEvent } from "@/lib/analytics/posthog-server";
import { assertOrganizationAccess } from "@/lib/auth/organization";
import { sendFeedbackEmail } from "@/lib/email/send";
import { authorizedProcedure } from "@/lib/orpc/base";
import { internalServerError } from "@/lib/orpc/utils/errors";

export const feedbackRouter = {
  submit: authorizedProcedure
    .input(submitFeedbackInputSchema)
    .handler(async ({ context, input }) => {
      let organizationName: string | undefined;
      let organizationSlug: string | undefined;

      if (input.organizationId) {
        const { organizationId } = await assertOrganizationAccess({
          headers: context.headers,
          organizationId: input.organizationId,
          user: context.user,
        });

        try {
          const org = await db.query.organizations.findFirst({
            columns: { name: true, slug: true },
            where: eq(organizations.id, organizationId),
          });

          if (org) {
            organizationName = org.name;
            organizationSlug = org.slug;
          }
        } catch {
          // Non-fatal: feedback should still reach support even if the org
          // lookup fails.
        }
      }

      const payload = {
        to: process.env.FEEDBACK_EMAIL_TO ?? EMAIL_CONFIG.replyTo,
        message: input.message,
        sentiment: input.sentiment,
        userName: context.user.name,
        userEmail: context.user.email,
        organizationName,
        organizationSlug,
        pageUrl: input.pageUrl,
        userAgent: context.headers.get("user-agent") ?? undefined,
      };

      trackServerEvent({
        event: POSTHOG_EVENTS.PRODUCT_FEEDBACK_SENT,
        headers: context.headers,
        userId: context.user.id,
        organizationId: input.organizationId,
        properties: {
          sentiment: input.sentiment ?? null,
          has_page_url: input.pageUrl !== undefined,
          message_length: input.message.length,
        },
      });

      const { error } = await sendFeedbackEmail(payload);

      if (error) {
        throw internalServerError("Failed to send feedback", error);
      }

      return { success: true };
    }),
};
