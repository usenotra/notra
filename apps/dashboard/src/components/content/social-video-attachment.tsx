"use client";

import type { SocialVideoAttachment as SocialVideoDraft } from "@notra/schemas/dashboard/content";
import { Loader2Icon, VideoIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";

import type { ContentVideoMimeType } from "@/constants/content-video";
import { SOCIAL_VIDEO } from "@/constants/social-video";
import { uploadFile } from "@/lib/upload/client";
import { cn } from "@/lib/utils";
import { sniffContentVideoMime } from "@/utils/validate-content-video";

interface SocialVideoAttachmentProps {
  value: SocialVideoDraft | null;
  onChange: (video: SocialVideoDraft | null) => void;
  disabled?: boolean;
  onUploadingChange?: (uploading: boolean) => void;
}

async function sniffFile(file: File): Promise<ContentVideoMimeType> {
  const head = new Uint8Array(await file.slice(0, 4096).arrayBuffer());
  return sniffContentVideoMime(head);
}

export function SocialVideoAttachment({
  value,
  onChange,
  disabled,
  onUploadingChange,
}: SocialVideoAttachmentProps) {
  const t = useTranslations("content.postSocial");
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setUploadingState = (next: boolean) => {
    setUploading(next);
    onUploadingChange?.(next);
  };

  const handleFile = async (file: File) => {
    setError(null);
    if (file.size > SOCIAL_VIDEO.maxBytes) {
      setError(t("videoTooLarge", { maxMb: SOCIAL_VIDEO.maxBytesMb }));
      // Leave the rejected file selected and the same pick fires no change
      // event — reset so retrying the same file works.
      if (inputRef.current) {
        inputRef.current.value = "";
      }
      return;
    }
    setUploadingState(true);
    try {
      const mimeType = await sniffFile(file);
      // The presigned upload trusts `file.type` for validation and the
      // stored Content-Type — normalize to the sniffed bytes so a wrong
      // browser MIME can neither bypass the gate nor mistype the object.
      const normalized =
        file.type === mimeType
          ? file
          : new File([file], file.name, { type: mimeType });
      const { url, key } = await uploadFile({
        file: normalized,
        type: "content",
      });
      onChange({ key, url, mimeType, size: file.size });
    } catch (cause) {
      setError(
        cause instanceof Error && cause.message
          ? cause.message
          : t("videoUploadFailed")
      );
    } finally {
      setUploadingState(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  if (value) {
    return (
      <div className="space-y-1.5">
        <div className="relative overflow-hidden rounded-lg border">
          {/* oxlint-disable-next-line jsx-a11y/media-has-caption -- uploads do not include a caption file */}
          <video
            className="max-h-56 w-full bg-black"
            controls
            preload="metadata"
            src={value.url}
          />
          {!disabled && (
            <button
              aria-label={t("removeVideo")}
              className={cn(
                "absolute top-2 right-2 rounded-full bg-black/60 p-1.5",
                "text-white hover:bg-black/80"
              )}
              onClick={() => onChange(null)}
              type="button"
            >
              <XIcon className="size-4" />
            </button>
          )}
        </div>
        {error ? <p className="text-destructive text-sm">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <input
        accept={SOCIAL_VIDEO.accept}
        className="hidden"
        disabled={disabled || uploading}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void handleFile(file);
          }
        }}
        ref={inputRef}
        type="file"
      />
      <button
        className={cn(
          "text-muted-foreground flex items-center gap-1.5 text-sm",
          "hover:text-foreground disabled:opacity-50"
        )}
        disabled={disabled || uploading}
        onClick={() => inputRef.current?.click()}
        type="button"
      >
        {uploading ? (
          <Loader2Icon className="size-4 animate-spin" />
        ) : (
          <VideoIcon className="size-4" />
        )}
        {uploading ? t("uploadingVideo") : t("attachVideo")}
      </button>
      <p className="text-muted-foreground text-xs">
        {t("attachVideoHint", { maxMb: SOCIAL_VIDEO.maxBytesMb })}
      </p>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </div>
  );
}
