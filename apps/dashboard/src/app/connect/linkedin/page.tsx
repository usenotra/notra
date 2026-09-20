"use client";

import { Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@notra/ui/components/ui/avatar";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { Notra } from "@notra/ui/components/ui/svgs/notra";
import { Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { parseAsString, useQueryState } from "nuqs";
import { Suspense, useState } from "react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/button";
import {
  useCompleteLinkedInSelection,
  useLinkedInSelection,
} from "@/lib/hooks/use-linkedin-selection";
import { cn } from "@/lib/utils";
import type { SelectionShellProps } from "@/types/components/linkedin-connect";

function buildSafePath(callbackPath: string): string {
  return callbackPath.startsWith("/") && !callbackPath.startsWith("//")
    ? callbackPath
    : "/";
}

function buildConnectedPath(callbackPath: string): string {
  const safePath = buildSafePath(callbackPath);
  const separator = safePath.includes("?") ? "&" : "?";
  return `${safePath}${separator}linkedinConnected=true`;
}

function LinkedInConnectContent() {
  const router = useRouter();
  const [token] = useQueryState("token", parseAsString.withDefault(""));
  const { data, isLoading, isError, error } = useLinkedInSelection(token);
  const completeMutation = useCompleteLinkedInSelection();
  const [deselectedIds, setDeselectedIds] = useState<ReadonlySet<string>>(
    new Set()
  );
  const selectedIds: string[] = [];
  for (const account of data?.accounts ?? []) {
    if (!deselectedIds.has(account.providerAccountId)) {
      selectedIds.push(account.providerAccountId);
    }
  }

  const toggleAccount = (accountId: string) => {
    setDeselectedIds((ids) => {
      const next = new Set(ids);
      if (next.has(accountId)) {
        next.delete(accountId);
      } else {
        next.add(accountId);
      }
      return next;
    });
  };

  const handleConnect = () => {
    if (completeMutation.isPending || selectedIds.length === 0) {
      return;
    }
    completeMutation.mutate(
      { token, accountIds: selectedIds },
      {
        onSuccess: (result) => {
          router.replace(buildConnectedPath(result.callbackPath));
        },
        onError: (mutationError) => {
          toast.error(
            mutationError instanceof Error && mutationError.message
              ? mutationError.message
              : "Failed to connect the LinkedIn profiles"
          );
        },
      }
    );
  };

  if (!token) {
    return (
      <SelectionShell>
        <p className="text-destructive text-sm">
          This connection link is invalid. Please start the connection again.
        </p>
        <Link className={cn(buttonVariants({ variant: "outline" }))} href="/">
          Back to dashboard
        </Link>
      </SelectionShell>
    );
  }

  if (isLoading) {
    return (
      <SelectionShell>
        <div className="space-y-3">
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
        </div>
      </SelectionShell>
    );
  }

  if (isError || !data) {
    return (
      <SelectionShell>
        <p className="text-destructive text-sm">
          {error instanceof Error && error.message
            ? error.message
            : "Failed to load your LinkedIn profiles. Please start the connection again."}
        </p>
        <Link className={cn(buttonVariants({ variant: "outline" }))} href="/">
          Back to dashboard
        </Link>
      </SelectionShell>
    );
  }

  return (
    <SelectionShell>
      <div className="space-y-3">
        {data.accounts.map((account) => {
          const isSelected = !deselectedIds.has(account.providerAccountId);
          const isPage = account.connectionType === "page";
          return (
            <button
              className={cn(
                "hover:bg-accent flex w-full cursor-pointer items-center gap-3 rounded-lg border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                isSelected && "border-primary/60 bg-primary/5"
              )}
              disabled={completeMutation.isPending}
              key={account.providerAccountId}
              onClick={() => toggleAccount(account.providerAccountId)}
              type="button"
            >
              <Avatar
                className={cn(
                  "size-10",
                  isPage ? "rounded-md" : "rounded-full"
                )}
              >
                {account.profileImageUrl && (
                  <AvatarImage
                    alt={account.username}
                    src={account.profileImageUrl}
                  />
                )}
                <AvatarFallback className={cn(isPage && "rounded-md")}>
                  {account.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {account.username}
                </p>
                <p className="text-muted-foreground text-xs">
                  {isPage ? "Company page" : "Personal profile"}
                </p>
              </div>
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full border",
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border"
                )}
              >
                {isSelected && (
                  <HugeiconsIcon className="size-3.5" icon={Tick02Icon} />
                )}
              </span>
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-end gap-2 border-t pt-4">
        <Link
          className={cn(buttonVariants({ variant: "outline" }))}
          href={buildSafePath(data.callbackPath)}
        >
          Cancel
        </Link>
        <Button
          disabled={completeMutation.isPending || selectedIds.length === 0}
          onClick={handleConnect}
        >
          {completeMutation.isPending && (
            <Loader2Icon className="size-4 animate-spin" />
          )}
          {selectedIds.length === 1
            ? "Connect 1 profile"
            : `Connect ${selectedIds.length} profiles`}
        </Button>
      </div>
    </SelectionShell>
  );
}

function SelectionShell({ children }: SelectionShellProps) {
  return (
    <div className="bg-muted/40 flex min-h-svh flex-col items-center justify-center px-4 py-12">
      <div className="mb-8 flex items-center gap-2.5">
        <span className="border-border flex size-11 items-center justify-center rounded-xl border bg-white shadow-sm">
          <Notra className="size-7" />
        </span>
        <span className="text-foreground text-xl font-semibold tracking-tight">
          Notra
        </span>
      </div>
      <div className="bg-background w-full max-w-md rounded-xl border p-6 shadow-sm">
        <div className="mb-5 space-y-1">
          <h1 className="text-lg font-bold">Where should we post from?</h1>
          <p className="text-muted-foreground text-sm">
            Pick the LinkedIn profiles you want to post as.
          </p>
        </div>
        <div className="space-y-4">{children}</div>
      </div>
    </div>
  );
}

export default function LinkedInConnectPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh items-center justify-center">
          <Loader2Icon className="text-muted-foreground size-6 animate-spin" />
        </div>
      }
    >
      <LinkedInConnectContent />
    </Suspense>
  );
}
