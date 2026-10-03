import { isDemoMode } from "@notra/utils/demo-mode";

import { getCurrentDemoSandbox } from "@/lib/demo/session";
import type { DemoSandbox } from "@/types/demo";

/**
 * Wraps a demo API route: 404 outside the demo, 401 without a sandbox,
 * otherwise runs `handler` with the visitor's sandbox.
 */
export function demoSandboxRoute<TArgs extends unknown[]>(
  handler: (sandbox: DemoSandbox, ...args: TArgs) => Promise<Response>
): (...args: TArgs) => Promise<Response> {
  return async (...args) => {
    if (!isDemoMode()) {
      return new Response(null, { status: 404 });
    }
    const sandbox = await getCurrentDemoSandbox();
    if (!sandbox) {
      return Response.json({ error: "No demo workspace" }, { status: 401 });
    }
    return handler(sandbox, ...args);
  };
}
