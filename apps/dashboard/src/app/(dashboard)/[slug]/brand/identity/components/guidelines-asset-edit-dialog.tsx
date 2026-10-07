"use client";

import { Image01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ALLOWED_MIME_TYPES,
  MAX_BRAND_ASSET_FILE_SIZE,
} from "@notra/schemas/constants/dashboard/upload";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@notra/ui/components/shared/responsive-dialog";
import { Label } from "@notra/ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@notra/ui/components/ui/select";
import type { ChangeEvent, DragEvent, RefObject } from "react";
import { useEffect, useReducer, useRef } from "react";
import { toast } from "sonner";
import { useLocale, useTranslations } from "use-intl";

import { Button } from "@/components/button";
import {
  ASSET_KIND_OPTIONS,
  ASSET_VARIANT_OPTIONS,
} from "@/constants/brand-guideline-ui";
import {
  useCreateGuidelineAsset,
  useUpdateGuidelineAsset,
} from "@/lib/hooks/use-brand-guidelines";
import { uploadFile } from "@/lib/upload/client";
import { cn } from "@/lib/utils";
import type { GuidelinesAssetEditDialogProps } from "@/types/brand-identity";
import type {
  BrandGuidelineAssetKind,
  BrandGuidelineAssetVariant,
} from "@/types/hooks/brand-guidelines";
import {
  getBrandGuidelineAssetFormat,
  getBrandGuidelineAssetTypeLabel,
  getBrandGuidelineImageDimensions,
} from "@/utils/brand-guideline-assets";
import { formatBytes } from "@/utils/format";

interface AssetDialogState {
  dragging: boolean;
  file: File | null;
  fileError: string | null;
  kind: BrandGuidelineAssetKind;
  previewUrl: string | null;
  saving: boolean;
  variant: BrandGuidelineAssetVariant;
}

interface AssetUpload {
  aspectRatio: number | null;
  format: string | null;
  height: number | null;
  key: string;
  mimeType: string;
  url: string;
  width: number | null;
}

function toAssetUploadFields(upload: AssetUpload | undefined) {
  return {
    aspectRatio: upload?.aspectRatio,
    format: upload?.format,
    height: upload?.height,
    mimeType: upload?.mimeType,
    storageKey: upload?.key,
    url: upload?.url,
    width: upload?.width,
  };
}

function updateAssetDialogState(
  state: AssetDialogState,
  next: Partial<AssetDialogState>
) {
  return { ...state, ...next };
}

interface AssetFileFieldProps {
  dragging: boolean;
  file: File | null;
  fileError: string | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onDraggingChange: (dragging: boolean) => void;
  onDrop: (event: DragEvent<HTMLButtonElement>) => void;
  onInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  previewUrl: string | null;
}

function AssetFileField({
  dragging,
  file,
  fileError,
  fileInputRef,
  onDraggingChange,
  onDrop,
  onInputChange,
  previewUrl,
}: AssetFileFieldProps) {
  const t = useTranslations("brand.guidelines.assetDialog");
  const tCommon2 = useTranslations("common");
  const locale = useLocale();
  return (
    <div className="space-y-2">
      <Label>{t("fileLabel")}</Label>
      <button
        className={cn(
          "flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-6 text-center transition-colors",
          dragging
            ? "border-primary bg-primary/5"
            : "border-border hover:bg-muted/40"
        )}
        onClick={() => fileInputRef.current?.click()}
        onDragLeave={() => onDraggingChange(false)}
        onDragOver={(event) => {
          event.preventDefault();
          onDraggingChange(true);
        }}
        onDrop={onDrop}
        type="button"
      >
        {previewUrl ? (
          <span
            aria-hidden="true"
            className="h-14 w-full max-w-48 bg-contain bg-center bg-no-repeat"
            style={{ backgroundImage: `url("${previewUrl}")` }}
          />
        ) : (
          <HugeiconsIcon
            className="text-muted-foreground size-5"
            icon={Image01Icon}
          />
        )}
        <span className="text-sm font-medium">
          {file
            ? t("selectedFile", {
                type:
                  getBrandGuidelineAssetTypeLabel(file) ??
                  tCommon2("labels.image"),
              })
            : t("dropzone")}
        </span>
        <span className="text-muted-foreground text-xs">
          {file
            ? `${getBrandGuidelineAssetTypeLabel(file) ?? tCommon2("labels.image")} · ${formatBytes(file.size, locale)}`
            : t("acceptedTypesWithLimit")}
        </span>
      </button>
      <input
        accept={ALLOWED_MIME_TYPES.join(",")}
        aria-label={t("uploadFile")}
        className="sr-only"
        onChange={onInputChange}
        ref={fileInputRef}
        type="file"
      />
      {fileError ? (
        <p className="text-destructive text-xs">{fileError}</p>
      ) : null}
    </div>
  );
}

export function GuidelinesAssetEditDialog({
  asset,
  presetKind,
  presetVariant,
  organizationId,
  voiceId,
  open,
  onOpenChange,
}: GuidelinesAssetEditDialogProps) {
  const t = useTranslations("brand.guidelines");
  const tBrandShared = useTranslations("brand.shared");
  const tCommon2 = useTranslations("common");
  const tCommon = useTranslations("common.actions");
  const update = useUpdateGuidelineAsset(organizationId, voiceId);
  const create = useCreateGuidelineAsset(organizationId, voiceId);
  const isCreate = asset === null;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useReducer(updateAssetDialogState, {
    dragging: false,
    file: null,
    fileError: null,
    kind: asset?.kind ?? presetKind ?? "logo",
    previewUrl: null,
    saving: false,
    variant: asset?.variant ?? presetVariant ?? "light",
  });
  const { dragging, file, fileError, kind, previewUrl, saving, variant } =
    state;

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFile = (nextFile: File | null) => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    if (!nextFile) {
      setState({ file: null, fileError: null, previewUrl: null });
      return;
    }

    if (!ALLOWED_MIME_TYPES.some((mimeType) => mimeType === nextFile.type)) {
      setState({
        file: null,
        fileError: t("assetDialog.invalidType"),
        previewUrl: null,
      });
      return;
    }

    if (nextFile.size > MAX_BRAND_ASSET_FILE_SIZE) {
      setState({
        file: null,
        fileError: t("assetDialog.tooLarge"),
        previewUrl: null,
      });
      return;
    }

    setState({
      file: nextFile,
      fileError: null,
      previewUrl: URL.createObjectURL(nextFile),
    });
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    handleFile(event.target.files?.[0] ?? null);
    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setState({ dragging: false });
    handleFile(event.dataTransfer.files[0] ?? null);
  };

  const handleSave = async () => {
    if (isCreate && !file) {
      setState({ fileError: t("assetDialog.fileRequired") });
      return;
    }

    setState({ saving: true });

    const successMessage = isCreate
      ? t("assetDialog.added")
      : t("assetDialog.updated");

    try {
      let upload: AssetUpload | undefined;

      if (file) {
        const [uploaded, dimensions] = await Promise.all([
          uploadFile({ file, type: "brand_asset" }),
          getBrandGuidelineImageDimensions(file),
        ]);

        upload = {
          ...dimensions,
          format: getBrandGuidelineAssetFormat(file),
          key: uploaded.key,
          mimeType: file.type,
          url: uploaded.url,
        };
      }

      if (asset) {
        await update.mutateAsync({
          ...toAssetUploadFields(upload),
          assetId: asset.id,
          kind,
          variant,
        });
      } else if (upload) {
        await create.mutateAsync({
          aspectRatio: upload.aspectRatio,
          format: upload.format,
          height: upload.height,
          kind,
          mimeType: upload.mimeType,
          storageKey: upload.key,
          url: upload.url,
          variant,
          width: upload.width,
        });
      }
      toast.success(successMessage);
      setState({ saving: false });
      onOpenChange(false);
    } catch (error) {
      setState({ saving: false });
      toast.error(
        error instanceof Error ? error.message : t("assetDialog.saveFailed")
      );
    }
  };

  return (
    <ResponsiveDialog onOpenChange={onOpenChange} open={open}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {isCreate ? tBrandShared("addAsset") : t("assetDialog.editTitle")}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {isCreate
              ? t("assetDialog.addDescription")
              : t("assetDialog.editDescription")}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="space-y-4 py-2">
          <AssetFileField
            dragging={dragging}
            file={file}
            fileError={fileError}
            fileInputRef={fileInputRef}
            onDraggingChange={(nextDragging) =>
              setState({ dragging: nextDragging })
            }
            onDrop={handleDrop}
            onInputChange={handleInputChange}
            previewUrl={previewUrl}
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{tCommon2("labels.kind")}</Label>
              <Select
                onValueChange={(next) => {
                  const option = ASSET_KIND_OPTIONS.find(
                    (o) => o.value === next
                  );
                  if (option) {
                    setState({ kind: option.value });
                  }
                }}
                value={kind}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(value) => {
                      const option = ASSET_KIND_OPTIONS.find(
                        (o) => o.value === value
                      );
                      return option
                        ? option.value === "logo"
                          ? tCommon2("labels.logo")
                          : t(`assetKinds.${option.value}`)
                        : "";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ASSET_KIND_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.value === "logo"
                        ? tCommon2("labels.logo")
                        : t(`assetKinds.${option.value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("assetDialog.variant")}</Label>
              <Select
                items={Object.fromEntries(
                  ASSET_VARIANT_OPTIONS.map((option) => [
                    option.value,
                    tCommon2(`labels.${option.value}`),
                  ])
                )}
                onValueChange={(next) => {
                  const option = ASSET_VARIANT_OPTIONS.find(
                    (o) => o.value === next
                  );
                  if (option) {
                    setState({ variant: option.value });
                  }
                }}
                value={variant}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSET_VARIANT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {tCommon2(`labels.${option.value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <ResponsiveDialogFooter>
          <Button
            disabled={saving}
            onClick={() => onOpenChange(false)}
            variant="outline"
          >
            {tCommon("cancel")}
          </Button>
          <Button disabled={saving} onClick={handleSave}>
            {saving ? tCommon("saving") : tCommon("save")}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
