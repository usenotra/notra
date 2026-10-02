import { createRouter } from "@tanstack/react-router";

import {
  rewriteAgentModeInput,
  rewriteAgentModeOutput,
} from "@/utils/agent-mode";

import { routeTree } from "./routeTree.gen";

export function getRouter() {
  return createRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: "intent",
    rewrite: { input: rewriteAgentModeInput, output: rewriteAgentModeOutput },
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
