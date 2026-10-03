import { ORPCError } from "@orpc/server";

import {
  MAX_CHAT_HEIC_INPUT_BYTES,
  MAX_CHAT_HEIC_MULTIPART_BYTES,
} from "@/constants/content-image";
import { assertAuthenticated } from "@/lib/auth/organization";
import { compressContentImage, isHeic } from "@/utils/compress-content-image";
import { readBoundedRequestBody } from "@/utils/read-bounded-request-body";

// Convert authenticated chat attachments without storing an unreadable Apple image or trusting its extension.
export async function POST(request: Request) {
  try {
    await assertAuthenticated({ headers: request.headers });
    if (
      Number(request.headers.get("content-length")) >
      MAX_CHAT_HEIC_MULTIPART_BYTES
    ) {
      return Response.json(
        { message: "Invalid or oversized image" },
        { status: 413 }
      );
    }
    const body = await readBoundedRequestBody(
      request,
      MAX_CHAT_HEIC_MULTIPART_BYTES
    );
    if (!body) {
      return Response.json(
        { message: "Invalid or oversized image" },
        { status: 413 }
      );
    }
    const multipart = new Request(request.url, {
      method: "POST",
      headers: { "Content-Type": request.headers.get("content-type") ?? "" },
      body: body.buffer,
    });
    const file = (await multipart.formData()).get("file");
    if (!(file instanceof File) || file.size > MAX_CHAT_HEIC_INPUT_BYTES) {
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
