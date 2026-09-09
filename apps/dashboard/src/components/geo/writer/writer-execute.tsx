"use client";

import { Alert02Icon, PlayIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@notra/ui/components/ui/alert";
import { Button } from "@notra/ui/components/ui/button";
import { createContext, use, useEffect, useLayoutEffect, useRef } from "react";

import { StatusSpinner } from "@/components/geo/status-spinner";
import {
  CONTENT_PLAN_WRITE_LABEL,
  CONTENT_PLAN_WRITING_LABEL,
} from "@/constants/content-plan";
import { trackEvent } from "@/lib/analytics/posthog-client";
import {
  useGeoWriterBrief,
  useGeoWriterStart,
} from "@/lib/hooks/use-geo-writer";
import type {
  WriterExecuteActions,
  WriterExecuteRootProps,
  WriterExecuteState,
} from "@/types/components/geo-writer";

interface WriterExecuteContextValue {
  state: WriterExecuteState;
  actions: WriterExecuteActions;
}

const WriterExecuteContext = createContext<WriterExecuteContextValue | null>(
  null
);

function useWriterExecute() {
  const value = use(WriterExecuteContext);
  if (!value) {
    throw new Error(
      "WriterExecute components must be used within WriterExecute.Root"
    );
  }
  return value;
}

function WriterExecuteProvider({
  organizationId,
  projectId,
  briefId,
  hasUnsavedChanges,
  onArticleReady,
  children,
}: Omit<WriterExecuteRootProps, "briefId"> & { briefId: string }) {
  const briefQuery = useGeoWriterBrief(organizationId, briefId, projectId);
  const startMutation = useGeoWriterStart(organizationId, projectId);
  const status = briefQuery.data?.status;
  const isStarting = startMutation.isPending;
  const isBusy = isStarting || status === "writing" || status === "approved";

  const onArticleReadyRef = useRef(onArticleReady);
  useLayoutEffect(() => {
    onArticleReadyRef.current = onArticleReady;
  }, [onArticleReady]);
  const notifiedCompletionRef = useRef(false);

  useEffect(() => {
    if (status !== "completed") {
      notifiedCompletionRef.current = false;
      return;
    }
    if (hasUnsavedChanges || notifiedCompletionRef.current) {
      return;
    }
    notifiedCompletionRef.current = true;
    trackEvent(POSTHOG_EVENTS.GEO_WRITER_ARTICLE_READY_VIEWED, {
      brief_id: briefId,
    });
    const ready = onArticleReadyRef.current();
    if (ready instanceof Promise) {
      ready.catch(() => undefined);
    }
  }, [briefId, hasUnsavedChanges, status]);

  const value: WriterExecuteContextValue = {
    state: {
      status,
      error: briefQuery.data?.error ?? null,
      isStarting,
      isBusy,
      isPending: briefQuery.isPending && !briefQuery.data,
      hasUnsavedChanges,
    },
    actions: {
      execute: () => {
        startMutation.mutate(briefId);
      },
    },
  };

  return <WriterExecuteContext value={value}>{children}</WriterExecuteContext>;
}

function WriterExecuteRoot({
  briefId,
  children,
  ...providerProps
}: WriterExecuteRootProps) {
  if (!briefId) {
    return children;
  }
  return (
    <WriterExecuteProvider briefId={briefId} {...providerProps}>
      {children}
    </WriterExecuteProvider>
  );
}

function WriterExecuteBanner() {
  const {
    state: { status, error },
  } = useWriterExecute();

  if (status === "writing" || status === "approved") {
    return (
      <Alert>
        <StatusSpinner />
        <AlertTitle>Writing the article</AlertTitle>
        <AlertDescription>
          The writer is drafting this post. It stays a draft until you publish.
        </AlertDescription>
      </Alert>
    );
  }

  if (status === "failed") {
    return (
      <Alert variant="destructive">
        <HugeiconsIcon icon={Alert02Icon} />
        <AlertTitle>Writing failed</AlertTitle>
        <AlertDescription>
          {error ??
            "The writer could not finish this article. Retry Execute to try again."}
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}

function WriterExecuteButton() {
  const {
    state: { status, isBusy, isStarting, isPending, hasUnsavedChanges },
    actions: { execute },
  } = useWriterExecute();

  if (isPending || status === "completed") {
    return null;
  }

  const isFailed = status === "failed";
  const label = (() => {
    if (isStarting) {
      return "Starting...";
    }
    if (status === "writing" || status === "approved") {
      return CONTENT_PLAN_WRITING_LABEL;
    }
    if (isFailed) {
      return "Retry";
    }
    return CONTENT_PLAN_WRITE_LABEL;
  })();

  return (
    <Button
      disabled={isBusy || hasUnsavedChanges}
      onClick={execute}
      size="sm"
      variant={isFailed ? "outline" : "default"}
    >
      {isBusy ? (
        <StatusSpinner />
      ) : (
        <HugeiconsIcon className="size-4" icon={PlayIcon} />
      )}
      {label}
    </Button>
  );
}

export const WriterExecute = {
  Root: WriterExecuteRoot,
  Banner: WriterExecuteBanner,
  Button: WriterExecuteButton,
};
