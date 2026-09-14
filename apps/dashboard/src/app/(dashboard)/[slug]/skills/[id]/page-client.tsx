"use client";

import type { SkillUpgradeStrategy } from "@notra/ai/skills/types";
import { updateSkillSchema } from "@notra/schemas/dashboard/skills";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { parseAsBoolean, parseAsStringLiteral, useQueryState } from "nuqs";
import { useState } from "react";
import { toast } from "sonner";

import { PageContainer } from "@/components/layout/container";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { LazySkillUpdateDialog } from "@/components/skills/lazy-skill-update-dialog";
import { SkillDeleteDialog } from "@/components/skills/skill-delete-dialog";
import { SkillDetailHeader } from "@/components/skills/skill-detail-header";
import { SkillEditorForm } from "@/components/skills/skill-editor-form";
import {
  SKILL_EDITOR_VIEWS,
  SKILL_REVIEW_QUERY_PARAM,
} from "@/constants/skills";
import { useContentDetailSaveToast } from "@/lib/hooks/use-content-detail-save-toast";
import { useSkillEditorState } from "@/lib/hooks/use-skill-editor-state";
import { dashboardOrpc } from "@/lib/orpc/query";
import type { SkillDetailPageClientProps } from "@/types/skills/page";

function SkillEditorSkeleton() {
  return (
    <div className="space-y-8">
      <div className="max-w-2xl space-y-5">
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-20 w-full" />
      </div>
      <Skeleton className="h-[28rem] w-full rounded-xl" />
    </div>
  );
}

export default function PageClient({
  slug,
  skillId,
}: SkillDetailPageClientProps) {
  const { activeOrganization } = useOrganizationsContext();
  const organizationId = activeOrganization?.id ?? "";
  const queryClient = useQueryClient();
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useQueryState(
    SKILL_REVIEW_QUERY_PARAM,
    parseAsBoolean.withDefault(false)
  );
  const [view, setView] = useQueryState(
    "view",
    parseAsStringLiteral(SKILL_EDITOR_VIEWS).withDefault("edit")
  );

  const skillInput = { organizationId, id: skillId };

  const { data: skill, isPending } = useQuery({
    ...dashboardOrpc.skills.getById.queryOptions({ input: skillInput }),
    enabled: Boolean(organizationId),
  });

  const { data: upstreamDetail = null } = useQuery({
    ...dashboardOrpc.skills.getUpstream.queryOptions({ input: skillInput }),
    enabled: Boolean(organizationId && skill?.isSystem),
  });

  const editor = useSkillEditorState(skill);
  const saved = editor.original ?? { name: "", description: "", content: "" };

  const invalidateSkill = () => {
    queryClient.invalidateQueries({
      queryKey: dashboardOrpc.skills.list.queryKey({
        input: { organizationId },
      }),
    });
    queryClient.invalidateQueries({
      queryKey: dashboardOrpc.skills.getById.queryKey({ input: skillInput }),
    });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const parsed = updateSkillSchema.safeParse({
        name: editor.nameInput === saved.name ? undefined : editor.nameInput,
        description: editor.description,
        content: editor.content,
      });
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
      }
      return dashboardOrpc.skills.update.call({
        ...skillInput,
        payload: parsed.data,
      });
    },
    onSuccess: (data) => {
      editor.reset({
        name: data.name,
        description: editor.description,
        content: editor.content,
      });
      invalidateSkill();
      toast.success("Skill saved");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const upgradeMutation = useMutation({
    mutationFn: (input: {
      strategy: SkillUpgradeStrategy;
      payload?: { content: string; description: string };
    }) =>
      dashboardOrpc.skills.upgrade.call({
        ...skillInput,
        payload: { strategy: input.strategy, ...input.payload },
      }),
    onSuccess: async (data) => {
      setReviewOpen(false);
      editor.reset(await dashboardOrpc.skills.getById.call(skillInput));
      invalidateSkill();
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.skills.getUpstream.queryKey({
          input: skillInput,
        }),
      });
      toast.success(`${data.name} is on v${data.version}`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => dashboardOrpc.skills.delete.call(skillInput),
    onSuccess: () => {
      invalidateSkill();
      toast.success("Skill deleted");
      router.push(`/${slug}/skills`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const busy =
    saveMutation.isPending ||
    deleteMutation.isPending ||
    upgradeMutation.isPending;

  useContentDetailSaveToast({
    hasChanges: editor.hasChanges,
    isSaving: saveMutation.isPending,
    isActivityPanelOpen: false,
    onDiscard: editor.discard,
    onSave: () => {
      if (editor.hasChanges && !busy) {
        saveMutation.mutate();
      }
    },
  });

  const isLoading = Boolean(organizationId) && isPending;
  const skillName = saved.name || skill?.name || "";

  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-8 px-4 lg:px-6">
        <SkillDetailHeader
          actionsDisabled={busy}
          canDelete={skill?.isSystem === false}
          content={saved.content}
          deleteDisabled={saveMutation.isPending || deleteMutation.isPending}
          name={skillName}
          onDelete={() => setDeleteOpen(true)}
          onReviewUpdate={() => setReviewOpen(true)}
          onUpgrade={(strategy) => upgradeMutation.mutate({ strategy })}
          slug={slug}
          upgradePending={upgradeMutation.isPending}
          upstream={skill?.upstream ?? null}
          upstreamDetail={upstreamDetail}
        />

        {isLoading ? <SkillEditorSkeleton /> : null}

        {!isLoading && skill ? (
          <SkillEditorForm
            content={editor.content}
            description={editor.description}
            isSystem={skill.isSystem}
            nameInput={editor.nameInput}
            onContentChange={editor.setContent}
            onDescriptionChange={editor.setDescription}
            onNameChange={editor.setNameInput}
            onViewChange={setView}
            originalContent={saved.content}
            savePending={busy}
            view={view}
          />
        ) : null}
      </div>

      {upstreamDetail?.updateAvailable ? (
        <LazySkillUpdateDialog
          content={saved.content}
          description={saved.description}
          descriptionModified={
            upstreamDetail.base.description !== saved.description
          }
          detail={upstreamDetail}
          name={skillName}
          onOpenChange={setReviewOpen}
          onUpgrade={(strategy, payload) =>
            upgradeMutation.mutate({ strategy, payload })
          }
          open={reviewOpen}
          pending={busy}
        />
      ) : null}

      <SkillDeleteDialog
        name={skillName}
        onConfirm={() => deleteMutation.mutate()}
        onOpenChange={setDeleteOpen}
        open={deleteOpen}
        pending={deleteMutation.isPending}
      />
    </PageContainer>
  );
}
