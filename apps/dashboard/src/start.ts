import { createCsrfMiddleware, createStart } from "@tanstack/react-start";

import { dashboardAuthMiddleware } from "@/middleware/auth";

export const startInstance = createStart(() => ({
  requestMiddleware: [
    createCsrfMiddleware({
      filter: (context) => context.handlerType === "serverFn",
    }),
    dashboardAuthMiddleware,
  ],
}));
