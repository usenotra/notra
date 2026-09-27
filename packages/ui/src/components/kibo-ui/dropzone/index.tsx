"use client";

import { Upload01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ReactNode } from "react";
import { createContext, useContext, useMemo } from "react";
import type { DropEvent, DropzoneOptions, FileRejection } from "react-dropzone";
import { useDropzone } from "react-dropzone";
import { useUiLabels } from "@notra/ui/components/shared/ui-labels-provider";
import { buttonVariants } from "@notra/ui/components/ui/button";
import { DEFAULT_DROPZONE_LABELS } from "@notra/ui/constants/kibo-ui-labels";
import type { DropzoneLabels } from "@notra/ui/types/kibo-ui";
import { cn } from "@notra/ui/lib/utils";

type DropzoneContextType = {
  src?: File[];
  accept?: DropzoneOptions["accept"];
  maxSize?: DropzoneOptions["maxSize"];
  minSize?: DropzoneOptions["minSize"];
  maxFiles?: DropzoneOptions["maxFiles"];
};

const renderBytes = (bytes: number) => {
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)}${units[unitIndex]}`;
};

const DropzoneContext = createContext<DropzoneContextType | undefined>(
  undefined,
);

export type DropzoneProps = Omit<DropzoneOptions, "onDrop"> & {
  src?: File[];
  className?: string;
  onDrop?: (
    acceptedFiles: File[],
    fileRejections: FileRejection[],
    event: DropEvent,
  ) => void;
  children?: ReactNode;
};

export const Dropzone = ({
  accept,
  maxFiles = 1,
  maxSize,
  minSize,
  onDrop,
  onError,
  disabled,
  src,
  className,
  children,
  ...props
}: DropzoneProps) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept,
    maxFiles,
    maxSize,
    minSize,
    onError,
    disabled,
    onDrop: (acceptedFiles, fileRejections, event) => {
      if (fileRejections.length > 0) {
        const message = fileRejections.at(0)?.errors.at(0)?.message;
        onError?.(new Error(message));
      }

      onDrop?.(acceptedFiles, fileRejections, event);
    },
    ...props,
  });

  const contextValue = useMemo(
    () => ({ src, accept, maxSize, minSize, maxFiles }),
    [src, accept, maxSize, minSize, maxFiles],
  );

  return (
    <DropzoneContext.Provider value={contextValue}>
      <div
        className={cn(
          buttonVariants({ variant: "outline" }),
          "relative h-auto w-full cursor-pointer flex-col overflow-hidden p-8",
          isDragActive && "outline-none ring-1 ring-ring",
          disabled && "pointer-events-none opacity-50",
          className,
        )}
        {...getRootProps()}
      >
        <input {...getInputProps()} disabled={disabled} />
        {children}
      </div>
    </DropzoneContext.Provider>
  );
};

const useDropzoneContext = () => {
  const context = useContext(DropzoneContext);

  if (!context) {
    throw new Error("useDropzoneContext must be used within a Dropzone");
  }

  return context;
};

export type DropzoneContentProps = {
  children?: ReactNode;
  className?: string;
  labels?: Partial<DropzoneLabels>;
};

const maxLabelItems = 3;

export const DropzoneContent = ({
  children,
  className,
  labels,
}: DropzoneContentProps) => {
  const { src } = useDropzoneContext();
  const { locale } = useUiLabels();
  const resolvedLabels = { ...DEFAULT_DROPZONE_LABELS, ...labels };
  const listFormatter = new Intl.ListFormat(locale ?? "en");

  if (!src || src.length === 0) {
    return null;
  }

  if (children) {
    return children;
  }

  return (
    <div className={cn("flex flex-col items-center justify-center", className)}>
      <div className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <HugeiconsIcon icon={Upload01Icon} size={16} />
      </div>
      <p className="my-2 w-full truncate font-medium text-sm">
        {src.length > maxLabelItems
          ? resolvedLabels.selectedFilesWithMore(
              listFormatter.format(
                src.slice(0, maxLabelItems).map((file) => file.name),
              ),
              src.length - maxLabelItems,
            )
          : listFormatter.format(src.map((file) => file.name))}
      </p>
      <p className="w-full text-wrap text-muted-foreground text-xs">
        {resolvedLabels.replaceHint}
      </p>
    </div>
  );
};

export type DropzoneEmptyStateProps = {
  children?: ReactNode;
  className?: string;
  labels?: Partial<DropzoneLabels>;
};

export const DropzoneEmptyState = ({
  children,
  className,
  labels,
}: DropzoneEmptyStateProps) => {
  const { src, accept, maxSize, minSize, maxFiles } = useDropzoneContext();
  const { locale } = useUiLabels();
  const resolvedLabels = { ...DEFAULT_DROPZONE_LABELS, ...labels };

  if (src && src.length > 0) {
    return null;
  }

  if (children) {
    return children;
  }

  const caption = resolvedLabels.caption({
    accept: accept
      ? new Intl.ListFormat(locale ?? "en").format(Object.keys(accept))
      : undefined,
    minSize: minSize ? renderBytes(minSize) : undefined,
    maxSize: maxSize ? renderBytes(maxSize) : undefined,
  });

  return (
    <div className={cn("flex flex-col items-center justify-center", className)}>
      <div className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <HugeiconsIcon icon={Upload01Icon} size={16} />
      </div>
      <p className="my-2 w-full truncate text-wrap font-medium text-sm">
        {resolvedLabels.uploadTitle(maxFiles ?? 0)}
      </p>
      <p className="w-full truncate text-wrap text-muted-foreground text-xs">
        {resolvedLabels.uploadHint}
      </p>
      {caption && (
        <p className="text-wrap text-muted-foreground text-xs">{caption}</p>
      )}
    </div>
  );
};
