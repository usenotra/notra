"use client";

import { Link04Icon } from "@hugeicons/core-free-icons";
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
import { Separator } from "@notra/ui/components/ui/separator";
import { Textarea } from "@notra/ui/components/ui/textarea";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/button";
import { dashboardOrpc } from "@/lib/orpc/query";
import { parseSkillFrontmatter } from "@/lib/skills/parse-frontmatter";
import type { SkillCreateDialogProps } from "@/types/skills/page";
import { getSkillQuickstartError } from "@/utils/skills";

const EMPTY_FORM = { name: "", description: "", content: "" };

export function SkillCreateDialog({
  open,
  onOpenChange,
  organizationId,
}: SkillCreateDialogProps) {
  const queryClient = useQueryClient();
  const [quickstartUrl, setQuickstartUrl] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);

  const quickstartError = getSkillQuickstartError(quickstartUrl);

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
      const parsed = createSkillSchema.safeParse(form);
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
      }
      return dashboardOrpc.skills.create.call({
        organizationId,
        payload: parsed.data,
      });
    },
    onSuccess: () => {
      onOpenChange(false);
      setForm(EMPTY_FORM);
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

  const canImport =
    Boolean(quickstartUrl.trim()) &&
    !quickstartError &&
    !importMutation.isPending &&
    !createMutation.isPending;

  const handlePasteFrontmatter = (
    e: React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const parsed = parseSkillFrontmatter(e.clipboardData.getData("text/plain"));
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
                disabled={createMutation.isPending || importMutation.isPending}
                onChange={(e) => setQuickstartUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canImport) {
                    e.preventDefault();
                    importMutation.mutate();
                  }
                }}
                placeholder="https://skills.sh/..."
                value={quickstartUrl}
              />
              <InputGroupAddon
                align="inline-end"
                className="pr-1 has-[>button]:mr-0"
              >
                <Button
                  className="h-7 px-2.5"
                  disabled={!canImport}
                  onClick={() => importMutation.mutate()}
                  size="sm"
                >
                  {importMutation.isPending ? (
                    <Loader2Icon className="size-3.5 animate-spin" />
                  ) : null}
                  {importMutation.isPending ? "Importing" : "Import"}
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
              disabled={createMutation.isPending}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              onPaste={handlePasteFrontmatter}
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
              disabled={createMutation.isPending}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              onPaste={handlePasteFrontmatter}
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
              disabled={createMutation.isPending}
              onChange={(e) =>
                setForm((f) => ({ ...f, content: e.target.value }))
              }
              onPaste={handlePasteFrontmatter}
              placeholder={"# My skill\n\nYou are..."}
              value={form.content}
            />
          </Field>
        </div>
        <ResponsiveDialogFooter>
          <ResponsiveDialogClose
            disabled={createMutation.isPending}
            render={<Button variant="outline">Cancel</Button>}
          />
          <Button
            disabled={createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            {createMutation.isPending ? "Creating…" : "Create skill"}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
