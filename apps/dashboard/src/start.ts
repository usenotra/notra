import { createCsrfMiddleware, createStart } from "@tanstack/react-start";

import { dashboardAuthMiddleware } from "@/middleware/auth";
import { functionErrorTelemetry } from "@/middleware/function-errors";

export const startInstance = createStart(() => ({
  requestMiddleware: [
    createCsrfMiddleware({
      filter: (context) => context.handlerType === "serverFn",
    }),
    dashboardAuthMiddleware,
  ],
  functionMiddleware: [functionErrorTelemetry],
}));
