"use client";

import {
  Delete02Icon,
  Edit02Icon,
  File01Icon,
  LinkSquare02Icon,
  Add01Icon,
  Loading03Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  BRAND_GUIDELINE_PDF_MIME_TYPE,
  MAX_BRAND_GUIDELINE_PDF_FILE_SIZE,
} from "@notra/schemas/constants/dashboard/upload";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useFormatter, useTranslations } from "use-intl";

import { Button, buttonVariants } from "@/components/button";
import {
  useAttachGuidelineSourcePdf,
  useDiscardGuidelineSourcePdf,
  useRemoveGuidelineSourcePdf,
} from "@/lib/hooks/use-brand-guidelines";
import { uploadFile } from "@/lib/upload/client";
import { cn } from "@/lib/utils";
import type { GuidelinesPanelProps } from "@/types/brand-identity";
import type { BrandGuideline } from "@/types/hooks/brand-guidelines";

export function GuidelinesSourcePdfSection({
  guideline,
  organizationId,
  voiceId,
}: GuidelinesPanelProps & { guideline: BrandGuideline | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const format = useFormatter();
  const tPdf = useTranslations("brand.guidelines.pdf");
  const maxMb = MAX_BRAND_GUIDELINE_PDF_FILE_SIZE / 1024 / 1024;
  const [isUploading, setIsUploading] = useState(false);
  const attach = useAttachGuidelineSourcePdf(organizationId, voiceId);
  const remove = useRemoveGuidelineSourcePdf(organizationId, voiceId);
  const discard = useDiscardGuidelineSourcePdf(organizationId, voiceId);
  const isBusy = isUploading || attach.isPending || remove.isPending;
  const filename = guideline?.sourcePdfFilename ?? null;

  const isPdfFile = (file: File) =>
    file.type === BRAND_GUIDELINE_PDF_MIME_TYPE ||
    (file.type === "" && file.name.toLowerCase().endsWith(".pdf"));

  const onFile = async (file: File | undefined) => {
    if (!file) {
      return;
    }
    if (!isPdfFile(file)) {
      toast.error(tPdf("notPdf"));
      return;
    }
    if (file.size > MAX_BRAND_GUIDELINE_PDF_FILE_SIZE) {
      toast.error(tPdf("tooLarge", { maxMb }));
      return;
    }
    if (file.name.trim().length === 0 || file.name.length > 200) {
      toast.error(tPdf("badFilename"));
      return;
    }

    setIsUploading(true);
    let uploadedKey: string | null = null;
    try {
      const uploaded = await uploadFile({
        file,
        type: "brand_guideline_pdf",
      });
      uploadedKey = uploaded.key;
      await attach.mutateAsync({
        filename: file.name.trim(),
        key: uploaded.key,
      });
      uploadedKey = null;
      toast.success(tPdf("saved"));
    } catch (error) {
      // Best-effort discard of the orphaned upload on attach failure.
      const orphanKey =
        uploadedKey ??
        (typeof error === "object" &&
        error !== null &&
        "uploadKey" in error &&
        typeof error.uploadKey === "string"
          ? error.uploadKey
          : null);
      if (orphanKey) {
        discard.mutateAsync({ key: orphanKey }).catch(() => undefined);
      }
      toast.error(error instanceof Error ? error.message : tPdf("saveFailed"));
    } finally {
      setIsUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <HugeiconsIcon
          className="text-muted-foreground size-4"
          icon={File01Icon}
        />
        <h2 className="text-sm font-semibold">{tPdf("title")}</h2>
        <span className="text-muted-foreground text-xs tabular-nums">
          {filename ? 1 : 0}
        </span>
      </div>

      <input
        accept={BRAND_GUIDELINE_PDF_MIME_TYPE}
        aria-label={tPdf("uploadLabel")}
        className="sr-only"
        onChange={(event) => {
          onFile(event.target.files?.[0]).catch(() => undefined);
        }}
        ref={inputRef}
        type="file"
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filename ? (
          <div className="flex flex-col overflow-hidden rounded-xl border">
            <div className="bg-muted/40 flex h-40 items-center justify-center p-4">
              <HugeiconsIcon
                className={cn(
                  "text-muted-foreground size-6",
                  isBusy && "animate-spin"
                )}
                icon={isBusy ? Loading03Icon : File01Icon}
              />
            </div>
            <div className="flex items-center justify-between gap-2 border-t p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{filename}</p>
                <p className="text-muted-foreground truncate text-xs">
                  {guideline?.sourcePdfUploadedAt
                    ? format.relativeTime(
                        new Date(guideline.sourcePdfUploadedAt)
                      )
                    : tPdf("untitled")}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                {guideline?.sourcePdfUrl ? (
                  <a
                    aria-label={tPdf("open", { filename: filename ?? "" })}
                    className={cn(
                      buttonVariants({ size: "icon-sm", variant: "ghost" })
                    )}
                    href={guideline.sourcePdfUrl}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <HugeiconsIcon
                      className="size-3.5"
                      icon={LinkSquare02Icon}
                    />
                  </a>
                ) : null}
                <Button
                  aria-label={tPdf("replace")}
                  disabled={isBusy}
                  onClick={() => inputRef.current?.click()}
                  size="icon-sm"
                  variant="ghost"
                >
                  <HugeiconsIcon className="size-3.5" icon={Edit02Icon} />
                </Button>
                <Button
                  aria-label={tPdf("remove", { filename: filename ?? "" })}
                  disabled={isBusy}
                  onClick={() => {
                    remove.mutate(undefined, {
                      onError: (error) => {
                        toast.error(
                          error instanceof Error
                            ? error.message
                            : tPdf("removeFailed")
                        );
                      },
                      onSuccess: () => {
                        toast.success(tPdf("removed"));
                      },
                    });
                  }}
                  size="icon-sm"
                  variant="ghost"
                >
                  <HugeiconsIcon className="size-3.5" icon={Delete02Icon} />
                </Button>
              </div>
            </div>
            {guideline?.sourcePdfPreview ? (
              <p className="text-muted-foreground line-clamp-3 border-t px-3 py-2 text-xs">
                {guideline.sourcePdfPreview}
              </p>
            ) : null}
          </div>
        ) : (
          <button
            className="hover:border-border hover:bg-muted/40 flex flex-col overflow-hidden rounded-xl border border-dashed text-left transition-colors disabled:pointer-events-none disabled:opacity-50"
            disabled={isBusy}
            onClick={() => inputRef.current?.click()}
            type="button"
          >
            <div className="bg-muted/20 flex h-40 items-center justify-center">
              <HugeiconsIcon
                className={cn(
                  "text-muted-foreground/40 size-6",
                  isBusy && "animate-spin"
                )}
                icon={isBusy ? Loading03Icon : Add01Icon}
              />
            </div>
            <div className="w-full border-t border-dashed p-3">
              <p className="text-muted-foreground truncate text-sm font-medium">
                {tPdf("title")}
              </p>
              <p className="text-muted-foreground/70 truncate text-xs">
                {tPdf("sizeHint", { maxMb })}
              </p>
            </div>
          </button>
        )}
      </div>
    </section>
  );
}
