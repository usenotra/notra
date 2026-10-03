import { ORPCError } from "@orpc/server";
import { NextResponse } from "next/server";

import { CONTENT_MEDIA } from "@/constants/content-media";
import { uploadContentImage, uploadContentVideo } from "@/lib/upload/server";
import type { ContentMediaKind } from "@/types/content/media";
import {
  contentImageMaxBytes,
  contentImageTooLargeMessage,
  guessContentImageMime,
} from "@/utils/content-image-size";

export const maxDuration = 30;

const CONTENT_UPLOADS = {
  image: uploadContentImage,
  video: uploadContentVideo,
} as const satisfies Record<
  ContentMediaKind,
  typeof uploadContentImage | typeof uploadContentVideo
>;

function errorResponse(error: unknown, failed: string) {
  if (error instanceof ORPCError) {
    return NextResponse.json(
      { message: error.message },
      { status: error.status }
    );
  }
  console.error("Content upload failed", error);
  return NextResponse.json({ message: failed }, { status: 500 });
}

function uploadKind(form: FormData): ContentMediaKind {
  return form.get("kind") === "video" ? "video" : "image";
}

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { message: CONTENT_MEDIA.image.choose },
      { status: 400 }
    );
  }

  const kind = uploadKind(form);
  const media = CONTENT_MEDIA[kind];
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ message: media.choose }, { status: 400 });
  }
  const imageMime = kind === "image" ? guessContentImageMime(file) : "";
  const maxBytes =
    kind === "image" ? contentImageMaxBytes(imageMime) : media.maxBytes;
  if (file.size > maxBytes) {
    return NextResponse.json(
      {
        message:
          kind === "image"
            ? contentImageTooLargeMessage(imageMime)
            : media.tooLarge,
      },
      { status: 400 }
    );
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const uploaded = await CONTENT_UPLOADS[kind]({
      bytes,
      headers: request.headers,
    });
    return NextResponse.json(uploaded);
  } catch (error) {
    return errorResponse(error, media.failed);
  }
}
