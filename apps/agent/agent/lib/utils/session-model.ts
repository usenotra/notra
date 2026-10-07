import { getOrganizationId } from "@notra/tools/utils/organization";
import { defineDynamic } from "eve";

import { createAgentModel } from "./model";

export function createSessionAgentModel(
  modelId: string,
  tag: string,
  modelContextWindowTokens: number
) {
  const model = createAgentModel(modelId, tag);
  return defineDynamic({
    events: {
      "step.started": (_event, ctx) => {
        const organizationId = getOrganizationId(ctx);
        const gatewayOptions: Record<string, string> = {};
        if (organizationId) {
          gatewayOptions.user = organizationId;
        }
        return {
          model,
          modelContextWindowTokens,
          modelOptions: {
            providerOptions: {
              gateway: gatewayOptions,
            },
          },
        };
      },
    },
  });
}
