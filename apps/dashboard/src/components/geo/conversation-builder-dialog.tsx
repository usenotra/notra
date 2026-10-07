"use client";

import { Cancel01Icon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  GEO_MAX_SEQUENCES,
  GEO_PROMPT_MIN_LENGTH,
  GEO_SEQUENCE_MAX_TURNS,
} from "@notra/geo-core/constants/geo";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@notra/ui/components/shared/responsive-dialog";
import { Input } from "@notra/ui/components/ui/input";
import { Label } from "@notra/ui/components/ui/label";
import { Textarea } from "@notra/ui/components/ui/textarea";
import { useId, useState } from "react";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import { useGeoSequencesDb } from "@/lib/hooks/use-geo-db";
import type {
  ConversationBuilderDialogProps,
  ConversationTurnDraft,
} from "@/types/geo";

let turnIdCounter = 0;
const createTurn = (text = ""): ConversationTurnDraft => {
  turnIdCounter += 1;
  return { id: `turn-${turnIdCounter}`, text };
};

const turnsFromSequence = (
  sequence: ConversationBuilderDialogProps["sequence"]
): ConversationTurnDraft[] =>
  sequence && sequence.steps.length > 0
    ? sequence.steps.map((step) => createTurn(step))
    : [createTurn()];

export function ConversationBuilderDialog({
  open,
  onOpenChange,
  organizationId,
  sequence,
}: ConversationBuilderDialogProps) {
  const t = useTranslations("geo.conversationBuilderDialog");
  const tGeoShared = useTranslations("geo.shared");
  const tCommon2 = useTranslations("common");
  const tCommon = useTranslations("common.actions");
  const nameId = useId();
  const { addSequence, sequences, updateSequence } = useGeoSequencesDb(
    organizationId,
    { enabled: open }
  );
  const [name, setName] = useState(sequence?.name ?? "");
  const [steps, setSteps] = useState<ConversationTurnDraft[]>(() =>
    turnsFromSequence(sequence)
  );

  const validSteps = steps.flatMap((step) => {
    const text = step.text.trim();
    return text.length >= GEO_PROMPT_MIN_LENGTH ? [text] : [];
  });
  const canSave =
    name.trim().length > 0 &&
    validSteps.length > 0 &&
    (sequence !== null || sequences.length < GEO_MAX_SEQUENCES);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setName(sequence?.name ?? "");
      setSteps(turnsFromSequence(sequence));
    }
    onOpenChange(next);
  };

  const handleSave = () => {
    if (!canSave) {
      return;
    }
    if (sequence) {
      updateSequence(sequence.id, { name: name.trim(), steps: validSteps });
    } else {
      addSequence(name.trim(), validSteps);
      setName("");
      setSteps([createTurn()]);
    }
    onOpenChange(false);
  };

  return (
    <ResponsiveDialog onOpenChange={handleOpenChange} open={open}>
      <ResponsiveDialogContent className="sm:max-w-lg">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="wrap-anywhere">
            {sequence
              ? tCommon2("labels.editName", { name: sequence.name })
              : tGeoShared("newConversation")}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {t("description")}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <div className="space-y-4 px-4 md:px-0">
          <div className="space-y-1.5">
            <Label htmlFor={nameId}>{tCommon2("labels.name")}</Label>
            <Input
              id={nameId}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("namePlaceholder")}
              value={name}
            />
          </div>
          <div className="space-y-2">
            <Label>{tGeoShared("turns")}</Label>
            <div className="space-y-2">
              {steps.map((step, index) => (
                <div className="flex items-start gap-2" key={step.id}>
                  <span className="text-muted-foreground mt-2 w-5 shrink-0 text-right text-xs tabular-nums">
                    {index + 1}
                  </span>
                  <Textarea
                    aria-label={`${tGeoShared("turns")} ${index + 1}`}
                    className="max-h-80 min-w-0 flex-1 resize-none overflow-y-auto"
                    onChange={(event) =>
                      setSteps((previous) =>
                        previous.map((item) =>
                          item.id === step.id
                            ? { ...item, text: event.target.value }
                            : item
                        )
                      )
                    }
                    placeholder={
                      index === 0
                        ? t("firstTurnPlaceholder")
                        : t("followUpPlaceholder")
                    }
                    rows={2}
                    value={step.text}
                  />
                  {steps.length > 1 && (
                    <Button
                      aria-label={t("removeTurn", { number: index + 1 })}
                      className="mt-1 shrink-0"
                      onClick={() =>
                        setSteps((previous) =>
                          previous.filter((item) => item.id !== step.id)
                        )
                      }
                      size="icon"
                      type="button"
                      variant="ghost"
                    >
                      <HugeiconsIcon icon={Cancel01Icon} size={14} />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {steps.length < GEO_SEQUENCE_MAX_TURNS && (
              <Button
                className="ml-7"
                onClick={() =>
                  setSteps((previous) => [...previous, createTurn()])
                }
                size="sm"
                type="button"
                variant="outline"
              >
                <HugeiconsIcon icon={PlusSignIcon} size={14} />
                {t("addFollowUp")}
              </Button>
            )}
          </div>
        </div>
        <ResponsiveDialogFooter>
          <Button disabled={!canSave} onClick={handleSave} type="button">
            {sequence ? tCommon("saveChanges") : t("create")}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
