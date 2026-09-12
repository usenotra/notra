"use client";

import { updateSkillSchema } from "@notra/schemas/dashboard/skills";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/button";
import { PageContainer } from "@/components/layout/container";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { SkillDeleteDialog } from "@/components/skills/skill-delete-dialog";
import { SkillDetailHeader } from "@/components/skills/skill-detail-header";
import { SkillEditorForm } from "@/components/skills/skill-editor-form";
import { SKILL_EDITOR_VIEWS } from "@/constants/skills";
import { dashboardOrpc } from "@/lib/orpc/query";
import type { SkillDetailPageClientProps } from "@/types/skills/page";

export default function PageClient({ slug, name }: SkillDetailPageClientProps) {
  const { activeOrganization } = useOrganizationsContext();
  const organizationId = activeOrganization?.id;
  const queryClient = useQueryClient();
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [view, setView] = useQueryState(
    "view",
    parseAsStringLiteral(SKILL_EDITOR_VIEWS).withDefault("edit")
  );

  const [original, setOriginal] = useState<{
    name: string;
    description: string;
    content: string;
  } | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");

  const saveToastIdRef = useRef<string | number | null>(null);
  const handleSaveRef = useRef<(() => void) | null>(null);
  const handleDiscardRef = useRef<(() => void) | null>(null);

  const { data: skill, isPending } = useQuery({
    ...dashboardOrpc.skills.getByName.queryOptions({
      input: { organizationId: organizationId ?? "", name },
    }),
    enabled: !!organizationId,
  });

  if (skill && !original) {
    setOriginal({
      name: skill.name,
      description: skill.description,
      content: skill.content,
    });
    setNameInput(skill.name);
    setDescription(skill.description);
    setContent(skill.content);
  }

  const hasChanges =
    !!original &&
    (nameInput !== original.name ||
      description !== original.description ||
      content !== original.content);

  const invalidate = () => {
    queryClient.invalidateQueries({
      queryKey: dashboardOrpc.skills.list.queryKey({
        input: { organizationId: organizationId ?? "" },
      }),
    });
    queryClient.invalidateQueries({
      queryKey: dashboardOrpc.skills.getByName.queryKey({
        input: { organizationId: organizationId ?? "", name },
      }),
    });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId) {
        throw new Error("Organization ID is required");
      }
      const willRename = nameInput !== name;
      const parsed = updateSkillSchema.safeParse({
        name: willRename ? nameInput : undefined,
        description,
        content,
      });
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
      }
      return dashboardOrpc.skills.update.call({
        organizationId,
        name,
        payload: parsed.data,
      });
    },
    onSuccess: (data) => {
      setOriginal({ name: data.name, description, content });
      setNameInput(data.name);
      invalidate();
      toast.success("Skill saved");
      if (data.name !== name) {
        router.replace(`/${slug}/skills/${data.name}`);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId) {
        throw new Error("Organization ID is required");
      }
      return dashboardOrpc.skills.delete.call({ organizationId, name });
    },
    onSuccess: () => {
      invalidate();
      toast.success("Skill deleted");
      router.push(`/${slug}/skills`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  useEffect(() => {
    handleSaveRef.current = () => {
      if (!hasChanges || saveMutation.isPending || deleteMutation.isPending) {
        return;
      }
      saveMutation.mutate();
    };
    handleDiscardRef.current = () => {
      if (!original) {
        return;
      }
      setNameInput(original.name);
      setDescription(original.description);
      setContent(original.content);
    };
  }, [hasChanges, saveMutation, deleteMutation, original]);

  useEffect(() => {
    if (hasChanges && !saveToastIdRef.current) {
      saveToastIdRef.current = toast.custom(
        () => (
          <div className="border-border bg-background rounded-[14px] border p-0.5 shadow-sm">
            <div className="bg-background flex items-center gap-3 rounded-lg px-4 py-3">
              <span className="text-muted-foreground text-sm">
                Unsaved changes
              </span>
              <Button
                onClick={() => handleDiscardRef.current?.()}
                size="sm"
                variant="ghost"
              >
                Discard
              </Button>
              <Button onClick={() => handleSaveRef.current?.()} size="sm">
                Save
              </Button>
            </div>
          </div>
        ),
        { duration: Number.POSITIVE_INFINITY, position: "bottom-right" }
      );
    } else if (!hasChanges && saveToastIdRef.current) {
      toast.dismiss(saveToastIdRef.current);
      saveToastIdRef.current = null;
    }
  }, [hasChanges]);

  useEffect(() => {
    return () => {
      if (saveToastIdRef.current) {
        toast.dismiss(saveToastIdRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasChanges]);

  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-8 px-4 lg:px-6">
        <SkillDetailHeader
          canDelete={Boolean(skill && !skill.isSystem)}
          deleteDisabled={saveMutation.isPending || deleteMutation.isPending}
          isSystem={Boolean(skill?.isSystem)}
          name={name}
          onDelete={() => setDeleteOpen(true)}
          slug={slug}
        />

        {organizationId && isPending ? (
          <div className="space-y-8">
            <div className="max-w-2xl space-y-5">
              <Skeleton className="h-10 w-full max-w-md" />
              <Skeleton className="h-20 w-full" />
            </div>
            <Skeleton className="h-[28rem] w-full rounded-xl" />
          </div>
        ) : null}

        {!(organizationId && isPending) && skill ? (
          <SkillEditorForm
            content={content}
            description={description}
            isSystem={skill.isSystem}
            nameInput={nameInput}
            onContentChange={setContent}
            onDescriptionChange={setDescription}
            onNameChange={setNameInput}
            onViewChange={setView}
            originalContent={original?.content ?? ""}
            savePending={saveMutation.isPending}
            view={view}
          />
        ) : null}
      </div>

      <SkillDeleteDialog
        name={name}
        onConfirm={() => deleteMutation.mutate()}
        onOpenChange={setDeleteOpen}
        open={deleteOpen}
        pending={deleteMutation.isPending}
      />
    </PageContainer>
  );
}
