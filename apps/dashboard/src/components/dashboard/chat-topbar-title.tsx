"use client";

import {
  ArrowDown01Icon,
  Delete02Icon,
  PencilEdit02Icon,
  PinIcon,
  PinOffIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { CHAT_TITLE_MAX_LENGTH } from "@notra/ai/constants/chat";
import { formatChatIdFallback, normalizeChatTitle } from "@notra/ai/utils/chat";
import {
  ResponsiveAlertDialog,
  ResponsiveAlertDialogAction,
  ResponsiveAlertDialogCancel,
  ResponsiveAlertDialogContent,
  ResponsiveAlertDialogDescription,
  ResponsiveAlertDialogFooter,
  ResponsiveAlertDialogHeader,
  ResponsiveAlertDialogTitle,
} from "@notra/ui/components/shared/responsive-alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@notra/ui/components/ui/dropdown-menu";
import { Input } from "@notra/ui/components/ui/input";
import { TRANSITION } from "@notra/ui/lib/motion";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useOrganizationsContext } from "@/components/providers/organization-provider";
import {
  useChatSessionMutations,
  useChatSessions,
} from "@/lib/hooks/use-chat-sessions";
import { cn } from "@/lib/utils";

interface ChatTopbarTitleProps {
  chatId: string;
}

export function ChatTopbarTitle({ chatId }: ChatTopbarTitleProps) {
  const { activeOrganization } = useOrganizationsContext();
  const router = useRouter();
  const slug = activeOrganization?.slug;

  const { sessions } = useChatSessions();
  const { renameChat, togglePinned, deleteChat } = useChatSessionMutations();

  const session = sessions.find((item) => item.chatId === chatId);
  const title = session?.title ?? null;

  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const [isPinning, setIsPinning] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  function startEditing() {
    if (!session) {
      return;
    }
    setDraftTitle(session.title);
    setIsEditing(true);
  }

  async function submitRename() {
    if (!session) {
      return;
    }

    const nextTitle = normalizeChatTitle(draftTitle);

    if (!nextTitle) {
      toast.error("Title can't be empty");
      setDraftTitle(session.title);
      setIsEditing(false);
      return;
    }

    if (nextTitle === session.title) {
      setIsEditing(false);
      return;
    }

    setIsRenaming(true);
    setIsEditing(false);
    const ok = await renameChat(chatId, nextTitle);
    if (!ok) {
      setDraftTitle(session.title);
      setIsEditing(true);
    }
    setIsRenaming(false);
  }

  async function handleTogglePin() {
    if (!session || isPinning) {
      return;
    }
    setIsPinning(true);
    await togglePinned(session);
    setIsPinning(false);
  }

  async function handleDelete() {
    if (!session) {
      return;
    }
    setIsDeleting(true);
    const ok = await deleteChat(chatId);
    setIsDeleting(false);
    if (ok) {
      setDeleteOpen(false);
      router.replace(`/${slug}/chat`);
    }
  }

  const displayTitle = title ?? formatChatIdFallback(chatId);
  const hasTitle = Boolean(title);

  return (
    <>
      <div className="flex min-w-0 items-center gap-1">
        <AnimatePresence initial={false} mode="wait">
          {isEditing ? (
            <motion.div
              animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
              className="min-w-0"
              exit={{ opacity: 0, filter: "blur(4px)", scale: 0.98 }}
              initial={{ opacity: 0, filter: "blur(4px)", scale: 0.98 }}
              key="editing"
              transition={TRANSITION.fade}
            >
              <Input
                className="h-7 w-56"
                disabled={isRenaming}
                maxLength={CHAT_TITLE_MAX_LENGTH}
                onBlur={submitRename}
                onChange={(event) => setDraftTitle(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    submitRename();
                    return;
                  }
                  if (event.key === "Escape") {
                    event.preventDefault();
                    setIsEditing(false);
                  }
                }}
                ref={inputRef}
                value={draftTitle}
              />
            </motion.div>
          ) : (
            <motion.div
              animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
              className="min-w-0"
              exit={{ opacity: 0, filter: "blur(4px)", scale: 0.98 }}
              initial={{ opacity: 0, filter: "blur(4px)", scale: 0.98 }}
              key="display"
              transition={TRANSITION.fade}
            >
              <DropdownMenu onOpenChange={setIsMenuOpen} open={isMenuOpen}>
                <DropdownMenuTrigger
                  className={cn(
                    "text-foreground hover:bg-accent focus-visible:bg-accent flex max-w-[20ch] min-w-0 cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 text-sm font-medium no-underline outline-hidden transition-colors hover:no-underline sm:max-w-[40ch]",
                    (isRenaming || isPinning) && "opacity-70"
                  )}
                  onDoubleClick={(event) => {
                    event.preventDefault();
                    startEditing();
                  }}
                >
                  <span className="relative block min-w-0 truncate">
                    <AnimatePresence initial={false} mode="popLayout">
                      <motion.span
                        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                        className="block truncate"
                        exit={{ opacity: 0, y: -4, filter: "blur(4px)" }}
                        initial={{
                          opacity: 0,
                          y: hasTitle ? 4 : 0,
                          filter: hasTitle ? "blur(4px)" : "blur(0px)",
                        }}
                        key={hasTitle ? "title" : "fallback"}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                      >
                        {displayTitle}
                      </motion.span>
                    </AnimatePresence>
                  </span>
                  <HugeiconsIcon
                    className={cn(
                      "text-muted-foreground duration-normal size-3.5 shrink-0 transition-transform",
                      isMenuOpen && "rotate-180"
                    )}
                    icon={ArrowDown01Icon}
                  />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="w-44"
                  sideOffset={6}
                >
                  <DropdownMenuItem
                    disabled={!session || isPinning}
                    onClick={handleTogglePin}
                  >
                    <HugeiconsIcon
                      icon={session?.pinnedAt ? PinOffIcon : PinIcon}
                    />
                    {session?.pinnedAt ? "Unpin" : "Pin"}
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled={!session} onClick={startEditing}>
                    <HugeiconsIcon icon={PencilEdit02Icon} />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={!session}
                    onClick={() => setDeleteOpen(true)}
                    variant="destructive"
                  >
                    <HugeiconsIcon icon={Delete02Icon} />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ResponsiveAlertDialog
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setDeleteOpen(false);
          }
        }}
        open={deleteOpen}
      >
        <ResponsiveAlertDialogContent>
          <ResponsiveAlertDialogHeader>
            <ResponsiveAlertDialogTitle>
              Delete chat?
            </ResponsiveAlertDialogTitle>
            <ResponsiveAlertDialogDescription>
              This will permanently delete &quot;{session?.title ?? "this chat"}
              &quot;. This action cannot be undone.
            </ResponsiveAlertDialogDescription>
          </ResponsiveAlertDialogHeader>
          <ResponsiveAlertDialogFooter>
            <ResponsiveAlertDialogCancel disabled={isDeleting}>
              Cancel
            </ResponsiveAlertDialogCancel>
            <ResponsiveAlertDialogAction
              disabled={isDeleting}
              onClick={(event) => {
                event.preventDefault();
                handleDelete();
              }}
              variant="destructive"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </ResponsiveAlertDialogAction>
          </ResponsiveAlertDialogFooter>
        </ResponsiveAlertDialogContent>
      </ResponsiveAlertDialog>
    </>
  );
}
