"use client";

import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@notra/ui/components/ui/field";
import { Input } from "@notra/ui/components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@notra/ui/components/ui/tabs";
import { Textarea } from "@notra/ui/components/ui/textarea";
import { useTranslations } from "next-intl";

import { DiffView } from "@/components/content/diff-view";
import { SKILL_EDITOR_VIEWS } from "@/constants/skills";
import type {
  SkillEditorFormProps,
  SkillEditorView,
} from "@/types/skills/page";

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
  const t = useTranslations("skills.editor");
  const tCommon = useTranslations("common");
  return (
    <div className="space-y-8">
      <div className="max-w-2xl space-y-5">
        <Field>
          <FieldLabel>{tCommon("labels.name")}</FieldLabel>
          <Input
            className="max-w-md font-mono"
            disabled={isSystem || savePending}
            onChange={(e) => onNameChange(e.target.value)}
            readOnly={isSystem}
            value={nameInput}
          />
          {isSystem ? (
            <FieldDescription>{t("systemNameHint")}</FieldDescription>
          ) : (
            <FieldDescription>{t("nameHint")}</FieldDescription>
          )}
        </Field>
        <Field>
          <FieldLabel>
            {tCommon("labels.description")}
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
        <Tabs
          className="gap-3"
          onValueChange={(v) => onViewChange(v as SkillEditorView)}
          value={view}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <FieldLabel>
              {tCommon("labels.contentSingular")}
              <span className="text-destructive">*</span>
            </FieldLabel>
            <TabsList variant="line">
              <TabsTrigger value={SKILL_EDITOR_VIEWS[0]}>
                {tCommon("actions.edit")}
              </TabsTrigger>
              <TabsTrigger value={SKILL_EDITOR_VIEWS[1]}>
                {t("tabs.diff")}
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="edit">
            <Textarea
              className="max-h-[min(70vh,40rem)] min-h-48 resize-none overflow-y-auto font-mono text-sm leading-relaxed"
              disabled={savePending}
              onChange={(e) => onContentChange(e.target.value)}
              spellCheck={false}
              value={content}
            />
          </TabsContent>
          <TabsContent value="diff">
            <div className="border-border/80 bg-muted/20 min-h-48 overflow-auto rounded-lg border">
              <DiffView
                currentMarkdown={content}
                originalMarkdown={originalContent}
              />
            </div>
          </TabsContent>
        </Tabs>
      </Field>
    </div>
  );
}
