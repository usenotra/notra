"use client";

import { Add01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { parseAsBoolean, useQueryState } from "nuqs";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

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
  const t = useTranslations("brand.references.list");
  const tBrandShared = useTranslations("brand.shared");
  const { data, isPending } = useReferences(organizationId, voiceId);
  const deleteMutation = useDeleteReference(organizationId, voiceId);
  const updateMutation = useUpdateReference(organizationId, voiceId);
  const [twitterConnected, setTwitterConnected] = useQueryState(
    "twitterConnected",
    parseAsBoolean.withOptions({ history: "replace" })
  );
  const queryClient = useQueryClient();
  const handledCallback = useRef(false);
  const [initialStep, setInitialStep] = useState<"import-x" | undefined>();

  useEffect(() => {
    if (twitterConnected && !handledCallback.current) {
      handledCallback.current = true;
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.CONNECTED_ACCOUNTS.list(organizationId),
      });
      toast.success(t("xConnected"));
      setInitialStep("import-x");
      onDialogOpenChange(true);
      void setTwitterConnected(null);
    }
  }, [
    twitterConnected,
    setTwitterConnected,
    queryClient,
    organizationId,
    onDialogOpenChange,
    t,
  ]);

  const references = data?.references ?? [];
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteMutation.mutateAsync(id);
      toast.success(t("deleted"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("deleteFailed"));
    }
    setDeletingId(null);
  };

  const handleUpdateNote = async (id: string, note: string | null) => {
    try {
      await updateMutation.mutateAsync({ referenceId: id, data: { note } });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("updateNoteFailed")
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
        error instanceof Error ? error.message : t("updatePlatformsFailed")
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
    <div className="grid auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2">
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
        <span className="sr-only">{t("loading")}</span>
        <div aria-hidden="true" className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-52 w-full rounded-xl" />
          <Skeleton className="h-52 w-full rounded-xl" />
        </div>
      </output>
    );
  } else if (references.length === 0) {
    content = (
      <EmptyState
        actionIcon={<HugeiconsIcon className="size-4" icon={Add01Icon} />}
        actionLabel={tBrandShared("addReference")}
        description={t("emptyDescription")}
        onActionClick={() => onDialogOpenChange(true)}
        preview={
          <EmptyStateCardsPreview
            columns={2}
            count={EMPTY_STATE_CARD_COUNT.reference}
            variant="reference"
          />
        }
        title={t("emptyTitle")}
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
