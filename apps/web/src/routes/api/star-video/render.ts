import { createFileRoute } from "@tanstack/react-router";
import { Effect } from "effect";

import { GITHUB_CONNECTION_REQUIRED_MESSAGE } from "@/lib/star-video/github-cookies";
import { readGithubToken } from "@/lib/star-video/github-oauth";
import {
  enforceGlobalRenderLimit,
  enforceStarVideoRateLimit,
} from "@/lib/star-video/ratelimit";
import { renderStarVideo } from "@/lib/star-video/render";
import { starVideoInputSchema } from "@/schemas/star-video";

async function POST(request: Request) {
  if (!readGithubToken()) {
    return Response.json(
      { error: GITHUB_CONNECTION_REQUIRED_MESSAGE },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = starVideoInputSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const filename = `${parsed.data.owner}-${parsed.data.repo}-stars.mp4`;

  return Effect.runPromise(
    Effect.gen(function* () {
      yield* enforceStarVideoRateLimit(request, "render");
      yield* enforceGlobalRenderLimit();

      const video = yield* Effect.tryPromise({
        try: () => renderStarVideo(parsed.data),
        catch: (cause) =>
          cause instanceof Error ? cause : new Error("Failed to render video"),
      });

      return new Response(new Uint8Array(video), {
        headers: {
          "Content-Type": "video/mp4",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }).pipe(
      Effect.match({
        onFailure: (error) => {
          if (
            "_tag" in error &&
            (error._tag === "StarVideoRateLimitExceeded" ||
              error._tag === "RenderBusy")
          ) {
            return Response.json(
              { error: "Too many render requests. Please try again shortly." },
              { status: 429 }
            );
          }
          console.error("Failed to render star video", error);
          return Response.json(
            { error: "Failed to render the video. Please try again." },
            { status: 500 }
          );
        },
        onSuccess: (response) => response,
      })
    )
  );
}

export const Route = createFileRoute("/api/star-video/render")({
  server: {
    handlers: {
      POST: ({ request }) => POST(request),
    },
  },
});
