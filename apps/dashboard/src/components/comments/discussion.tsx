"use client";

import { ArrowUp02Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { RealtimeSchema } from "@notra/ai/realtime";
import { Textarea } from "@notra/ui/components/ui/textarea";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRealtime } from "@upstash/realtime/client";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/button";
import { CommentItem } from "@/components/comments/comment-item";
import { Composer } from "@/components/composer/composer-shell";
import { COMMENT_REACTIONS } from "@/constants/comments";
import { dashboardOrpc } from "@/lib/orpc/query";
import type { CommentTarget, DiscussionComment } from "@/types/comments";
import { commentChannel } from "@/utils/comment-channel";

export function Discussion(target: CommentTarget) {
  const client = useQueryClient();
  const { organizationId, targetId, targetType } = target;
  const options = useMemo(
    () =>
      dashboardOrpc.comments.list.queryOptions({
        input: { organizationId, targetId, targetType },
      }),
    [organizationId, targetId, targetType]
  );
  const lock = useRef(false);
  const query = useQuery({
    ...options,
    staleTime: 15000,
    refetchInterval: () => (lock.current ? false : 10000),
    refetchOnWindowFocus: () => !lock.current,
    refetchOnReconnect: () => !lock.current,
  });
  const { status } = useRealtime<RealtimeSchema, "discussion.changed">({
    channels: [commentChannel(target)],
    events: ["discussion.changed"],
    enabled: query.data?.realtimeEnabled === true,
    onData: () => {
      if (!lock.current) {
        void client.invalidateQueries({ queryKey: options.queryKey });
      }
    },
  });
  useEffect(() => {
    if (status === "connected" && !lock.current) {
      void client.invalidateQueries({ queryKey: options.queryKey });
    }
  }, [status, client, options.queryKey]);
  const [draft, setDraft] = useState("");
  const [reply, setReply] = useState<DiscussionComment | null>(null);
  const [busy, setBusy] = useState(false);
  const section = useRef<HTMLElement>(null);
  const scrollToComment = useRef<string | null>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const items = query.data?.items ?? [];
  const user = query.data?.currentUser;

  useEffect(() => {
    const id = scrollToComment.current;
    if (!id) {
      return;
    }
    const comment = section.current?.querySelector(`[data-comment-id="${id}"]`);
    if (!comment) {
      return;
    }
    comment.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "nearest",
    });
    scrollToComment.current = null;
  }, [items]);

  async function update(
    optimistic: (comments: DiscussionComment[]) => DiscussionComment[],
    persist: () => Promise<unknown>
  ) {
    if (lock.current) {
      return false;
    }
    lock.current = true;
    setBusy(true);
    await client.cancelQueries({ queryKey: options.queryKey });
    const previous = client.getQueryData(options.queryKey);
    client.setQueryData(options.queryKey, (data) =>
      data ? { ...data, items: optimistic(data.items) } : data
    );
    try {
      await persist();
      client.setQueryData(options.queryKey, (data) =>
        data
          ? {
              ...data,
              items: data.items.map((item) => ({ ...item, pending: false })),
            }
          : data
      );
      return true;
    } catch (error) {
      client.setQueryData(options.queryKey, previous);
      toast.error(
        error instanceof Error ? error.message : "Could not save comment"
      );
      return false;
    } finally {
      await client.invalidateQueries({ queryKey: options.queryKey });
      lock.current = false;
      setBusy(false);
    }
  }

  async function submit() {
    const body = draft.trim();
    if (!body || !user || lock.current) {
      return;
    }
    const id = crypto.randomUUID();
    const parent = reply;
    scrollToComment.current = id;
    setDraft("");
    setReply(null);
    const saved = await update(
      (comments) => [
        ...comments,
        {
          id,
          parentId: parent?.id ?? null,
          depth: parent ? parent.depth + 1 : 0,
          userId: user.id,
          name: user.name,
          image: user.image,
          body,
          createdAt: new Date().toISOString(),
          editedAt: null,
          deletedAt: null,
          reactions: [],
          pending: true,
        },
      ],
      () =>
        dashboardOrpc.comments.create.call({
          ...target,
          id,
          parentId: parent?.id ?? null,
          body,
        })
    );
    if (!saved) {
      scrollToComment.current = null;
      setDraft((current) => (current ? `${body}\n\n${current}` : body));
      setReply(parent);
    }
  }

  return (
    <section
      ref={section}
      className="w-full border-t pt-6"
      aria-label="Comments"
    >
      <div className="mb-4 flex items-center gap-2">
        <h3 className="text-sm font-medium">Comments</h3>
        {items.length ? (
          <span className="text-muted-foreground text-xs tabular-nums">
            {items.filter((item) => !item.deletedAt).length}
          </span>
        ) : null}
      </div>
      {query.isPending ? (
        <div role="status" className="space-y-3 py-4">
          <span className="sr-only">Loading comments</span>
          <div className="bg-muted h-4 w-32 rounded motion-safe:animate-pulse" />
          <div className="bg-muted h-4 w-3/4 rounded motion-safe:animate-pulse" />
        </div>
      ) : query.isError ? (
        <div className="py-4 text-sm">
          Could not load comments.{" "}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              void query.refetch();
            }}
          >
            Retry
          </Button>
        </div>
      ) : !items.length ? null : (
        <ol className="space-y-1 pb-3">
          {items
            .filter((comment) => !comment.parentId)
            .map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                comments={items}
                currentUserId={user?.id ?? ""}
                busy={busy}
                onReply={(item) => {
                  setReply(item);
                  textarea.current?.focus();
                }}
                onEdit={async (commentId, body) => {
                  const saved = await update(
                    (comments) =>
                      comments.map((item) =>
                        item.id === commentId
                          ? {
                              ...item,
                              body,
                              editedAt: new Date().toISOString(),
                            }
                          : item
                      ),
                    () =>
                      dashboardOrpc.comments.edit.call({
                        ...target,
                        commentId,
                        body,
                      })
                  );
                  return saved;
                }}
                onDelete={async (commentId) => {
                  await update(
                    (comments) =>
                      comments.map((item) =>
                        item.id === commentId
                          ? {
                              ...item,
                              body: "",
                              deletedAt: new Date().toISOString(),
                            }
                          : item
                      ),
                    () =>
                      dashboardOrpc.comments.delete.call({
                        ...target,
                        commentId,
                      })
                  );
                }}
                onReact={(commentId, emoji, active) => {
                  const parsedEmoji = COMMENT_REACTIONS.find(
                    (reaction) => reaction.emoji === emoji
                  )?.emoji;
                  if (!parsedEmoji || !user) {
                    return;
                  }
                  void update(
                    (comments) =>
                      comments.map((item) =>
                        item.id === commentId
                          ? {
                              ...item,
                              reactions: [
                                ...item.reactions.filter(
                                  (reaction) =>
                                    !(
                                      reaction.userId === user.id &&
                                      reaction.emoji === emoji
                                    )
                                ),
                                ...(active ? [{ userId: user.id, emoji }] : []),
                              ],
                            }
                          : item
                      ),
                    () =>
                      dashboardOrpc.comments.react.call({
                        ...target,
                        commentId,
                        emoji: parsedEmoji,
                        active,
                      })
                  );
                }}
              />
            ))}
        </ol>
      )}
      <form
        className="bg-background sticky bottom-0 flex items-start gap-3 pt-2 pb-1"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <Composer.Frame
          className="min-w-0 flex-1"
          nudge={
            reply ? (
              <Composer.Nudge
                title={`Replying to ${reply.name}`}
                action={
                  <Button
                    aria-label="Cancel reply"
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => {
                      setReply(null);
                      textarea.current?.focus();
                    }}
                  >
                    <HugeiconsIcon icon={Cancel01Icon} className="size-3" />
                  </Button>
                }
              />
            ) : null
          }
        >
          <div className="flex items-end gap-2 p-1.5">
            <Textarea
              ref={textarea}
              aria-label={reply ? `Reply to ${reply.name}` : "Write a comment"}
              placeholder={reply ? "Write a reply…" : "Write a comment…"}
              className="max-h-32 min-h-7 flex-1 resize-none border-0 bg-transparent px-2 py-1 text-sm leading-5 shadow-none focus-visible:ring-0 dark:bg-transparent"
              rows={1}
              maxLength={10000}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (
                  (event.metaKey || event.ctrlKey) &&
                  event.key === "Enter" &&
                  !event.nativeEvent.isComposing
                ) {
                  event.preventDefault();
                  void submit();
                }
              }}
            />
            <Composer.Send
              label="Send comment"
              tooltip="Send comment"
              busy={busy}
              disabled={!draft.trim() || !user || busy}
              onClick={() => {
                void submit();
              }}
            >
              <HugeiconsIcon icon={ArrowUp02Icon} className="size-4" />
            </Composer.Send>
          </div>
        </Composer.Frame>
      </form>
    </section>
  );
}
