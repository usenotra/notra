import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Cancel01Icon,
  DragDropVerticalIcon,
  Image01Icon,
  User02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@notra/ui/components/ui/avatar";
import { cn } from "@notra/ui/lib/utils";
import type { KeyboardEvent, RefObject } from "react";

import {
  AUTHOR_HANDLE_LIMIT,
  AUTHOR_NAME_LIMIT,
  THREAD_POST_LIMIT,
  type ThreadPost,
} from "@/types/threads";

import { InlineEditable } from "./inline-editable";

const DEFAULT_AUTHOR_NAME = "Your name";
const DEFAULT_AUTHOR_HANDLE = "yourhandle";

interface SortableThreadPostProps {
  post: ThreadPost;
  index: number;
  postsCount: number;
  authorAvatar: string | null;
  authorInitials: string;
  authorName: string;
  authorHandle: string;
  previewName: string;
  dragId: string | null;
  dragOverId: string | null;
  hasMultiplePosts: boolean;
  avatarInputRef: RefObject<HTMLInputElement | null>;
  registerTextarea: (id: string) => (el: HTMLTextAreaElement | null) => void;
  onAuthorNameChange: (next: string) => void;
  onAuthorHandleChange: (next: string) => void;
  onPostChange: (id: string, content: string) => void;
  onPostKeyDown: (
    id: string,
    event: KeyboardEvent<HTMLTextAreaElement>
  ) => void;
  onRemovePost: (id: string) => void;
}

export function SortableThreadPost({
  post,
  index,
  postsCount,
  authorAvatar,
  authorInitials,
  authorName,
  authorHandle,
  previewName,
  dragId,
  dragOverId,
  hasMultiplePosts,
  avatarInputRef,
  registerTextarea,
  onAuthorNameChange,
  onAuthorHandleChange,
  onPostChange,
  onPostKeyDown,
  onRemovePost,
}: SortableThreadPostProps) {
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: post.id });
  const isDragging = dragId === post.id;
  const isDropTarget =
    dragOverId === post.id && dragId !== null && dragId !== post.id;
  const length = post.content.length;
  const overLimit = length > THREAD_POST_LIMIT;
  const nearLimit = length > THREAD_POST_LIMIT - 20;
  let counterColor = "text-muted-foreground/70";
  if (overLimit) {
    counterColor = "text-destructive";
  } else if (nearLimit) {
    counterColor = "text-warning";
  }
  const isSoloEmpty = postsCount === 1 && length === 0;
  const showDelete = !isSoloEmpty;
  const showConnector = index < postsCount - 1;
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      className={cn(
        "group/post focus-within:bg-muted/50 hover:bg-muted/40 relative flex gap-3 rounded-xl p-3 transition-colors",
        isDragging && "opacity-50",
        isDropTarget && "bg-primary/5 ring-primary/40 ring-1"
      )}
      data-thread-post-id={post.id}
      key={post.id}
      ref={setNodeRef}
      style={style}
    >
      {showConnector && !isDragging && (
        <div
          aria-hidden
          className="bg-border pointer-events-none absolute top-13 bottom-[-1.375rem] left-8 w-px -translate-x-1/2"
          data-thread-connector
        />
      )}

      <button
        aria-label="Change avatar"
        className="group/avatar bg-background focus-visible:ring-primary relative z-10 size-10 shrink-0 cursor-pointer rounded-full outline-none focus-visible:ring-2"
        onClick={() => avatarInputRef.current?.click()}
        type="button"
      >
        <Avatar className="size-10" size="lg">
          {authorAvatar && <AvatarImage alt={previewName} src={authorAvatar} />}
          <AvatarFallback className="bg-muted text-muted-foreground text-xs">
            {authorInitials || (
              <HugeiconsIcon className="size-4" icon={User02Icon} />
            )}
          </AvatarFallback>
        </Avatar>
        <span className="bg-foreground/55 text-background pointer-events-none absolute inset-0 flex items-center justify-center rounded-full opacity-0 transition-opacity group-hover/avatar:opacity-100 group-focus-visible/avatar:opacity-100">
          <HugeiconsIcon className="size-4" icon={Image01Icon} />
        </span>
      </button>

      <div className="flex min-w-0 flex-1 flex-col gap-1 pt-1">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-1.5">
          <InlineEditable
            ariaLabel="Edit display name"
            className="text-foreground max-w-[14rem] font-sans text-sm leading-tight font-semibold"
            maxLength={AUTHOR_NAME_LIMIT}
            onChange={onAuthorNameChange}
            placeholder={DEFAULT_AUTHOR_NAME}
            value={authorName}
          />
          <InlineEditable
            ariaLabel="Edit handle"
            className="text-muted-foreground max-w-[10rem] font-sans text-sm leading-tight"
            maxLength={AUTHOR_HANDLE_LIMIT}
            onChange={onAuthorHandleChange}
            placeholder={DEFAULT_AUTHOR_HANDLE}
            prefix="@"
            value={authorHandle}
          />
        </div>

        <textarea
          className="text-foreground placeholder:text-muted-foreground/80 field-sizing-content w-full resize-none rounded-sm bg-transparent font-sans text-[0.9375rem] leading-relaxed text-pretty whitespace-pre-wrap outline-none"
          onChange={(event) => onPostChange(post.id, event.target.value)}
          onKeyDown={(event) => onPostKeyDown(post.id, event)}
          placeholder={
            index === 0 ? "Write the first post…" : "Continue the thread…"
          }
          ref={registerTextarea(post.id)}
          rows={1}
          value={post.content}
        />

        <span
          className={cn(
            "self-end font-mono text-xs tabular-nums",
            counterColor
          )}
        >
          {length}/{THREAD_POST_LIMIT}
        </span>
      </div>

      <div className="absolute top-3 -right-18 flex items-center gap-1 opacity-0 transition-opacity group-hover/post:opacity-100 focus-within:opacity-100">
        {hasMultiplePosts && (
          <button
            aria-label={`Drag post ${index + 1}`}
            className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-7 cursor-grab touch-none items-center justify-center rounded-md transition-colors active:cursor-grabbing"
            ref={setActivatorNodeRef}
            type="button"
            {...attributes}
            {...listeners}
          >
            <HugeiconsIcon className="size-4" icon={DragDropVerticalIcon} />
          </button>
        )}
        {showDelete && (
          <button
            aria-label={`Delete post ${index + 1}`}
            className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive flex size-7 items-center justify-center rounded-md transition-colors"
            onClick={() => onRemovePost(post.id)}
            type="button"
          >
            <HugeiconsIcon className="size-3.5" icon={Cancel01Icon} />
          </button>
        )}
      </div>
    </li>
  );
}
