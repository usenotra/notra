"use client";

import type { RealtimeSchema } from "@notra/ai/realtime";
import { ORPCError } from "@orpc/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRealtime } from "@upstash/realtime/client";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { COMMENT_REACTIONS } from "@/constants/comments";
import { dashboardOrpc } from "@/lib/orpc/query";
import type { CommentTarget, DiscussionComment } from "@/types/comments";
import { commentChannel } from "@/utils/comment-channel";
import { commentSubmitId } from "@/utils/comment-submit-id";

export function useDiscussion(target: CommentTarget) {
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
    retry: (failureCount, error) =>
      !(error instanceof ORPCError && error.code === "NOT_FOUND") &&
      failureCount < 1,
    refetchInterval: (current) =>
      lock.current || current.state.status === "error" ? false : 10000,
    refetchOnWindowFocus: (current) =>
      !lock.current && current.state.status !== "error",
    refetchOnReconnect: (current) =>
      !lock.current && current.state.status !== "error",
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
  const retry = useRef<{
    id: string;
    body: string;
    parentId: string | null;
  } | null>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const items = useMemo(() => query.data?.items ?? [], [query.data?.items]);
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

  function update(
    optimistic: (comments: DiscussionComment[]) => DiscussionComment[],
    persist: () => Promise<unknown>
  ) {
    if (lock.current) {
      return Promise.resolve(false);
    }
    lock.current = true;
    setBusy(true);
    let previous = client.getQueryData(options.queryKey);
    return client
      .cancelQueries({ queryKey: options.queryKey })
      .then(() => {
        previous = client.getQueryData(options.queryKey);
        client.setQueryData(options.queryKey, (data) =>
          data ? { ...data, items: optimistic(data.items) } : data
        );
        return persist();
      })
      .then(() => {
        client.setQueryData(options.queryKey, (data) =>
          data
            ? {
                ...data,
                items: data.items.map((item) => ({
                  ...item,
                  pending: false,
                })),
              }
            : data
        );
        return true;
      })
      .catch((error: unknown) => {
        client.setQueryData(options.queryKey, previous);
        toast.error(
          error instanceof Error ? error.message : "Could not save comment"
        );
        return false;
      })
      .finally(() => {
        void client.invalidateQueries({ queryKey: options.queryKey });
        lock.current = false;
        setBusy(false);
      });
  }

  function submit() {
    const body = draft.trim();
    if (!body || !user || lock.current) {
      return;
    }
    const parent = reply;
    const parentId = parent?.id ?? null;
    const id = commentSubmitId(retry.current, body, parentId);
    retry.current = { id, body, parentId };
    scrollToComment.current = id;
    setDraft("");
    setReply(null);
    void update(
      (comments) =>
        comments.some((item) => item.id === id)
          ? comments
          : [
              ...comments,
              {
                id,
                parentId,
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
          parentId,
          body,
        })
    ).then((saved) => {
      if (saved) {
        retry.current = null;
        return;
      }
      scrollToComment.current = null;
      setDraft((current) => (current ? `${body}\n\n${current}` : body));
      setReply(parent);
    });
  }

  function editComment(commentId: string, body: string) {
    return update(
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
  }

  function deleteComment(commentId: string) {
    return update(
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
    ).then(() => undefined);
  }

  function reactToComment(commentId: string, emoji: string, active: boolean) {
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
                      !(reaction.userId === user.id && reaction.emoji === emoji)
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
  }

  return {
    query,
    items,
    user,
    busy,
    draft,
    setDraft,
    reply,
    setReply,
    section,
    textarea,
    submit,
    editComment,
    deleteComment,
    reactToComment,
  };
}
