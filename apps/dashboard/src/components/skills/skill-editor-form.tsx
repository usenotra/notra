"use client";

import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@notra/ui/components/ui/field";
import { Input } from "@notra/ui/components/ui/input";
import {
  PermissionOption,
  PermissionRow,
} from "@notra/ui/components/ui/permission-selector";
import { Textarea } from "@notra/ui/components/ui/textarea";

import { LazySkillDiff } from "@/components/skills/lazy-skill-diff";
import {
  SKILL_EDITOR_VIEW_LABELS,
  SKILL_EDITOR_VIEWS,
} from "@/constants/skills";
import type { SkillEditorFormProps } from "@/types/skills/page";
import { isSkillEditorView } from "@/utils/skills";

export function SkillEditorForm({
  isSystem,
  savePending,
  nameInput,
  description,
  content,
  originalContent,
  view,
  onViewChange,
  onNameChange,
  onDescriptionChange,
  onContentChange,
}: SkillEditorFormProps) {
  return (
    <div className="space-y-8">
      <div className="max-w-2xl space-y-5">
        <Field>
          <FieldLabel>Name</FieldLabel>
          <Input
            className="max-w-md font-mono"
            disabled={savePending}
            onChange={(e) => onNameChange(e.target.value)}
            value={nameInput}
          />
          <FieldDescription>
            {isSystem
              ? "Lowercase letters, digits, and hyphens. Notra updates keep arriving after a rename."
              : "Lowercase letters, digits, and hyphens. Renaming may affect references to this skill by name."}
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel>
            Description
            <span className="text-destructive">*</span>
          </FieldLabel>
          <Textarea
            className="max-h-32 min-h-20 resize-none overflow-y-auto leading-relaxed"
            disabled={savePending}
            onChange={(e) => onDescriptionChange(e.target.value)}
            value={description}
          />
        </Field>
      </div>

      <Field className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <FieldLabel>
            Content
            <span className="text-destructive">*</span>
          </FieldLabel>
          <PermissionRow
            className="w-fit shrink-0"
            label="Content view"
            layout="compact"
            onValueChange={(value) => {
              if (isSkillEditorView(value)) {
                onViewChange(value);
              }
            }}
            value={view}
          >
            {SKILL_EDITOR_VIEWS.map((option) => (
              <PermissionOption key={option} value={option}>
                {SKILL_EDITOR_VIEW_LABELS[option]}
              </PermissionOption>
            ))}
          </PermissionRow>
        </div>
        {view === "edit" ? (
          <Textarea
            className="max-h-[min(70vh,40rem)] min-h-48 resize-none overflow-y-auto font-mono text-sm leading-relaxed"
            disabled={savePending}
            onChange={(e) => onContentChange(e.target.value)}
            spellCheck={false}
            value={content}
          />
        ) : (
          <div className="border-border/80 min-h-48 overflow-auto rounded-xl border">
            <LazySkillDiff
              after={{ label: "Unsaved", content }}
              before={{ label: "Saved", content: originalContent }}
            />
          </div>
        )}
      </Field>
    </div>
  );
}
