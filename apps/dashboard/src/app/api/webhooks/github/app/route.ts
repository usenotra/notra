import { ingestGitHubAppMentionWebhook } from "@notra/ai/utils/github-mention-ingest";
import { after, type NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const result = await ingestGitHubAppMentionWebhook({
    event: request.headers.get("x-github-event"),
    signature: request.headers.get("x-hub-signature-256"),
    deliveryId: request.headers.get("x-github-delivery"),
    rawBody,
  });

  if (result.run) {
    after(async () => {
      try {
        await result.run?.();
      } catch (error) {
        console.error("[github-mention] mention processing failed", error);
      }
    });
  }

  return Response.json(result.body, { status: result.httpStatus });
}
