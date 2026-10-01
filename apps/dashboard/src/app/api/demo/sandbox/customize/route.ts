import { demoSandboxRoute } from "@/lib/demo/route";
import { resetDemoSandbox } from "@/lib/demo/sandbox";
import { demoPersonalizationSchema } from "@/schemas/demo";

export const maxDuration = 60;

/**
 * "Customize your experience": rebuilds the visitor's workspace around their
 * own name and company. Nothing is stored beyond the sandbox itself.
 */
export const POST = demoSandboxRoute(async (sandbox, request: Request) => {
  const parsed = demoPersonalizationSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return Response.json({ error: "Invalid details" }, { status: 400 });
  }
  const { slug } = await resetDemoSandbox(sandbox, parsed.data);
  return Response.json({ slug });
});
