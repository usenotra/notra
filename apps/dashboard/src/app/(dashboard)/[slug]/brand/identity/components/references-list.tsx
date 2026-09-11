"use client";

import { Add01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/empty-state";
import { EmptyStateCardsPreview } from "@/components/empty-state-preview";
import { EMPTY_STATE_CARD_COUNT } from "@/constants/empty-state";
import { QUERY_KEYS } from "@/utils/query-keys";

import {
  useDeleteReference,
  useReferences,
  useUpdateReference,
} from "../../../../../../lib/hooks/use-brand-references";
import { AddReferenceDialog } from "./add-reference-dialog";
import { ReferenceCard } from "./reference-card";

interface ReferencesListProps {
  organizationId: string;
  voiceId: string;
  dialogOpen: boolean;
  onDialogOpenChange: (open: boolean) => void;
}

export function ReferencesList({
  organizationId,
  voiceId,
  dialogOpen,
  onDialogOpenChange,
}: ReferencesListProps) {
  const { data, isPending } = useReferences(organizationId, voiceId);
  const deleteMutation = useDeleteReference(organizationId, voiceId);
  const updateMutation = useUpdateReference(organizationId, voiceId);
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const handledCallback = useRef(false);
  const [initialStep, setInitialStep] = useState<"import-x" | undefined>();

  useEffect(() => {
    if (
      searchParams.get("twitterConnected") === "true" &&
      !handledCallback.current
    ) {
      handledCallback.current = true;
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.CONNECTED_ACCOUNTS.list(organizationId),
      });
      toast.success("X account connected");
      setInitialStep("import-x");
      onDialogOpenChange(true);
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete("twitterConnected");
      window.history.replaceState({}, "", cleanUrl.toString());
    }
  }, [searchParams, queryClient, organizationId, onDialogOpenChange]);

  const references = data?.references ?? [];
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Reference deleted");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete reference"
      );
    }
    setDeletingId(null);
  };

  const handleUpdateNote = async (id: string, note: string | null) => {
    try {
      await updateMutation.mutateAsync({ referenceId: id, data: { note } });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update note"
      );
    }
  };

  const handleUpdateApplicableTo = async (
    id: string,
    applicableTo: string[]
  ) => {
    try {
      await updateMutation.mutateAsync({
        referenceId: id,
        data: { applicableTo },
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update platforms"
      );
    }
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      setInitialStep(undefined);
    }
    onDialogOpenChange(open);
  };

  let content = (
    <div className="columns-1 gap-4 space-y-4 sm:columns-2">
      {references.map((ref) => (
        <ReferenceCard
          isDeleting={deletingId === ref.id}
          key={ref.id}
          onDelete={handleDelete}
          onUpdateApplicableTo={handleUpdateApplicableTo}
          onUpdateNote={handleUpdateNote}
          reference={ref}
        />
      ))}
    </div>
  );

  if (isPending) {
    content = (
      <output>
        <span className="sr-only">Loading references</span>
        <div aria-hidden="true" className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </output>
    );
  } else if (references.length === 0) {
    content = (
      <EmptyState
        actionIcon={<HugeiconsIcon className="size-4" icon={Add01Icon} />}
        actionLabel="Add Reference"
        description="Add a tweet or writing sample so the AI can match your style."
        onActionClick={() => onDialogOpenChange(true)}
        preview={
          <EmptyStateCardsPreview
            columns={2}
            count={EMPTY_STATE_CARD_COUNT.reference}
            variant="reference"
          />
        }
        title="No references yet"
      />
    );
  }

  return (
    <div className="space-y-4">
      {content}

      <AddReferenceDialog
        initialStep={initialStep}
        onOpenChange={handleDialogOpenChange}
        open={dialogOpen}
        organizationId={organizationId}
        voiceId={voiceId}
      />
    </div>
  );
}
