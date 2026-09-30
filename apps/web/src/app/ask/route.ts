import { NLWEB_RESPONSE_FORMAT, NLWEB_VERSION } from "@/constants/nlweb";
import { askRequestSchema } from "@/schemas/ask";
import type { NlwebFailure, NlwebResponse } from "@/types/nlweb";
import { nlwebMeta, retrieveNlwebResults } from "@/utils/nlweb";

function failure(
  code: NlwebFailure["error"]["code"],
  message: string
): NlwebFailure {
  return {
    _meta: nlwebMeta("failure"),
    error: { code, message },
  };
}

function streamResponse(response: NlwebResponse) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const events: Array<{ event: string; data: unknown }> = [
        {
          event: "start",
          data: { _meta: { ...response._meta, streaming: true } },
        },
      ];

      if ("results" in response) {
        response.results.forEach((item, index) => {
          events.push({ event: "result", data: { index, item } });
        });
      } else {
        events.push({ event: "error", data: response });
      }

      events.push({ event: "complete", data: { _meta: response._meta } });

      for (const { event, data } of events) {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "cache-control": "no-cache",
      "content-type": "text/event-stream; charset=utf-8",
    },
  });
}

export async function POST(request: Request) {
  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = askRequestSchema.safeParse(rawBody);

  if (!parsed.success) {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { mode, prefer, query, streaming } = parsed.data;
  const requestedMode = prefer?.mode ?? mode;
  const wantsStreaming =
    prefer?.streaming ??
    streaming ??
    request.headers.get("accept")?.includes("text/event-stream");
  let response: NlwebResponse;

  if (
    prefer?.response_format &&
    prefer.response_format !== NLWEB_RESPONSE_FORMAT
  ) {
    response = failure(
      "UNSUPPORTED_FORMAT",
      `Supported response format: ${NLWEB_RESPONSE_FORMAT}`
    );
  } else if (requestedMode && requestedMode !== "list") {
    response = failure("UNSUPPORTED_MODE", "Supported mode: list");
  } else {
    const results = retrieveNlwebResults(query.text);
    response =
      results.length > 0
        ? {
            _meta: {
              ...nlwebMeta("answer"),
              response_format: NLWEB_RESPONSE_FORMAT,
            },
            results,
          }
        : failure("NO_RESULTS", "No matching Notra content found.");
  }

  if (wantsStreaming === true) {
    return streamResponse(response);
  }

  return Response.json(response, {
    headers: { "nlweb-version": NLWEB_VERSION },
  });
}
