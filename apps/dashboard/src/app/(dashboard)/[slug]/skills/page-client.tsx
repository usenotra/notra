"use client";

import { PlusSignIcon, Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@notra/ui/components/ui/input-group";
import { Kbd } from "@notra/ui/components/ui/kbd";
import { useHotkey } from "@tanstack/react-hotkeys";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { EmptyStateCardsPreview } from "@/components/empty-state-preview";
import { PageContainer } from "@/components/layout/container";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { SkillCreateDialog } from "@/components/skills/skill-create-dialog";
import { SkillsTable } from "@/components/skills/skills-table";
import { EMPTY_STATE_CARD_COUNT } from "@/constants/empty-state";
import { dashboardOrpc } from "@/lib/orpc/query";
import type { SkillSortState } from "@/types/skills/page";
import { filterSkills, sortSkills } from "@/utils/skills";

import { SkillsPageSkeleton } from "./skeleton";

interface PageClientProps {
  slug: string;
}

export default function PageClient({ slug }: PageClientProps) {
  const { activeOrganization } = useOrganizationsContext();
  const organizationId = activeOrganization?.id;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SkillSortState>({
    key: "name",
    direction: "asc",
  });

  useHotkey("C", () => setDialogOpen(true), { enabled: !dialogOpen });

  const { data: skills = [], isPending } = useQuery({
    ...dashboardOrpc.skills.list.queryOptions({
      input: { organizationId: organizationId ?? "" },
    }),
    enabled: !!organizationId,
  });

  const isLoadingSkills = !!organizationId && isPending;
  const visibleSkills = sortSkills(filterSkills(skills, search), sort);
  const searchActive = search.trim().length > 0;

  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Skills</h1>
            <p className="text-muted-foreground">
              Reusable instructions your agents load when generating content.
            </p>
          </div>
          <Button className="w-fit gap-2" onClick={() => setDialogOpen(true)}>
            <span className="inline-flex items-center gap-1.5">
              <HugeiconsIcon className="size-4" icon={PlusSignIcon} />
              Create Skill
            </span>
            <Kbd className="hidden sm:inline-flex">C</Kbd>
          </Button>
        </div>

        {isLoadingSkills && <SkillsPageSkeleton />}
        {!isLoadingSkills && skills.length === 0 && (
          <EmptyState
            action={
              <Button onClick={() => setDialogOpen(true)} variant="outline">
                <HugeiconsIcon className="size-4" icon={PlusSignIcon} />
                Create Skill
              </Button>
            }
            description="Add a skill to capture writing knowledge the AI can reuse."
            preview={
              <EmptyStateCardsPreview
                columns={3}
                count={EMPTY_STATE_CARD_COUNT.skill}
                variant="skill"
              />
            }
            title="No skills yet"
          />
        )}
        {!isLoadingSkills && skills.length > 0 && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <InputGroup className="h-9 sm:max-w-72">
                <InputGroupAddon>
                  <HugeiconsIcon
                    className="text-muted-foreground size-4"
                    icon={Search01Icon}
                  />
                </InputGroupAddon>
                <InputGroupInput
                  aria-label="Search skills"
                  autoComplete="off"
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or description"
                  value={search}
                />
              </InputGroup>
            </div>
            <SkillsTable
              onSortChange={setSort}
              searchActive={searchActive}
              skills={visibleSkills}
              slug={slug}
              sort={sort}
            />
          </div>
        )}
      </div>

      <SkillCreateDialog
        onOpenChange={setDialogOpen}
        open={dialogOpen}
        organizationId={organizationId}
      />
    </PageContainer>
  );
}
