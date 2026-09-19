"use client";
import {
  ArrowTurnBackwardIcon,
  MoreHorizontalIcon,
  PencilEdit02Icon,
  Delete02Icon,
  SmilePlusIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@notra/ui/components/ui/dropdown-menu";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@notra/ui/components/ui/popover";
import {
  AnimatePresence,
  LazyMotion,
  domAnimation,
  m,
  useReducedMotion,
} from "motion/react";
import { useState } from "react";

import { Button } from "@/components/button";
import { COMMENT_REACTIONS } from "@/constants/comments";
import type { CommentActionsProps } from "@/types/comments";
export function CommentActions({
  comment,
  currentUserId,
  busy,
  onReply,
  onDelete,
  onReact,
  onStartEdit,
}: CommentActionsProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const disabled = busy || comment.pending;
  const reduceMotion = useReducedMotion();
  const transition = {
    duration: reduceMotion ? 0 : 0.2,
    ease: "easeOut" as const,
  };
  const hasReactions = comment.reactions.length > 0;
  return (
    <div>
      <LazyMotion features={domAnimation} strict>
        <div
          className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none ${hasReactions ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
        >
          <div className="min-h-0">
            <div className="flex flex-wrap items-center gap-1 pt-2">
              <AnimatePresence initial={false}>
                {COMMENT_REACTIONS.map(({ emoji, label }) => {
                  const reactions = comment.reactions.filter(
                    (reaction) => reaction.emoji === emoji
                  );
                  const active = reactions.some(
                    (reaction) => reaction.userId === currentUserId
                  );
                  return reactions.length ? (
                    <m.button
                      key={emoji}
                      layout={!reduceMotion}
                      initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: reduceMotion ? 1 : 0.96 }}
                      transition={transition}
                      aria-label={`${label}, ${reactions.length} reactions`}
                      aria-pressed={active}
                      className={`flex h-6 items-center gap-1 rounded-md border px-1.5 text-xs transition-colors ${active ? "border-foreground/20 bg-muted" : "border-border hover:bg-muted"}`}
                      disabled={disabled}
                      onClick={() => onReact(comment.id, emoji, !active)}
                    >
                      <span aria-hidden="true">{emoji}</span>
                      <span
                        aria-hidden="true"
                        className="relative grid h-4 min-w-[1ch] items-center overflow-hidden tabular-nums"
                      >
                        <m.span
                          key={reactions.length}
                          initial={{ opacity: 0, y: reduceMotion ? 0 : 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="block leading-4"
                        >
                          {reactions.length}
                        </m.span>
                      </span>
                    </m.button>
                  ) : null;
                })}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </LazyMotion>
      <div className="text-muted-foreground absolute top-1 right-0 flex items-center gap-0.5 transition-opacity duration-150 focus-within:opacity-100 has-[[data-popup-open]]:opacity-100 [&_button]:size-7 [&_svg]:size-3.5 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/comment:opacity-100">
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger
            render={
              <Button
                aria-label="Add reaction"
                disabled={disabled}
                size="icon-sm"
                variant="ghost"
              />
            }
          >
            <HugeiconsIcon icon={SmilePlusIcon} className="size-4" />
          </PopoverTrigger>
          <PopoverContent
            className="w-auto flex-row items-center gap-0.5 rounded-full p-1"
            side="top"
            align="end"
            sideOffset={6}
          >
            {COMMENT_REACTIONS.map(({ emoji, label }) => (
              <button
                aria-label={label}
                className="hover:bg-muted focus-visible:outline-ring flex size-7 shrink-0 items-center justify-center rounded-full text-base leading-none focus-visible:outline-2"
                key={emoji}
                onClick={() => {
                  onReact(
                    comment.id,
                    emoji,
                    !comment.reactions.some(
                      (reaction) =>
                        reaction.emoji === emoji &&
                        reaction.userId === currentUserId
                    )
                  );
                  setPickerOpen(false);
                }}
              >
                {emoji}
              </button>
            ))}
          </PopoverContent>
        </Popover>
        {comment.depth < 5 ? (
          <Button
            aria-label="Reply to comment"
            disabled={disabled}
            size="icon-sm"
            variant="ghost"
            onClick={() => onReply(comment)}
          >
            <HugeiconsIcon icon={ArrowTurnBackwardIcon} className="size-4" />
          </Button>
        ) : null}
        {comment.userId === currentUserId ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  aria-label="Comment actions"
                  disabled={disabled}
                  size="icon-sm"
                  variant="ghost"
                />
              }
            >
              <HugeiconsIcon icon={MoreHorizontalIcon} className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onStartEdit}>
                <HugeiconsIcon icon={PencilEdit02Icon} />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => {
                  void onDelete(comment.id);
                }}
              >
                <HugeiconsIcon icon={Delete02Icon} />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </div>
  );
}
