import { publicationSyncRepairSchema } from "@notra/ai/schemas/content-publication";

import { verifyInternalWorkflowRequest } from "@/lib/workflows/internal-auth";
import { startContentPublicationSyncRepair } from "@/lib/workflows/start";

export async function POST(request: Request) {
  if (!(await verifyInternalWorkflowRequest(request))) {
    return new Response("Unauthorized", { status: 401 });
  }
  const parsed = publicationSyncRepairSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }
  await startContentPublicationSyncRepair(parsed.data);
  return new Response(null, { status: 202 });
}
