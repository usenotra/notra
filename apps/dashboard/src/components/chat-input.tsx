"use client";

import {
  AtIcon,
  Cancel01Icon,
  TextSelectionIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert, AlertDescription } from "@notra/ui/components/ui/alert";
import { Button } from "@notra/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@notra/ui/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@notra/ui/components/ui/dropdown-menu";
import { Github } from "@notra/ui/components/ui/svgs/github";
import { Linear } from "@notra/ui/components/ui/svgs/linear";
import { Slack } from "@notra/ui/components/ui/svgs/slack";
import { Textarea } from "@notra/ui/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";
import { useCustomer } from "autumn-js/react";
import { Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { FEATURES } from "@/lib/billing/constants";
import { ALL_INTEGRATIONS } from "@/lib/integrations/catalog";
import type { IntegrationsResponse } from "@/lib/services/integrations";
import type { GitHubRepository } from "@/types/integrations";
import { QUERY_KEYS } from "@/utils/query-keys";

export type TextSelection = {
  text: string;
  startLine: number;
  startChar: number;
  endLine: number;
  endChar: number;
};

export type ContextItem = {
  type: "github-repo";
  owner: string;
  repo: string;
  integrationId: string;
};

type ChatInputProps = {
  onSend?: (value: string) => void;
  isLoading?: boolean;
  statusText?: string;
  selection?: TextSelection | null;
  onClearSelection?: () => void;
  organizationSlug?: string;
  organizationId?: string;
  context?: ContextItem[];
  onAddContext?: (item: ContextItem) => void;
  onRemoveContext?: (item: ContextItem) => void;
  value?: string;
  onValueChange?: (value: string) => void;
  error?: string | null;
  onClearError?: () => void;
};

const ChatInput = ({
  onSend,
  isLoading = false,
  statusText,
  selection,
  onClearSelection,
  organizationSlug,
  organizationId,
  context = [],
  onAddContext,
  onRemoveContext,
  value: controlledValue,
  onValueChange,
  error: externalError,
  onClearError,
}: ChatInputProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const [internalValue, setInternalValue] = useState("");
  const [internalError, setInternalError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const { check, customer } = useCustomer();

  const checkResult = useMemo(() => {
    if (!customer) return null;
    return check({
      featureId: FEATURES.AI_CREDITS,
      requiredBalance: 1,
    }).data;
  }, [check, customer]);
  const remainingChatCredits =
    typeof checkResult?.balance === "number" ? checkResult.balance : null;
  const shouldShowLowCredits =
    remainingChatCredits !== null &&
    remainingChatCredits > 0 &&
    remainingChatCredits <= 10;
  const isUsageBlocked = checkResult ? checkResult.allowed === false : false;
  const limitMessage = "No chat credits left.";
  const usageLimitError =
    externalError ?? internalError ?? (isUsageBlocked ? limitMessage : null);
  const clearError = useCallback(() => {
    setInternalError(null);
    onClearError?.();
  }, [onClearError]);

  // Support both controlled and uncontrolled modes
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : internalValue;
  const setValue = isControlled
    ? (onValueChange ?? (() => {}))
    : setInternalValue;

  // Fetch GitHub integrations
  const { data: integrationsData } = useQuery<IntegrationsResponse>({
    queryKey: QUERY_KEYS.INTEGRATIONS.all(organizationId ?? ""),
    queryFn: async () => {
      const response = await fetch(
        `/api/organizations/${organizationId}/integrations`
      );
      if (!response.ok) throw new Error("Failed to fetch integrations");
      return response.json();
    },
    enabled: !!organizationId,
  });

  // Get all enabled repos from all integrations (memoized, single iteration)
  const enabledRepos = useMemo(() => {
    const result: Array<GitHubRepository & { integrationId: string }> = [];
    for (const integration of integrationsData?.integrations ?? []) {
      for (const repo of integration.repositories) {
        if (repo.enabled) {
          result.push({ ...repo, integrationId: integration.id });
        }
      }
    }
    return result;
  }, [integrationsData?.integrations]);

  const isRepoInContext = useCallback(
    (repo: GitHubRepository & { integrationId: string }) =>
      context.some(
        (c) =>
          c.type === "github-repo" &&
          c.owner === repo.owner &&
          c.repo === repo.repo
      ),
    [context]
  );
  const resizeTextarea = useCallback(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = "0";
    const maxHeightRem = 12.5;
    const maxHeightPx =
      maxHeightRem *
      Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
    element.style.height = `${Math.min(element.scrollHeight / Number.parseFloat(getComputedStyle(document.documentElement).fontSize), maxHeightRem)}rem`;
    element.style.overflowY =
      element.scrollHeight > maxHeightPx ? "auto" : "hidden";
  }, []);

  // Resize textarea when controlled value changes
  useEffect(() => {
    if (isControlled) {
      requestAnimationFrame(resizeTextarea);
    }
  }, [isControlled, resizeTextarea]);

  const handleSend = useCallback(async () => {
    const trimmed = value.trim();
    if (!trimmed || isLoading) return;

    clearError();

    if (isUsageBlocked) {
      setInternalError(limitMessage);
      return;
    }

    // Only check billing if customer data is available (Autumn is configured)
    if (customer) {
      const { data: checkResult } = check({
        featureId: FEATURES.AI_CREDITS,
        requiredBalance: 1,
      });

      // Only block if we explicitly got allowed: false (not if check failed)
      if (checkResult?.allowed === false) {
        setInternalError(limitMessage);
        return;
      }
    }

    onSend?.(trimmed);
    setValue("");
    requestAnimationFrame(resizeTextarea);
  }, [
    onSend,
    resizeTextarea,
    value,
    isLoading,
    check,
    customer,
    isUsageBlocked,
    clearError,
    setValue,
  ]);

  useHotkeys(
    "enter",
    (event) => {
      if (event.shiftKey) return;
      event.preventDefault();
      handleSend();
    },
    {
      enableOnFormTags: ["TEXTAREA"],
    },
    [handleSend]
  );

  return (
    <Card
      className="w-full gap-0 rounded-[14px] border-0 bg-background py-0 shadow-none transition-shadow duration-200 ease-out-expo"
      data-focused={isFocused ? "true" : "false"}
    >
      <CardHeader className="sr-only">
        <span>Chat input</span>
      </CardHeader>
      <CardContent className="p-0">
        <div
          className="rounded-[14px] border border-border bg-background p-0.5 shadow-sm"
          tabIndex={-1}
        >
          {usageLimitError && (
            <Alert className="mx-2 mt-2 mb-1" variant="destructive">
              <AlertDescription className="flex flex-wrap items-center gap-1 break-words text-sm">
                <span>{usageLimitError}</span>
                {organizationSlug && (
                  <Link
                    className="font-medium underline underline-offset-2"
                    href={`/${organizationSlug}/billing/plans`}
                  >
                    Upgrade
                  </Link>
                )}
              </AlertDescription>
            </Alert>
          )}
          {isLoading && statusText && (
            <div className="flex items-start gap-2 px-3.5 pt-2 pb-1">
              <Loader2Icon className="mt-0.5 size-4 shrink-0 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground text-sm leading-5">
                {statusText}
              </p>
            </div>
          )}
          {(context.length > 0 || selection) && (
            <div className="flex items-center gap-2 overflow-x-auto px-3 pt-2 pb-1">
              {context.map((item, index) => (
                <div
                  className="flex shrink-0 items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-foreground text-xs"
                  key={`${item.type}-${item.owner}-${item.repo}-${index}`}
                >
                  <Github className="size-3.5" />
                  <span className="font-medium">
                    {item.owner}/{item.repo}
                  </span>
                  <button
                    aria-label={`Remove ${item.owner}/${item.repo} from context`}
                    className="ml-0.5 cursor-pointer rounded p-0.5 transition-colors hover:bg-accent"
                    onClick={() => onRemoveContext?.(item)}
                    type="button"
                  >
                    <HugeiconsIcon className="size-3" icon={Cancel01Icon} />
                  </button>
                </div>
              ))}
              {selection && (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <div className="flex shrink-0 items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-foreground text-xs" />
                    }
                  >
                    <HugeiconsIcon
                      className="size-3.5 text-muted-foreground"
                      icon={TextSelectionIcon}
                    />
                    <span className="font-medium">
                      L{selection.startLine}:{selection.startChar} → L
                      {selection.endLine}:{selection.endChar}
                    </span>
                    <button
                      aria-label="Remove selection"
                      className="ml-0.5 cursor-pointer rounded p-0.5 transition-colors hover:bg-accent"
                      onClick={onClearSelection}
                      type="button"
                    >
                      <HugeiconsIcon className="size-3" icon={Cancel01Icon} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <div className="space-y-1">
                      <p className="font-medium">Selected Text</p>
                      <p className="text-xs opacity-70">
                        From line {selection.startLine}, character{" "}
                        {selection.startChar} to line {selection.endLine},
                        character {selection.endChar}
                      </p>
                      <p className="line-clamp-3 whitespace-pre-wrap break-all text-xs opacity-80">
                        "
                        {selection.text.length > 150
                          ? selection.text.slice(0, 150) + "..."
                          : selection.text}
                        "
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          )}
          <div className="flex flex-col rounded-xl bg-background">
            <div className="flex w-full items-center">
              <div className="relative flex flex-1 cursor-text transition-colors [--lh:1lh]">
                <Textarea
                  aria-label="Send a message"
                  className="max-h-[12.5rem] min-h-8 w-full resize-none whitespace-pre-wrap border-0 bg-transparent py-0 pr-2 pl-3.5 text-foreground text-sm leading-8 caret-foreground shadow-none outline-none ring-0 focus-visible:border-transparent focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isLoading || isUsageBlocked}
                  onBlur={() => setIsFocused(false)}
                  onChange={(event) => {
                    setValue(event.target.value);
                  }}
                  onFocus={() => setIsFocused(true)}
                  onInput={resizeTextarea}
                  placeholder={
                    isLoading ? "AI is working..." : "Send a message..."
                  }
                  ref={textareaRef}
                  rows={1}
                  value={value}
                />
              </div>
            </div>
          </div>
          {shouldShowLowCredits && (
            <div className="px-3 pb-1 text-muted-foreground text-xs">
              {remainingChatCredits} chat messages left
            </div>
          )}
          <CardFooter className="flex items-center justify-between overflow-hidden p-2">
            <div className="flex items-center gap-1 sm:gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      className="bg-muted hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={isLoading}
                      size="sm"
                      variant="outline"
                    />
                  }
                >
                  <div className="flex items-center gap-1.5 text-sm">
                    <HugeiconsIcon className="size-4" icon={AtIcon} />
                    <span className="hidden min-[400px]:inline">
                      Add Context
                    </span>
                    <div className="flex items-center pr-1 sm:pr-2">
                      <span className="-mr-1.5 rounded-md bg-background p-0.5 ring-2 ring-white dark:ring-black [&_svg]:size-4">
                        <Slack />
                      </span>
                      <span className="-mr-1.5 rounded-md bg-background p-0.5 ring-2 ring-white dark:ring-black [&_svg]:size-4">
                        <Github />
                      </span>
                      <span className="rounded-md bg-background p-0.5 ring-2 ring-white dark:ring-black [&_svg]:size-4">
                        <Linear />
                      </span>
                    </div>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Integrations</DropdownMenuLabel>
                  </DropdownMenuGroup>
                  {ALL_INTEGRATIONS.map((integration) => {
                    const isGitHub = integration.id === "github";
                    const isAvailable = integration.available;

                    // GitHub with repos - show submenu
                    if (isGitHub && isAvailable && enabledRepos.length > 0) {
                      return (
                        <DropdownMenuSub key={integration.id}>
                          <DropdownMenuSubTrigger>
                            <span className="size-4 shrink-0 text-foreground [&_svg]:size-4">
                              {integration.icon}
                            </span>
                            <span className="text-foreground">
                              {integration.name}
                            </span>
                            <span className="ml-auto text-emerald-600 text-xs dark:text-emerald-400">
                              {enabledRepos.length}
                            </span>
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent className="max-h-64 overflow-y-auto">
                            <DropdownMenuGroup>
                              <DropdownMenuLabel>
                                Select Repository
                              </DropdownMenuLabel>
                            </DropdownMenuGroup>
                            {enabledRepos.map((repo) => {
                              const inContext = isRepoInContext(repo);
                              return (
                                <DropdownMenuItem
                                  key={repo.id}
                                  onClick={() => {
                                    if (inContext) {
                                      onRemoveContext?.({
                                        type: "github-repo",
                                        owner: repo.owner,
                                        repo: repo.repo,
                                        integrationId: repo.integrationId,
                                      });
                                    } else {
                                      onAddContext?.({
                                        type: "github-repo",
                                        owner: repo.owner,
                                        repo: repo.repo,
                                        integrationId: repo.integrationId,
                                      });
                                    }
                                  }}
                                >
                                  <Github className="size-4" />
                                  <span className="truncate">
                                    {repo.owner}/{repo.repo}
                                  </span>
                                  {inContext && (
                                    <span className="ml-auto text-emerald-600 text-xs dark:text-emerald-400">
                                      Added
                                    </span>
                                  )}
                                </DropdownMenuItem>
                              );
                            })}
                            {organizationSlug && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  render={
                                    <Link
                                      href={`/${organizationSlug}/integrations/github`}
                                    />
                                  }
                                >
                                  Manage repositories
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                      );
                    }

                    // GitHub available but no repos
                    if (isGitHub && isAvailable && organizationSlug) {
                      return (
                        <DropdownMenuItem
                          key={integration.id}
                          render={
                            <Link
                              href={`/${organizationSlug}/integrations/github`}
                            />
                          }
                        >
                          <span className="size-4 shrink-0 text-foreground [&_svg]:size-4">
                            {integration.icon}
                          </span>
                          <span className="text-foreground">
                            {integration.name}
                          </span>
                          <span className="ml-auto text-muted-foreground text-xs">
                            Setup
                          </span>
                        </DropdownMenuItem>
                      );
                    }

                    // Not available integrations
                    return (
                      <DropdownMenuItem
                        className="opacity-60"
                        disabled
                        key={integration.id}
                      >
                        <span className="size-4 shrink-0 text-foreground [&_svg]:size-4">
                          {integration.icon}
                        </span>
                        <span className="text-foreground">
                          {integration.name}
                        </span>
                        <span className="ml-auto text-muted-foreground text-xs">
                          Soon
                        </span>
                      </DropdownMenuItem>
                    );
                  })}
                  {organizationSlug && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        render={
                          <Link href={`/${organizationSlug}/integrations`} />
                        }
                      >
                        Manage integrations
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    className="group/button h-7 shrink-0 rounded-lg bg-muted px-1.5 transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isLoading || isUsageBlocked}
                    onClick={handleSend}
                    size="sm"
                    tabIndex={0}
                    type="button"
                    variant="outline"
                  />
                }
              >
                <div className="flex items-center gap-1 text-foreground text-sm">
                  {isLoading ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : (
                    <>
                      <div className="px-0.5 text-sm leading-0 transition-transform">
                        Go
                      </div>
                      <div className="hidden h-4 items-center rounded border border-border bg-background px-1 text-[10px] text-muted-foreground shadow-xs sm:inline-flex md:inline-flex">
                        ↵
                      </div>
                    </>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {isLoading
                  ? "AI is thinking..."
                  : "Enter to send. Shift+Enter for a new line."}
              </TooltipContent>
            </Tooltip>
          </CardFooter>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChatInput;
