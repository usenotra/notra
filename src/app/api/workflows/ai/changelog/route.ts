import { NextResponse } from "next/server";
import { githubChangelogAgent } from "@/lib/agents/changelog";

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    const result = githubChangelogAgent.stream({
      prompt,
    });

    // toUIMessageStream() returns an AsyncIterableStream which can be used as ReadableStream
    // Pass it directly to avoid locking issues
    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Error generating changelog:", error);
    return NextResponse.json(
      { error: "Failed to generate changelog" },
      { status: 500 }
    );
  }
}
