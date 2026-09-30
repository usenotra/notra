import { isDemoMode } from "@notra/utils/demo-mode";

import { resetDemoSandbox } from "@/lib/demo/sandbox";
import { getCurrentDemoSandbox } from "@/lib/demo/session";

export const maxDuration = 60;

export async function POST() {
  if (!isDemoMode()) {
    return new Response(null, { status: 404 });
  }
  const sandbox = await getCurrentDemoSandbox();
  if (!sandbox) {
    return Response.json({ error: "No demo workspace" }, { status: 401 });
  }
  const { slug } = await resetDemoSandbox(sandbox);
  return Response.json({ slug });
}
