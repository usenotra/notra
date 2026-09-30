import { isDemoMode } from "@notra/utils/demo-mode";

import { resetDemoSandbox } from "@/lib/demo/sandbox";
import { getCurrentDemoSandbox } from "@/lib/demo/session";
import { demoPersonalizationSchema } from "@/schemas/demo";

export const maxDuration = 60;

/**
 * "Customize your experience": rebuilds the visitor's workspace around their
 * own name and company. Nothing is stored beyond the sandbox itself.
 */
export async function POST(request: Request) {
  if (!isDemoMode()) {
    return new Response(null, { status: 404 });
  }
  const sandbox = await getCurrentDemoSandbox();
  if (!sandbox) {
    return Response.json({ error: "No demo workspace" }, { status: 401 });
  }
  const parsed = demoPersonalizationSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return Response.json({ error: "Invalid details" }, { status: 400 });
  }
  const { slug } = await resetDemoSandbox(sandbox, parsed.data);
  return Response.json({ slug });
}
