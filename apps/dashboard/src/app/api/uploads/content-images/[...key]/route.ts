import { ORPCError } from "@orpc/server";
import { NextResponse } from "next/server";

import { readAuthorizedContentImage } from "@/lib/upload/server";

interface ContentImageRouteContext {
  params: Promise<{ key: string[] }>;
}

function errorResponse(error: unknown) {
  if (error instanceof ORPCError) {
    return NextResponse.json(
      { message: error.message },
      { status: error.status }
    );
  }
  console.error("Content image read failed", error);
  return NextResponse.json(
    { message: "Could not load image" },
    { status: 500 }
  );
}

export async function GET(request: Request, context: ContentImageRouteContext) {
  const { key: segments } = await context.params;
  try {
    const image = await readAuthorizedContentImage({
      headers: request.headers,
      key: segments.join("/"),
    });
    return new Response(Buffer.from(image.bytes), {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Type": image.mimeType,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
