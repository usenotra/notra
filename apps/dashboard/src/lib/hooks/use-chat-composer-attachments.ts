"use client";

import type { ChatAttachment } from "@notra/ai/types/chat";
import {
  MAX_CHAT_ATTACHMENTS,
  MAX_CHAT_FILE_SIZE,
  MIME_DISPLAY_LABELS,
} from "@notra/schemas/constants/dashboard/upload";
import {
  type ChangeEvent,
  type DragEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import { dragEventHasFiles } from "@/lib/upload/chat";
import {
  deleteChatUpload as deleteChatUploadFile,
  uploadFile,
} from "@/lib/upload/client";
import {
  getAllowedChatMimeTypes,
  isAllowedChatMimeType,
} from "@/lib/upload/mime";
import type {
  PendingChatUpload,
  UseChatComposerAttachmentsResult,
} from "@/types/hooks/chat-composer-attachments";

const GENERIC_PASTED_IMAGE_NAME_RE = /^image\.(jpe?g|png|gif|webp)$/i;

function renamePastedFiles(files: File[]): File[] {
  const pasteTimestamp = Date.now();
  return files.map((file, index) => {
    const hasMeaningfulName =
      file.name && !GENERIC_PASTED_IMAGE_NAME_RE.test(file.name);
    if (hasMeaningfulName) {
      return file;
    }
    const extFromType = file.type.split("/")[1]?.split("+")[0];
    const extFromName = file.name?.includes(".")
      ? file.name.split(".").pop()
      : undefined;
    const ext = extFromName ?? extFromType ?? "png";
    const suffix = index === 0 ? "" : `-${index}`;
    return new File([file], `pasted-${pasteTimestamp}${suffix}.${ext}`, {
      type: file.type,
      lastModified: file.lastModified,
    });
  });
}

export function useChatComposerAttachments(): UseChatComposerAttachmentsResult {
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [pendingUploads, setPendingUploads] = useState<PendingChatUpload[]>([]);
  const [previewAttachment, setPreviewAttachment] =
    useState<ChatAttachment | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const attachmentsRef = useRef(attachments);
  const pendingUploadsRef = useRef(pendingUploads);
  const submittedKeysRef = useRef(new Set<string>());
  const isMountedRef = useRef(true);
  const dragCounterRef = useRef(0);

  useEffect(() => {
    attachmentsRef.current = attachments;
    pendingUploadsRef.current = pendingUploads;
  }, [attachments, pendingUploads]);

  const allowedChatMimeTypes = useMemo(() => getAllowedChatMimeTypes(), []);
  const acceptedFileTypesLabel = useMemo(() => {
    const seen = new Set<string>();
    const labels: string[] = [];
    for (const mime of allowedChatMimeTypes) {
      const label = MIME_DISPLAY_LABELS[mime];
      if (label && !seen.has(label)) {
        seen.add(label);
        labels.push(label);
      }
    }
    return labels.join(", ");
  }, [allowedChatMimeTypes]);

  const cleanupChatUpload = useCallback(async (key: string) => {
    try {
      await deleteChatUploadFile({ key });
    } catch {
      // noop
    }
  }, []);

  const updatePendingUploads = useCallback((next: PendingChatUpload[]) => {
    pendingUploadsRef.current = next;
    if (isMountedRef.current) {
      setPendingUploads(next);
    }
  }, []);

  const removeAttachment = useCallback(
    (key: string) => {
      const attachmentToRemove = attachmentsRef.current.find(
        (attachment) => attachment.key === key
      );
      if (!attachmentToRemove) {
        return;
      }
      const nextAttachments = attachmentsRef.current.filter(
        (attachment) => attachment.key !== key
      );
      attachmentsRef.current = nextAttachments;
      setAttachments(nextAttachments);
      if (previewAttachment?.key === key) {
        setPreviewAttachment(null);
      }
      cleanupChatUpload(attachmentToRemove.key).catch(() => undefined);
    },
    [cleanupChatUpload, previewAttachment?.key]
  );

  const handleFilesSelected = useCallback(
    async (selected: FileList | File[]) => {
      const files = Array.from(selected);
      if (files.length === 0) {
        return false;
      }

      const remainingSlots =
        MAX_CHAT_ATTACHMENTS -
        attachmentsRef.current.length -
        pendingUploadsRef.current.length;
      if (remainingSlots <= 0) {
        toast.error(
          `You can attach at most ${MAX_CHAT_ATTACHMENTS} files per message.`
        );
        return false;
      }

      const accepted: File[] = [];
      for (const file of files.slice(0, remainingSlots)) {
        if (!isAllowedChatMimeType(file.type)) {
          toast.error(`Unsupported file type: ${file.name}`);
          continue;
        }
        if (file.size > MAX_CHAT_FILE_SIZE) {
          toast.error(
            `${file.name} exceeds the ${MAX_CHAT_FILE_SIZE / 1024 / 1024}MB limit.`
          );
          continue;
        }
        accepted.push(file);
      }

      if (accepted.length === 0) {
        return false;
      }

      const placeholders = accepted.map((file) => ({
        id: crypto.randomUUID(),
        filename: file.name,
      }));
      updatePendingUploads([...pendingUploadsRef.current, ...placeholders]);

      const results = await Promise.all(
        accepted.map(async (file, index) => {
          const placeholder = placeholders[index];
          if (!placeholder) {
            return false;
          }
          try {
            const result = await uploadFile({ file, type: "chat" });
            const uploadedAttachment = {
              url: result.url,
              key: result.key,
              filename: file.name,
              mediaType: file.type,
              size: file.size,
            };

            if (!isMountedRef.current) {
              await cleanupChatUpload(result.key);
              updatePendingUploads(
                pendingUploadsRef.current.filter(
                  (pending) => pending.id !== placeholder.id
                )
              );
              return false;
            }

            const nextAttachments = [
              ...attachmentsRef.current,
              uploadedAttachment,
            ];
            attachmentsRef.current = nextAttachments;
            setAttachments(nextAttachments);
            updatePendingUploads(
              pendingUploadsRef.current.filter(
                (pending) => pending.id !== placeholder.id
              )
            );
            return true;
          } catch (err) {
            const message =
              err instanceof Error ? err.message : "Upload failed";
            toast.error(`Failed to upload ${file.name}: ${message}`);
            updatePendingUploads(
              pendingUploadsRef.current.filter(
                (pending) => pending.id !== placeholder.id
              )
            );
            return false;
          }
        })
      );
      return results.every(Boolean);
    },
    [cleanupChatUpload, updatePendingUploads]
  );

  const onFileInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (files && files.length > 0) {
        handleFilesSelected(files).catch(() => undefined);
      }
      event.target.value = "";
    },
    [handleFilesSelected]
  );

  const consumeAttachments = useCallback((): ChatAttachment[] => {
    const current = attachmentsRef.current;
    for (const attachment of current) {
      submittedKeysRef.current.add(attachment.key);
    }
    attachmentsRef.current = [];
    setAttachments([]);
    setPreviewAttachment(null);
    return current;
  }, []);

  const cleanupUnsubmittedAttachments = useCallback(() => {
    for (const attachment of attachmentsRef.current) {
      if (submittedKeysRef.current.has(attachment.key)) {
        continue;
      }
      cleanupChatUpload(attachment.key).catch(() => undefined);
    }
  }, [cleanupChatUpload]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      cleanupUnsubmittedAttachments();
    };
  }, [cleanupUnsubmittedAttachments]);

  const onDragEnter = useCallback((event: DragEvent<HTMLElement>) => {
    if (!dragEventHasFiles(event.nativeEvent)) {
      return;
    }
    dragCounterRef.current += 1;
    setIsDraggingFile(true);
  }, []);

  const onDragLeave = useCallback((event: DragEvent<HTMLElement>) => {
    if (!dragEventHasFiles(event.nativeEvent)) {
      return;
    }
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
    if (dragCounterRef.current === 0) {
      setIsDraggingFile(false);
    }
  }, []);

  const onDragOver = useCallback((event: DragEvent<HTMLElement>) => {
    if (!dragEventHasFiles(event.nativeEvent)) {
      return;
    }
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "copy";
    }
  }, []);

  const onDrop = useCallback(
    (event: DragEvent<HTMLElement>) => {
      const files = event.dataTransfer?.files;
      const hasFiles =
        (files && files.length > 0) || dragEventHasFiles(event.nativeEvent);
      if (!hasFiles) {
        return;
      }
      event.preventDefault();
      dragCounterRef.current = 0;
      setIsDraggingFile(false);
      if (files && files.length > 0) {
        handleFilesSelected(files).catch(() => undefined);
      }
    },
    [handleFilesSelected]
  );

  const handlePasteFiles = useCallback(
    (files: File[]) => {
      if (files.length === 0) {
        return false;
      }
      handleFilesSelected(renamePastedFiles(files)).catch(() => undefined);
      return true;
    },
    [handleFilesSelected]
  );

  return {
    acceptedFileTypesLabel,
    allowedChatMimeTypes,
    attachments,
    attachmentTooltipText: "Attach images, PDFs, or text",
    consumeAttachments,
    dragHandlers: {
      onDragEnter,
      onDragLeave,
      onDragOver,
      onDrop,
    },
    fileInputRef,
    handleFilesSelected,
    handlePasteFiles,
    isDraggingFile,
    isUploading: pendingUploads.length > 0,
    onFileInputChange,
    pendingUploads,
    previewAttachment,
    removeAttachment,
    setPreviewAttachment,
  };
}
