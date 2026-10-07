import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Add01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@notra/ui/components/ui/button";
import {
  type ChangeEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { createEmptyPost, createSeedThread } from "@/lib/threads/posts";
import type { ThreadPost } from "@/types/threads";

import { SortableThreadPost } from "./sortable-thread-post";

const DEFAULT_AUTHOR_NAME = "Your name";
const DEFAULT_AUTHOR_HANDLE = "yourhandle";
const LEADING_AT_REGEX = /^@/;
const WHITESPACE_REGEX = /\s+/;

function getAddPostShortcut() {
  const isMac =
    typeof navigator !== "undefined" &&
    navigator.platform.toUpperCase().includes("MAC");
  return isMac ? "⌘ + Enter" : "Ctrl + Enter";
}

export default function ThreadBuilder() {
  const [posts, setPosts] = useState<ThreadPost[]>(() => createSeedThread());
  const [authorName, setAuthorName] = useState("");
  const [authorHandle, setAuthorHandle] = useState("");
  const [authorAvatar, setAuthorAvatar] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const textareaRefs = useRef(new Map<string, HTMLTextAreaElement>());
  const focusNextRef = useRef<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    return () => {
      if (authorAvatar?.startsWith("blob:")) {
        URL.revokeObjectURL(authorAvatar);
      }
    };
  }, [authorAvatar]);

  const trimmedName = authorName.trim();
  const addPostShortcut = getAddPostShortcut();
  const previewName = trimmedName || DEFAULT_AUTHOR_NAME;
  const previewHandle =
    authorHandle.trim().replace(LEADING_AT_REGEX, "") || DEFAULT_AUTHOR_HANDLE;
  const avatarInitials = trimmedName
    ? trimmedName
        .split(WHITESPACE_REGEX)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .join("")
    : "";
  const hasMultiplePosts = posts.length > 1;

  const registerTextarea = useCallback(
    (id: string) => (el: HTMLTextAreaElement | null) => {
      if (el) {
        textareaRefs.current.set(id, el);
        if (focusNextRef.current === id) {
          el.focus();
          focusNextRef.current = null;
        }
      } else {
        textareaRefs.current.delete(id);
      }
    },
    []
  );

  function updatePost(id: string, content: string) {
    setPosts((current) =>
      current.map((post) => (post.id === id ? { ...post, content } : post))
    );
  }

  function addPostAfter(id?: string) {
    const fresh = createEmptyPost();
    focusNextRef.current = fresh.id;
    setPosts((current) => {
      if (!id) {
        return [...current, fresh];
      }
      const index = current.findIndex((post) => post.id === id);
      if (index === -1) {
        return [...current, fresh];
      }
      const next = current.slice();
      next.splice(index + 1, 0, fresh);
      return next;
    });
  }

  function removePost(id: string) {
    setPosts((current) => {
      if (current.length <= 1) {
        return current.map((post) =>
          post.id === id ? { ...post, content: "" } : post
        );
      }
      return current.filter((post) => post.id !== id);
    });
  }

  function handleAvatarPick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    if (authorAvatar?.startsWith("blob:")) {
      URL.revokeObjectURL(authorAvatar);
    }
    setAuthorAvatar(URL.createObjectURL(file));
    event.target.value = "";
  }

  function handleHandleChange(next: string) {
    setAuthorHandle(next.replace(LEADING_AT_REGEX, ""));
  }

  function handleDragStart(event: DragStartEvent) {
    setDragId(String(event.active.id));
  }

  function handleDragOver(event: DragOverEvent) {
    setDragOverId(event.over ? String(event.over.id) : null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setDragId(null);
    setDragOverId(null);
    if (!over || active.id === over.id) {
      return;
    }

    setPosts((current) => {
      const oldIndex = current.findIndex((post) => post.id === active.id);
      const newIndex = current.findIndex((post) => post.id === over.id);
      if (oldIndex === -1 || newIndex === -1) {
        return current;
      }
      return arrayMove(current, oldIndex, newIndex);
    });
  }

  function handleDragCancel() {
    setDragId(null);
    setDragOverId(null);
  }

  function handlePostKeyDown(
    id: string,
    event: KeyboardEvent<HTMLTextAreaElement>
  ) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      addPostAfter(id);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl p-3 sm:p-5">
      <input
        accept="image/*"
        className="hidden"
        onChange={handleAvatarPick}
        ref={avatarInputRef}
        type="file"
      />

      <p className="text-muted-foreground mb-5 text-center font-sans text-xs leading-5 font-normal">
        Click the name, handle or avatar to customize the author.
      </p>

      <DndContext
        collisionDetection={closestCenter}
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragStart={handleDragStart}
        sensors={sensors}
      >
        <SortableContext
          items={posts.map((post) => post.id)}
          strategy={verticalListSortingStrategy}
        >
          <ol className="relative flex flex-col gap-2">
            {posts.map((post, index) => (
              <SortableThreadPost
                authorAvatar={authorAvatar}
                authorHandle={authorHandle}
                authorInitials={avatarInitials}
                authorName={authorName}
                avatarInputRef={avatarInputRef}
                dragId={dragId}
                dragOverId={dragOverId}
                hasMultiplePosts={hasMultiplePosts}
                index={index}
                key={post.id}
                onAuthorHandleChange={handleHandleChange}
                onAuthorNameChange={setAuthorName}
                onPostChange={updatePost}
                onPostKeyDown={handlePostKeyDown}
                onRemovePost={removePost}
                post={post}
                postsCount={posts.length}
                previewName={previewName}
                registerTextarea={registerTextarea}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>

      <div className="mt-8 flex flex-col-reverse items-stretch gap-3 sm:flex-col sm:items-center sm:justify-between">
        <Button
          className="sm:w-auto"
          onClick={() => addPostAfter()}
          size="sm"
          type="button"
        >
          <HugeiconsIcon className="size-3.5" icon={Add01Icon} />
          <span>Add post</span>
        </Button>
        <p className="text-muted-foreground/70 hidden font-sans text-xs leading-5 font-normal sm:block">
          <span suppressHydrationWarning>{addPostShortcut}</span> when an input
          is focused adds a post.
        </p>
      </div>
    </div>
  );
}
