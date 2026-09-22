"use client";

import {
  Link04Icon,
  PlusSignIcon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createSkillSchema } from "@notra/schemas/dashboard/skills";
import {
  ResponsiveDialog,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@notra/ui/components/shared/responsive-dialog";
import { Field, FieldLabel } from "@notra/ui/components/ui/field";
import { Input } from "@notra/ui/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@notra/ui/components/ui/input-group";
import { Kbd } from "@notra/ui/components/ui/kbd";
import { Separator } from "@notra/ui/components/ui/separator";
import { Textarea } from "@notra/ui/components/ui/textarea";
import { useHotkey } from "@tanstack/react-hotkeys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { EmptyStateCardsPreview } from "@/components/empty-state-preview";
import { PageContainer } from "@/components/layout/container";
import { PageHeading } from "@/components/layout/page-heading";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { SkillsTable } from "@/components/skills/skills-table";
import { EMPTY_STATE_CARD_COUNT } from "@/constants/empty-state";
import { dashboardOrpc } from "@/lib/orpc/query";
import { parseSkillFrontmatter } from "@/lib/skills/parse-frontmatter";
import type { SkillListItem, SkillSortState } from "@/types/skills/page";
import { filterSkills, skillQuickstartError, sortSkills } from "@/utils/skills";

import { SkillsPageSkeleton } from "./skeleton";

interface PageClientProps {
  slug: string;
}

export default function PageClient({ slug }: PageClientProps) {
  const { activeOrganization } = useOrganizationsContext();
  const organizationId = activeOrganization?.id;
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [quickstartUrl, setQuickstartUrl] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SkillSortState>({
    key: "name",
    direction: "asc",
  });

  useHotkey("C", () => setDialogOpen(true), { enabled: !dialogOpen });

  const [form, setForm] = useState({
    name: "",
    description: "",
    content: "",
  });

  const quickstartError = skillQuickstartError(quickstartUrl);

  const { data: skills = [], isPending } = useQuery({
    ...dashboardOrpc.skills.list.queryOptions({
      input: { organizationId: organizationId ?? "" },
    }),
    enabled: !!organizationId,
  });

  const importMutation = useMutation({
    mutationFn: () =>
      dashboardOrpc.skills.importFromUrl.call({
        url: quickstartUrl.trim(),
      }),
    onSuccess: (data) => {
      setForm((f) => ({
        name: f.name || data.name,
        description: f.description || data.description,
        content: f.content || data.content,
      }));
      toast.success("Skill imported from skills.sh");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId) {
        throw new Error("Organization ID is required");
      }
      const parsed = createSkillSchema.safeParse({
        name: form.name,
        description: form.description,
        content: form.content,
      });
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
      }
      return dashboardOrpc.skills.create.call({
        organizationId,
        payload: parsed.data,
      });
    },
    onSuccess: () => {
      setDialogOpen(false);
      setForm({ name: "", description: "", content: "" });
      setQuickstartUrl("");
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.skills.list.queryKey({
          input: { organizationId: organizationId ?? "" },
        }),
      });
      toast.success("Skill created");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handlePasteFrontmatter = (
    e: React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const pasted = e.clipboardData.getData("text/plain");
    const parsed = parseSkillFrontmatter(pasted);
    if (!parsed) {
      return;
    }

    e.preventDefault();
    setForm((f) => ({
      name: f.name || (parsed.name ?? ""),
      description: f.description || (parsed.description ?? ""),
      content: f.content || parsed.body,
    }));
  };

  const isLoadingSkills = !!organizationId && isPending;
  const visibleSkills = sortSkills(filterSkills(skills, search), sort);
  const searchActive = search.trim().length > 0;

  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <PageHeading
          description="Reusable instructions your agents load when generating content."
          title="Skills"
        >
          <Button className="w-fit gap-2" onClick={() => setDialogOpen(true)}>
            <span className="inline-flex items-center gap-1.5">
              <HugeiconsIcon className="size-4" icon={PlusSignIcon} />
              Create Skill
            </span>
            <Kbd className="hidden sm:inline-flex">C</Kbd>
          </Button>
        </PageHeading>

        <SkillsPageBody
          isLoadingSkills={isLoadingSkills}
          onCreate={() => setDialogOpen(true)}
          onSearchChange={setSearch}
          onSortChange={setSort}
          search={search}
          searchActive={searchActive}
          skills={skills}
          slug={slug}
          sort={sort}
          visibleSkills={visibleSkills}
        />
      </div>

      <CreateSkillFormDialog
        createPending={createMutation.isPending}
        form={form}
        importPending={importMutation.isPending}
        onFormChange={setForm}
        onImport={() => importMutation.mutate()}
        onOpenChange={setDialogOpen}
        onPasteFrontmatter={handlePasteFrontmatter}
        onQuickstartUrlChange={setQuickstartUrl}
        onSubmit={() => createMutation.mutate()}
        open={dialogOpen}
        quickstartError={quickstartError}
        quickstartUrl={quickstartUrl}
      />
    </PageContainer>
  );
}

function SkillsPageBody({
  isLoadingSkills,
  onCreate,
  onSearchChange,
  onSortChange,
  search,
  searchActive,
  skills,
  slug,
  sort,
  visibleSkills,
}: {
  isLoadingSkills: boolean;
  onCreate: () => void;
  onSearchChange: (value: string) => void;
  onSortChange: (sort: SkillSortState) => void;
  search: string;
  searchActive: boolean;
  skills: SkillListItem[];
  slug: string;
  sort: SkillSortState;
  visibleSkills: SkillListItem[];
}) {
  if (isLoadingSkills) {
    return <SkillsPageSkeleton />;
  }

  if (skills.length === 0) {
    return (
      <EmptyState
        action={
          <Button onClick={onCreate} variant="outline">
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
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium">
          Installed skills{" "}
          <span className="text-muted-foreground tabular-nums">
            (
            {searchActive
              ? `${visibleSkills.length} of ${skills.length}`
              : skills.length}
            )
          </span>
        </p>
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
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by name or description"
            value={search}
          />
        </InputGroup>
      </div>
      <SkillsTable
        onSortChange={onSortChange}
        searchActive={searchActive}
        skills={visibleSkills}
        slug={slug}
        sort={sort}
      />
    </div>
  );
}

function CreateSkillFormDialog({
  createPending,
  form,
  importPending,
  onFormChange,
  onImport,
  onOpenChange,
  onPasteFrontmatter,
  onQuickstartUrlChange,
  onSubmit,
  open,
  quickstartError,
  quickstartUrl,
}: {
  createPending: boolean;
  form: { name: string; description: string; content: string };
  importPending: boolean;
  onFormChange: React.Dispatch<
    React.SetStateAction<{
      name: string;
      description: string;
      content: string;
    }>
  >;
  onImport: () => void;
  onOpenChange: (open: boolean) => void;
  onPasteFrontmatter: (
    e: React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
  onQuickstartUrlChange: (value: string) => void;
  onSubmit: () => void;
  open: boolean;
  quickstartError: string | null;
  quickstartUrl: string;
}) {
  return (
    <ResponsiveDialog onOpenChange={onOpenChange} open={open}>
      <ResponsiveDialogContent className="flex max-h-[85svh] flex-col overflow-hidden sm:max-w-[32rem]">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Create skill</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            A skill is a reusable prompt your agents load at runtime.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <div className="-mx-4 min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-2">
          <Field>
            <FieldLabel>Quickstart</FieldLabel>
            <InputGroup className="h-9">
              <InputGroupAddon>
                <HugeiconsIcon
                  className="text-muted-foreground size-4"
                  icon={Link04Icon}
                />
              </InputGroupAddon>
              <InputGroupInput
                aria-invalid={quickstartError ? true : undefined}
                disabled={createPending || importPending}
                onChange={(e) => onQuickstartUrlChange(e.target.value)}
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    !quickstartError &&
                    quickstartUrl.trim() &&
                    !importPending
                  ) {
                    e.preventDefault();
                    onImport();
                  }
                }}
                placeholder="https://skills.sh/..."
                value={quickstartUrl}
              />
              <InputGroupAddon align="inline-end" className="pr-1">
                <Button
                  className="h-7 px-2.5"
                  disabled={
                    !quickstartUrl.trim() ||
                    !!quickstartError ||
                    importPending ||
                    createPending
                  }
                  onClick={onImport}
                  size="sm"
                >
                  {importPending ? (
                    <Loader2Icon className="size-3.5 animate-spin" />
                  ) : null}
                  {importPending ? "Importing" : "Import"}
                </Button>
              </InputGroupAddon>
            </InputGroup>
            <p
              className={
                quickstartError
                  ? "text-destructive text-xs"
                  : "text-muted-foreground text-xs"
              }
            >
              {quickstartError ?? "Paste a skills.sh link to import a skill."}
            </p>
          </Field>
          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-muted-foreground text-xs tracking-wider uppercase">
              or create manually
            </span>
            <Separator className="flex-1" />
          </div>
          <Field>
            <FieldLabel>
              Name<span className="text-destructive -ml-1">*</span>
            </FieldLabel>
            <Input
              disabled={createPending}
              onChange={(e) =>
                onFormChange((current) => ({
                  ...current,
                  name: e.target.value,
                }))
              }
              onPaste={onPasteFrontmatter}
              placeholder="my-skill"
              value={form.name}
            />
            <p className="text-muted-foreground text-xs">
              Lowercase letters, digits, and hyphens. Or paste a full skill
              (frontmatter + body) here to auto-fill all fields.
            </p>
          </Field>
          <Field>
            <FieldLabel>
              Description<span className="text-destructive -ml-1">*</span>
            </FieldLabel>
            <Textarea
              className="max-h-[5rem] min-h-[4rem] overflow-y-auto"
              disabled={createPending}
              onChange={(e) =>
                onFormChange((current) => ({
                  ...current,
                  description: e.target.value,
                }))
              }
              onPaste={onPasteFrontmatter}
              placeholder="What this skill does and when to use it."
              value={form.description}
            />
          </Field>
          <Field>
            <FieldLabel>
              Content<span className="text-destructive -ml-1">*</span>
            </FieldLabel>
            <Textarea
              className="max-h-[14rem] min-h-[10rem] overflow-y-auto font-mono text-sm"
              disabled={createPending}
              onChange={(e) =>
                onFormChange((current) => ({
                  ...current,
                  content: e.target.value,
                }))
              }
              onPaste={onPasteFrontmatter}
              placeholder="# My skill\n\nYou are..."
              value={form.content}
            />
          </Field>
        </div>
        <ResponsiveDialogFooter>
          <ResponsiveDialogClose
            disabled={createPending}
            render={<Button variant="outline">Cancel</Button>}
          />
          <Button disabled={createPending} onClick={onSubmit}>
            {createPending ? "Creating…" : "Create skill"}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
