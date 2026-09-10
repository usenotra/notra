import { askRequestSchema } from "@/schemas/ask";
import { buildAgentJson } from "@/utils/agent-metadata";

export async function POST(request: Request) {
  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = askRequestSchema.safeParse(rawBody ?? {});

  if (!parsed.success) {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const body = parsed.data;
  const streaming = body.prefer?.streaming === true;
  const agent = buildAgentJson();
  const result = {
    _meta: {
      response_type: "answer",
      version: "1.0",
    },
    query: body.query ?? null,
    answer: agent.description,
    resources: [agent.api.openapi, agent.api.auth, agent.mcp.docs],
  };

  if (!streaming) {
    return Response.json(result);
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      for (const event of [
        { type: "start", _meta: result._meta },
        { type: "result", result },
        { type: "complete" },
      ]) {
        controller.enqueue(
          encoder.encode(
            `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`
          )
        );
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache",
    },
  });
}
