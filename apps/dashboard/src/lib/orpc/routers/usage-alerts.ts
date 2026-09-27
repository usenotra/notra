import {
  allowUnmeteredAiInDevelopment,
  autumn,
} from "@notra/ai/billing/autumn";
import { updateUsageAlertsInputSchema } from "@notra/schemas/dashboard/usage-alerts";
import { getTranslations } from "next-intl/server";

import { assertOrganizationAccess } from "@/lib/auth/organization";
import { authorizedProcedure } from "@/lib/orpc/base";
import { forbidden, serviceUnavailable } from "@/lib/orpc/utils/errors";
import { setDevelopmentUsageAlerts } from "@/utils/development-usage-alerts";

export const usageAlertsRouter = {
  update: authorizedProcedure
    .input(updateUsageAlertsInputSchema)
    .handler(async ({ context, input }) => {
      const access = await assertOrganizationAccess({
        headers: context.headers,
        organizationId: input.organizationId,
        user: context.user,
      });

      if (access.membership.role !== "owner") {
        const tErrors = await getTranslations("errors.usageAlerts");
        throw forbidden(tErrors("ownerOnly"));
      }

      if (!autumn) {
        if (allowUnmeteredAiInDevelopment) {
          return {
            alerts: setDevelopmentUsageAlerts(
              input.organizationId,
              input.alerts
            ),
          };
        }
        throw serviceUnavailable(
          (await getTranslations("common.errors"))("generic")
        );
      }

      await autumn.customers.update({
        customerId: input.organizationId,
        billingControls: {
          usageAlerts: input.alerts,
        },
      });

      return {
        alerts: input.alerts,
      };
    }),
};
