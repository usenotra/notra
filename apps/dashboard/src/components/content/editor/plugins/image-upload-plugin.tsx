"use client";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { mergeRegister } from "@lexical/utils";
import {
  $createRangeSelectionFromDom,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_LOW,
  DROP_COMMAND,
  type LexicalCommand,
  type LexicalEditor,
  type LexicalNode,
  PASTE_COMMAND,
} from "lexical";
import { useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import { CONTENT_IMAGE_MIME_EXTENSIONS } from "@/constants/content-image";
import { CONTENT_MEDIA } from "@/constants/content-media";
import { CONTENT_VIDEO_MIME_EXTENSIONS } from "@/constants/content-video";
import { uploadContentMedia } from "@/lib/upload/client";
import type {
  ContentDropPoint,
  ContentMediaKind,
  UploadTranslator,
} from "@/types/content/media";
import { contentDropCaret } from "@/utils/content-drop-caret";
import {
  contentImageMaxBytes,
  guessContentImageMime,
} from "@/utils/content-image-size";
import { placeContentBlock } from "@/utils/content-place-block";

import { $createContentImageNode } from "../nodes/content-image-node";
import { $createContentVideoNode } from "../nodes/content-video-node";
import {
  OPEN_CONTENT_IMAGE_UPLOAD_COMMAND,
  OPEN_CONTENT_VIDEO_UPLOAD_COMMAND,
} from "./content-media-commands";

const CONTENT_MEDIA_KINDS = [
  "image",
  "video",
] as const satisfies readonly ContentMediaKind[];

const EDITOR_MEDIA: Record<
  ContentMediaKind,
  {
    accept: string;
    command: LexicalCommand<void>;
    createNode: (file: File, url: string) => LexicalNode;
    matches: (file: File) => boolean;
  }
> = {
  image: {
    accept: `${Object.keys(CONTENT_IMAGE_MIME_EXTENSIONS).join(",")},image/heic,.heic`,
    command: OPEN_CONTENT_IMAGE_UPLOAD_COMMAND,
    createNode: (file, url) =>
      $createContentImageNode({
        altText: altFromFileName(file.name),
        src: url,
      }),
    matches: (file) => !isVideoFile(file) && isImageFile(file),
  },
  video: {
    accept: Object.keys(CONTENT_VIDEO_MIME_EXTENSIONS).join(","),
    command: OPEN_CONTENT_VIDEO_UPLOAD_COMMAND,
    createNode: (_file, url) => $createContentVideoNode({ src: url }),
    matches: isVideoFile,
  },
};

function altFromFileName(name: string) {
  const base = name
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/[[\]]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return base || "Image";
}

function isVideoFile(file: File) {
  return (
    file.type in CONTENT_VIDEO_MIME_EXTENSIONS ||
    /\.(mp4|webm)$/i.test(file.name)
  );
}

// Include Apple photos in the editor's existing image upload path even when browsers omit their MIME type.
function isImageFile(file: File) {
  return (
    /\.heic$/i.test(file.name) ||
    file.type === "" ||
    file.type in CONTENT_IMAGE_MIME_EXTENSIONS ||
    file.type.startsWith("image/")
  );
}

function mediaFiles(list: FileList | null | undefined) {
  if (!list) {
    return [];
  }
  return [...list].filter((file) =>
    CONTENT_MEDIA_KINDS.some((kind) => EDITOR_MEDIA[kind].matches(file))
  );
}

function kindForFile(file: File) {
  return CONTENT_MEDIA_KINDS.find((kind) => EDITOR_MEDIA[kind].matches(file));
}

const BYTES_PER_MEGABYTE = 1024 * 1024;

function queuedMedia(files: File[], t: UploadTranslator) {
  const jobs: { file: File; kind: ContentMediaKind }[] = [];
  for (const file of files) {
    const kind = kindForFile(file);
    if (!kind) {
      continue;
    }
    if (kind === "image") {
      const mime = guessContentImageMime(file);
      if (file.size > contentImageMaxBytes(mime)) {
        const maxMb = contentImageMaxBytes(mime) / BYTES_PER_MEGABYTE;
        toast.error(
          mime === "image/gif" || mime === "image/avif"
            ? t("animatedTooLarge", { maxMb })
            : t("imageTooLarge", { maxMb })
        );
        continue;
      }
    } else if (file.size > CONTENT_MEDIA[kind].maxBytes) {
      toast.error(
        t("videoTooLarge", {
          maxMb: CONTENT_MEDIA[kind].maxBytes / BYTES_PER_MEGABYTE,
        })
      );
      continue;
    }
    jobs.push({ file, kind });
  }
  return jobs;
}

async function insertUploadedFiles(
  editor: LexicalEditor,
  jobs: { file: File; kind: ContentMediaKind }[],
  afterKey: string | null,
  failedMessage: string,
  dropPoint?: ContentDropPoint
) {
  const uploaded = await Promise.all(
    jobs.map(async ({ file, kind }) => {
      try {
        const { url } = await uploadContentMedia(file, kind, failedMessage);
        return { file, kind, url };
      } catch (error) {
        toast.error(error instanceof Error ? error.message : failedMessage);
        return null;
      }
    })
  );
  let key = afterKey;
  let nextDropPoint = dropPoint;
  for (const item of uploaded) {
    if (!item) {
      continue;
    }
    key = placeContentBlock(
      editor,
      key,
      () => EDITOR_MEDIA[item.kind].createNode(item.file, item.url),
      nextDropPoint
    );
    nextDropPoint = undefined;
  }
  return key;
}

// Keep media insertion bound to the editor's own selection and drop target when an agent is also open.
export function ImageUploadPlugin() {
  const t = useTranslations("content.editor.upload");
  const tCommon = useTranslations("common");
  const [editor] = useLexicalComposerContext();
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const anchorKeyRef = useRef<string | null>(null);
  const uploadingRef = useRef(false);
  const pendingRef = useRef<
    {
      files: File[];
      afterKey: string | null;
      dropPoint?: ContentDropPoint;
    }[]
  >([]);
  const [editable, setEditable] = useState(() => editor.isEditable());

  useEffect(() => editor.registerEditableListener(setEditable), [editor]);

  const rememberSelection = useCallback(() => {
    editor.getEditorState().read(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        anchorKeyRef.current = selection.anchor.getNode().getKey();
      }
    });
  }, [editor]);

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          anchorKeyRef.current = selection.anchor.getNode().getKey();
        }
      });
    });
  }, [editor]);

  // Resolve the blog insertion block from the drop point instead of a stale selection.
  const rememberDropPosition = useCallback(
    (event: DragEvent) => {
      const root = editor.getRootElement();
      const caret = contentDropCaret(document, event.clientX, event.clientY);
      if (!root || !caret || !root.contains(caret.node)) {
        return null;
      }
      let point: ContentDropPoint | null = null;
      editor.getEditorState().read(() => {
        const selection = $createRangeSelectionFromDom(
          {
            anchorNode: caret.node,
            anchorOffset: caret.offset,
            focusNode: caret.node,
            focusOffset: caret.offset,
          } as Selection,
          editor
        );
        if (selection) {
          point = {
            key: selection.anchor.key,
            offset: selection.anchor.offset,
            type: selection.anchor.type,
          };
        }
      });
      return point;
    },
    [editor]
  );

  const insertUploaded = (
    files: File[],
    afterKey?: string | null,
    dropPoint?: ContentDropPoint
  ) => {
    const insertionKey =
      afterKey === undefined ? anchorKeyRef.current : afterKey;
    if (files.length === 0 || !editor.isEditable()) {
      return;
    }
    if (uploadingRef.current) {
      pendingRef.current.push({ files, afterKey: insertionKey, dropPoint });
      return;
    }
    const jobs = queuedMedia(files, t);
    const startNext = () => {
      const next = pendingRef.current.shift();
      if (next) {
        insertUploaded(next.files, next.afterKey, next.dropPoint);
      }
    };
    if (jobs.length === 0) {
      startNext();
      return;
    }
    uploadingRef.current = true;
    const toastId = toast.loading(t("uploading"));
    void insertUploadedFiles(
      editor,
      jobs,
      insertionKey,
      tCommon("labels.uploadFailed"),
      dropPoint
    )
      .then((lastKey) => {
        if (lastKey === insertionKey) {
          return;
        }
        for (const batch of pendingRef.current) {
          if (batch.afterKey === insertionKey) {
            batch.afterKey = lastKey;
          }
        }
      })
      .finally(() => {
        toast.dismiss(toastId);
        uploadingRef.current = false;
        startNext();
      });
  };
  const insertFromDom = useEffectEvent(insertUploaded);

  useEffect(() => {
    const onDragOver = (event: DragEvent) => {
      if (
        [...(event.dataTransfer?.items ?? [])].some(
          (item) => item.kind === "file"
        )
      ) {
        event.preventDefault();
      }
    };
    return editor.registerRootListener((root, previous) => {
      previous?.removeEventListener("dragover", onDragOver);
      root?.addEventListener("dragover", onDragOver);
    });
  }, [editor]);

  useEffect(() => {
    return mergeRegister(
      ...CONTENT_MEDIA_KINDS.map((kind, index) =>
        editor.registerCommand(
          EDITOR_MEDIA[kind].command,
          () => {
            if (!editor.isEditable()) {
              return false;
            }
            rememberSelection();
            inputRefs.current[index]?.click();
            return true;
          },
          COMMAND_PRIORITY_LOW
        )
      )
    );
  }, [editor, rememberSelection]);

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        PASTE_COMMAND,
        (event) => {
          if (!(event instanceof ClipboardEvent)) {
            return false;
          }
          const files = mediaFiles(event.clipboardData?.files);
          if (files.length === 0) {
            return false;
          }
          event.preventDefault();
          if (!editor.isEditable()) {
            return true;
          }
          rememberSelection();
          insertFromDom(files);
          return true;
        },
        COMMAND_PRIORITY_HIGH
      ),
      editor.registerCommand(
        DROP_COMMAND,
        (event) => {
          if (!(event instanceof DragEvent)) {
            return false;
          }
          const files = mediaFiles(event.dataTransfer?.files);
          if (files.length === 0) {
            return false;
          }
          event.preventDefault();
          if (!editor.isEditable()) {
            return true;
          }
          const dropPoint = rememberDropPosition(event);
          insertFromDom(
            files,
            dropPoint ? null : anchorKeyRef.current,
            dropPoint ?? undefined
          );
          return true;
        },
        COMMAND_PRIORITY_HIGH
      )
    );
  }, [editor, rememberDropPosition, rememberSelection]);

  if (!editable) {
    return null;
  }

  return (
    <>
      {CONTENT_MEDIA_KINDS.map((kind, index) => (
        <input
          accept={EDITOR_MEDIA[kind].accept}
          aria-hidden="true"
          className="hidden"
          key={kind}
          multiple
          onChange={(event) => {
            const files = mediaFiles(event.currentTarget.files);
            event.currentTarget.value = "";
            insertUploaded(files);
          }}
          ref={(node) => {
            inputRefs.current[index] = node;
          }}
          tabIndex={-1}
          type="file"
        />
      ))}
    </>
  );
}
