import { demoSandboxRoute } from "@/lib/demo/route";
import { resetDemoSandbox } from "@/lib/demo/sandbox";

export const POST = demoSandboxRoute(async (sandbox) => {
  const { slug } = await resetDemoSandbox(sandbox);
  return Response.json({ slug });
});
