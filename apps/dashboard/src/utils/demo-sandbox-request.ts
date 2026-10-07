import { demoSlugResponseSchema } from "@/schemas/demo";

/**
 * Posts to a sandbox endpoint that rebuilds the workspace (reset, customize)
 * and returns the new workspace slug to navigate to.
 */
export async function rebuildDemoSandbox(
  endpoint: "reset" | "customize",
  body?: unknown
): Promise<string> {
  const response = await fetch(`/api/demo/sandbox/${endpoint}`, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    throw new Error(`Demo ${endpoint} failed with ${response.status}`);
  }
  return demoSlugResponseSchema.parse(await response.json()).slug;
}
