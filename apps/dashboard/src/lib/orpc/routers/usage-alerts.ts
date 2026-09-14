import {
  allowUnmeteredAiInDevelopment,
  autumn,
} from "@notra/ai/billing/autumn";
import { updateUsageAlertsInputSchema } from "@notra/schemas/dashboard/usage-alerts";

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
        throw forbidden("Only the organization owner can manage usage alerts");
      }

      if (!autumn) {
        if (allowUnmeteredAiInDevelopment) {
          return {
            alerts: setDevelopmentUsageAlerts(input.alerts),
          };
        }
        throw serviceUnavailable("Billing is not configured");
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
