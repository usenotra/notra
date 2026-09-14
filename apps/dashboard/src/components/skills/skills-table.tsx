"use client";

import { Delete02Icon, RefreshIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/button";
import { Table, type TableColumn } from "@/components/motion/table";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { SkillDeleteDialog } from "@/components/skills/skill-delete-dialog";
import {
  SKILL_NAV_TRANSITION_TYPES,
  SKILL_REVIEW_QUERY_PARAM,
  SKILL_SORT_KEYS,
} from "@/constants/skills";
import { TABLE_ROW_HEIGHT } from "@/constants/table";
import { dashboardOrpc } from "@/lib/orpc/query";
import type {
  SkillDeleteTarget,
  SkillListItem,
  SkillSortKey,
  SkillsTableProps,
} from "@/types/skills/page";
import { formatSkillUpdatedAt, toggleSkillSort } from "@/utils/skills";
import { tableHeightFor } from "@/utils/table";

function isSkillSortKey(key: string): key is SkillSortKey {
  return (SKILL_SORT_KEYS as readonly string[]).includes(key);
}

export function SkillsTable({
  slug,
  skills,
  sort,
  onSortChange,
  searchActive,
}: SkillsTableProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { activeOrganization } = useOrganizationsContext();
  const organizationId = activeOrganization?.id;
  const [deleteTarget, setDeleteTarget] = useState<SkillDeleteTarget | null>(
    null
  );

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!organizationId) {
        throw new Error("Organization ID is required");
      }
      return dashboardOrpc.skills.delete.call({ organizationId, id });
    },
    onSuccess: () => {
      setDeleteTarget(null);
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.skills.list.queryKey({
          input: { organizationId: organizationId ?? "" },
        }),
      });
      toast.success("Skill deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const openSkill = (skill: SkillListItem, review = false) => {
    const href = `/${slug}/skills/${skill.id}`;
    router.push(review ? `${href}?${SKILL_REVIEW_QUERY_PARAM}=true` : href, {
      transitionTypes: [SKILL_NAV_TRANSITION_TYPES.forward],
    });
  };

  // Warm the route and the detail queries on hover so the skill opens with its
  // content already in the cache instead of behind a skeleton.
  const prefetchSkill = (skill: SkillListItem) => {
    router.prefetch(`/${slug}/skills/${skill.id}`);
    if (!organizationId) {
      return;
    }
    const input = { organizationId, id: skill.id };
    queryClient.prefetchQuery(
      dashboardOrpc.skills.getById.queryOptions({ input })
    );
    if (skill.isSystem) {
      queryClient.prefetchQuery(
        dashboardOrpc.skills.getUpstream.queryOptions({ input })
      );
    }
  };

  const columns: TableColumn<SkillListItem>[] = [
    {
      key: "name",
      header: "Name",
      width: "14rem",
      sortable: true,
      cell: (skill) => (
        <span className="block truncate font-mono text-sm font-medium">
          {skill.name}
        </span>
      ),
    },
    {
      key: "description",
      header: "Description",
      width: "1fr",
      minWidth: "16rem",
      cell: (skill) => (
        <span
          className="text-muted-foreground block truncate text-sm"
          title={skill.description}
        >
          {skill.description}
        </span>
      ),
    },
    {
      key: "updatedAt",
      header: "Updated",
      width: "9rem",
      sortable: true,
      sortValue: (skill) => new Date(skill.updatedAt).getTime(),
      cell: (skill) => (
        <time
          className="text-muted-foreground text-sm"
          dateTime={new Date(skill.updatedAt).toISOString()}
          title={new Date(skill.updatedAt).toLocaleString("en-US")}
        >
          {formatSkillUpdatedAt(skill.updatedAt)}
        </time>
      ),
    },
    {
      key: "actions",
      header: "",
      width: "6rem",
      align: "right",
      cell: (skill) => (
        <TooltipProvider>
          <div className="flex items-center justify-end gap-0.5">
            {skill.upstream?.updateAvailable ? (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      aria-label={`Review update for ${skill.name}`}
                      className="text-primary hover:text-primary"
                      onClick={(event) => {
                        event.stopPropagation();
                        openSkill(skill, true);
                      }}
                      size="icon"
                      variant="ghost"
                    >
                      <HugeiconsIcon icon={RefreshIcon} size={14} />
                    </Button>
                  }
                />
                <TooltipContent>
                  Update to v{skill.upstream.latestVersion}
                </TooltipContent>
              </Tooltip>
            ) : null}
            <Tooltip>
              <TooltipTrigger
                render={
                  <span className="inline-flex">
                    <Button
                      aria-label={`Delete ${skill.name}`}
                      className="text-muted-foreground hover:text-destructive"
                      disabled={skill.isSystem || deleteMutation.isPending}
                      onClick={(event) => {
                        event.stopPropagation();
                        setDeleteTarget({ id: skill.id, name: skill.name });
                      }}
                      size="icon"
                      variant="ghost"
                    >
                      <HugeiconsIcon icon={Delete02Icon} size={14} />
                    </Button>
                  </span>
                }
              />
              <TooltipContent>
                {skill.isSystem
                  ? "System skills cannot be deleted"
                  : "Delete skill"}
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      ),
    },
  ];

  return (
    <>
      <Table
        columns={columns}
        data={skills}
        emptyState={
          searchActive
            ? "No skills match your search."
            : "No skills in this view yet."
        }
        getRowId={(skill) => skill.id}
        height={tableHeightFor(skills.length)}
        onRowClick={(skill) => openSkill(skill)}
        onRowPointerEnter={prefetchSkill}
        onSortChange={(next) => {
          const key = next?.key ?? sort.key;
          if (isSkillSortKey(key)) {
            onSortChange(toggleSkillSort(sort, key));
          }
        }}
        rowHeight={TABLE_ROW_HEIGHT}
        sort={sort}
      />
      <SkillDeleteDialog
        name={deleteTarget?.name ?? ""}
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate(deleteTarget.id);
          }
        }}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
        open={deleteTarget !== null}
        pending={deleteMutation.isPending}
      />
    </>
  );
}
