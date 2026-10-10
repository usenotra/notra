import { gatewayAttributionOptions } from "@notra/ai/utils/usage-attribution";
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
      "step.started": (event, ctx) => {
        const organizationId = getOrganizationId(ctx);
        const turnId = (event as { data?: { turnId?: unknown } }).data?.turnId;
        return {
          model,
          modelContextWindowTokens,
          modelOptions: {
            providerOptions: {
              gateway: gatewayAttributionOptions({
                organizationId,
                sessionId: ctx.session.id,
                turnId: typeof turnId === "string" ? turnId : undefined,
              }),
            },
          },
        };
      },
    },
  });
}
