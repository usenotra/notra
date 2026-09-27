import { ORPCError } from "@orpc/server";

import { MAX_CONTENT_IMAGE_INPUT_BYTES } from "@/constants/content-image";
import { assertAuthenticated } from "@/lib/auth/organization";
import { compressContentImage, isHeic } from "@/utils/compress-content-image";

export const maxDuration = 30;

// Convert authenticated chat attachments without storing an unreadable Apple image or trusting its extension.
export async function POST(request: Request) {
  try {
    await assertAuthenticated({ headers: request.headers });
    const file = (await request.formData()).get("file");
    if (!(file instanceof File) || file.size > MAX_CONTENT_IMAGE_INPUT_BYTES) {
      return Response.json(
        { message: "Invalid or oversized image" },
        { status: 400 }
      );
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!isHeic(bytes)) {
      return Response.json({ message: "Not a HEIC image" }, { status: 400 });
    }
    const output = await compressContentImage(bytes);
    return new Response(new Uint8Array(output.bytes), {
      headers: { "Content-Type": output.mimeType },
    });
  } catch (error) {
    if (error instanceof ORPCError) {
      return Response.json(
        { message: error.message },
        { status: error.status }
      );
    }
    return Response.json(
      { message: "Could not convert HEIC image" },
      { status: 400 }
    );
  }
}
