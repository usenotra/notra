"use client";

import {
  Add01Icon,
  Delete02Icon,
  MoreHorizontalIcon,
  PencilEdit02Icon,
  PinIcon,
  PinOffIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { CHAT_TITLE_MAX_LENGTH } from "@notra/ai/constants/chat";
import type { ChatSessionSummary } from "@notra/ai/types/chat";
import { normalizeChatTitle } from "@notra/ai/utils/chat";
import { ConfirmDialog } from "@notra/ui/components/shared/confirm-dialog";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@notra/ui/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@notra/ui/components/ui/dropdown-menu";
import { Input } from "@notra/ui/components/ui/input";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@notra/ui/components/ui/sidebar";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { useOrganizationsContext } from "@/components/providers/organization-provider";
import {
  useChatSessionMutations,
  useChatSessions,
} from "@/lib/hooks/use-chat-sessions";
import { usePathname, useRouter } from "@/lib/navigation";
import { dashboardOrpcClient } from "@/lib/orpc/client";
import { cn } from "@/lib/utils";
import {
  displayChatTitle,
  getChatHistoryGroups,
} from "@/utils/chat-history-groups";

import { SidebarLabel } from "./sidebar-label";
import { SidebarNavLink } from "./sidebar-nav-link";

function chatIdFromPath(path: string): string | undefined {
  const pathSegments = path.split("/").filter(Boolean);
  return pathSegments[1] === "chat" ? pathSegments[2] : undefined;
}

export function ChatHistoryNav() {
  const t = useTranslations("dashboard.chatHistory");
  const tCommon2 = useTranslations("common");
  const tChat = useTranslations("dashboard.chatTitle");
  const tCommon = useTranslations("common.actions");
  const { activeOrganization } = useOrganizationsContext();
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { state: sidebarState, isMobile } = useSidebar();
  const isCollapsed = sidebarState === "collapsed" && !isMobile;
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [renamingChatId, setRenamingChatId] = useState<string | null>(null);
  const [pinningChatId, setPinningChatId] = useState<string | null>(null);
  const [deleteCandidate, setDeleteCandidate] =
    useState<ChatSessionSummary | null>(null);
  const [deletingChatId, setDeletingChatId] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement | null>(null);

  const slug = activeOrganization?.slug;
  const organizationId = activeOrganization?.id;

  function prefetchChatHistory(chatId: string) {
    if (!organizationId) {
      return;
    }
    queryClient.prefetchQuery({
      queryKey: ["chat-history", organizationId, chatId],
      queryFn: async () => {
        const data = await dashboardOrpcClient.chat.sessions.get({
          organizationId,
          chatId,
        });
        return {
          messages: data.messages,
          lastResponseStopped: data.lastResponseStopped,
          activeStreamId: data.activeStreamId,
          externalChannelId: data.externalChannelId,
        };
      },
      staleTime: 1000 * 60 * 5,
    });
  }

  const { sessions, generatingTitleChatIds, isLoading } = useChatSessions();
  const shouldReduceMotion = useReducedMotion();
  const { renameChat, togglePinned, deleteChat } = useChatSessionMutations();

  const pathSegments = pathname.split("/").filter(Boolean);
  const currentChatId = chatIdFromPath(pathname);
  const isOnChatRoute = pathSegments[1] === "chat";
  const pinnedSessions = sessions.filter((session) =>
    Boolean(session.pinnedAt)
  );
  const historyGroups = getChatHistoryGroups(
    sessions.filter((session) => !session.pinnedAt)
  );

  useEffect(() => {
    if (!editingChatId) {
      return;
    }

    editInputRef.current?.focus();
    editInputRef.current?.select();
  }, [editingChatId]);

  async function submitRename(session: ChatSessionSummary) {
    const nextTitle = normalizeChatTitle(draftTitle);

    if (!nextTitle) {
      toast.error(tChat("emptyTitle"));
      setDraftTitle(session.title);
      setEditingChatId(null);
      return;
    }

    if (nextTitle === session.title) {
      setEditingChatId(null);
      return;
    }

    setRenamingChatId(session.chatId);
    setEditingChatId(null);
    const ok = await renameChat(session.chatId, nextTitle);
    if (!ok) {
      setDraftTitle(session.title);
      setEditingChatId(session.chatId);
    }
    setRenamingChatId(null);
  }

  async function handleDelete() {
    if (!deleteCandidate) {
      return;
    }

    const candidate = deleteCandidate;
    setDeletingChatId(candidate.chatId);
    const ok = await deleteChat(candidate.chatId);
    setDeletingChatId(null);

    if (!ok) {
      return;
    }

    if (candidate.chatId === currentChatId) {
      router.replace(`/${slug}/chat`);
    }
    setDeleteCandidate(null);
    setEditingChatId((current) =>
      current === candidate.chatId ? null : current
    );
  }

  function startEditing(session: ChatSessionSummary) {
    if (generatingTitleChatIds.has(session.chatId)) {
      return;
    }
    setDraftTitle(session.title);
    setEditingChatId(session.chatId);
  }

  async function handleTogglePinned(session: ChatSessionSummary) {
    if (pinningChatId === session.chatId) {
      return;
    }
    setPinningChatId(session.chatId);
    await togglePinned(session);
    setPinningChatId(null);
  }

  function renderSessions(label: string, items: ChatSessionSummary[]) {
    if (items.length === 0) {
      return null;
    }

    return (
      <SidebarGroup key={label}>
        <SidebarGroupLabel>{label}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {items.map((session) => {
              const isEditing = editingChatId === session.chatId;
              const isRenaming = renamingChatId === session.chatId;
              const isPinning = pinningChatId === session.chatId;
              const isBusy = isRenaming || isPinning;
              const isGeneratingTitle = generatingTitleChatIds.has(
                session.chatId
              );
              const sessionHref = `/${slug}/chat/${session.chatId}`;

              return (
                <ContextMenu key={session.chatId}>
                  <ContextMenuTrigger render={<SidebarMenuItem />}>
                    <SidebarMenuButton
                      className={cn(
                        "cursor-pointer pr-8",
                        isBusy && "opacity-70"
                      )}
                      isActive={session.chatId === currentChatId}
                      render={
                        isEditing ? (
                          <div className="w-full">
                            <Input
                              className="h-7"
                              disabled={isBusy}
                              maxLength={CHAT_TITLE_MAX_LENGTH}
                              onBlur={() => submitRename(session)}
                              onChange={(event) =>
                                setDraftTitle(event.target.value)
                              }
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  submitRename(session);
                                  return;
                                }

                                if (event.key === "Escape") {
                                  event.preventDefault();
                                  setDraftTitle(session.title);
                                  setEditingChatId(null);
                                }
                              }}
                              ref={editInputRef}
                              value={draftTitle}
                            />
                          </div>
                        ) : (
                          <SidebarNavLink
                            aria-label={
                              isGeneratingTitle
                                ? tChat("generating")
                                : undefined
                            }
                            href={sessionHref}
                            onClick={(event) => {
                              if (window.location.pathname === sessionHref) {
                                event.preventDefault();
                              }
                            }}
                            onFocus={() => prefetchChatHistory(session.chatId)}
                            onMouseEnter={() =>
                              prefetchChatHistory(session.chatId)
                            }
                            replace={isOnChatRoute}
                          >
                            {isGeneratingTitle ? (
                              <Skeleton
                                aria-label={tChat("generating")}
                                className="h-4 w-28 max-w-full"
                                role="status"
                              />
                            ) : (
                              <span className="truncate">
                                {displayChatTitle(
                                  session.title,
                                  tCommon2("labels.newChat")
                                )}
                              </span>
                            )}
                          </SidebarNavLink>
                        )
                      }
                      tooltip={
                        isGeneratingTitle
                          ? undefined
                          : displayChatTitle(
                              session.title,
                              tCommon2("labels.newChat")
                            )
                      }
                    />

                    {!isEditing && (
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          aria-label={t("options")}
                          className="text-muted-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-foreground data-popup-open:bg-sidebar-accent data-popup-open:text-foreground duration-fast absolute top-1/2 right-1.5 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md opacity-0 outline-hidden transition-opacity ease-out group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 data-popup-open:opacity-100 [&>svg]:size-4 [&>svg]:shrink-0"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                          }}
                        >
                          <HugeiconsIcon icon={MoreHorizontalIcon} />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="start"
                          className="w-44"
                          side="right"
                          sideOffset={6}
                        >
                          <DropdownMenuItem
                            onClick={() => handleTogglePinned(session)}
                          >
                            <HugeiconsIcon
                              icon={session.pinnedAt ? PinOffIcon : PinIcon}
                            />
                            {session.pinnedAt ? tChat("unpin") : tChat("pin")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={isGeneratingTitle}
                            onClick={() => startEditing(session)}
                          >
                            <HugeiconsIcon icon={PencilEdit02Icon} />
                            {tCommon("rename")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeleteCandidate(session)}
                            variant="destructive"
                          >
                            <HugeiconsIcon icon={Delete02Icon} />
                            {tCommon("delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </ContextMenuTrigger>

                  <ContextMenuContent>
                    <ContextMenuItem
                      onClick={() => handleTogglePinned(session)}
                    >
                      <HugeiconsIcon
                        icon={session.pinnedAt ? PinOffIcon : PinIcon}
                      />
                      {session.pinnedAt ? tChat("unpin") : tChat("pin")}
                    </ContextMenuItem>
                    <ContextMenuItem
                      disabled={isGeneratingTitle}
                      onClick={() => startEditing(session)}
                    >
                      <HugeiconsIcon icon={PencilEdit02Icon} />
                      {tCommon("rename")}
                    </ContextMenuItem>
                    <ContextMenuItem
                      onClick={() => setDeleteCandidate(session)}
                      variant="destructive"
                    >
                      <HugeiconsIcon icon={Delete02Icon} />
                      {tCommon("delete")}
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              );
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  if (!slug) {
    return null;
  }

  return (
    <>
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                className="cursor-pointer"
                render={
                  <SidebarNavLink
                    href={`/${slug}/chat`}
                    replace={isOnChatRoute}
                  >
                    <HugeiconsIcon icon={Add01Icon} />
                    <SidebarLabel>{tCommon2("labels.newChat")}</SidebarLabel>
                  </SidebarNavLink>
                }
                tooltip={tCommon2("labels.newChat")}
              />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      {!isCollapsed && (
        <div className="flex-1 overflow-x-hidden overflow-y-auto">
          <AnimatePresence initial={false}>
            {!isLoading || sessions.length > 0 ? (
              <motion.div
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
                key="chat-sessions"
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                {renderSessions(t("pinned"), pinnedSessions)}
                {historyGroups.map((group) =>
                  renderSessions(
                    group.id === "lastMonth"
                      ? t("groups.lastMonth")
                      : tCommon2(`labels.${group.id}`),
                    group.sessions
                  )
                )}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      )}

      <ConfirmDialog
        confirmLabel={tCommon("delete")}
        description={tCommon2("messages.thisWillPermanentlyDeleteTitle", {
          title: deleteCandidate?.title ?? "",
        })}
        onConfirm={handleDelete}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteCandidate(null);
          }
        }}
        open={Boolean(deleteCandidate)}
        pending={Boolean(deletingChatId)}
        title={tChat("deleteTitle")}
        variant="destructive"
      />
    </>
  );
}
