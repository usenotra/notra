"use client";

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import {
  Cancel01Icon,
  InformationCircleIcon,
  PlusSignIcon,
  Tick01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  COMPETITOR_KIND_HINT,
  GEO_COLOR_DEBOUNCE_MS,
} from "@notra/geo-core/constants/geo";
import { normalizeCompetitorDomain } from "@notra/geo-core/geo/domain";
import type { GeoCompetitorKind } from "@notra/geo-core/types/geo";
import {
  ColorPicker,
  ColorPickerEyeDropper,
  ColorPickerFormat,
  ColorPickerHue,
  ColorPickerSelection,
} from "@notra/ui/components/kibo-ui/color-picker";
import { Badge } from "@notra/ui/components/ui/badge";
import { Input } from "@notra/ui/components/ui/input";
import { Label } from "@notra/ui/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@notra/ui/components/ui/popover";
import { TooltipContent } from "@notra/ui/components/ui/tooltip";
import { SPRING } from "@notra/ui/lib/motion";
import { useForm } from "@tanstack/react-form";
import { useDebouncedCallback } from "@tanstack/react-pacer";
import Color from "color";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ComponentProps, useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/button";
import { CompetitorLogoPreview } from "@/components/geo/competitor-logo-preview";
import { COMPETITOR_SWATCHES } from "@/constants/charts";
import { useGeoCompetitorsDb } from "@/lib/hooks/use-geo-db";
import { cn } from "@/lib/utils";
import type { CompetitorEditFormProps } from "@/types/geo";

const INSTANT_TRANSITION = { duration: 0 } as const;

const COMPETITOR_KIND_OPTIONS = [
  { value: "direct", label: "Direct competitor" },
  { value: "indirect", label: "Indirect competitor" },
] as const;

function swatchInk(hex: string): string {
  try {
    return Color(hex).luminosity() > 0.58 ? "oklch(0.2 0 0)" : "oklch(1 0 0)";
  } catch {
    return "oklch(1 0 0)";
  }
}

function CompetitorKindToggle({
  value,
  onChange,
}: {
  value: GeoCompetitorKind;
  onChange: (next: GeoCompetitorKind) => void;
}) {
  const layoutId = useId();
  const reduceMotion = useReducedMotion();

  return (
    <div
      aria-label="Competitor type"
      className="bg-muted grid grid-cols-2 rounded-lg p-[3px]"
      onKeyDown={(event) => {
        if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") {
          return;
        }
        event.preventDefault();
        onChange(value === "direct" ? "indirect" : "direct");
      }}
      role="radiogroup"
    >
      {COMPETITOR_KIND_OPTIONS.map((option) => {
        const active = value === option.value;
        return (
          // biome-ignore lint/a11y/useSemanticElements: segmented control uses the radiogroup pattern; native radios cannot host the sliding pill.
          <button
            aria-checked={active}
            className={cn(
              "relative isolate h-7 rounded-md px-2.5 text-sm font-medium",
              "duration-fast transition-colors ease-out",
              "focus-visible:ring-ring/50 focus-visible:ring-2 focus-visible:outline-none",
              active
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
            key={option.value}
            onClick={() => onChange(option.value)}
            role="radio"
            tabIndex={active ? 0 : -1}
            type="button"
          >
            {active ? (
              <motion.span
                className="bg-background absolute inset-0 rounded-md shadow-sm"
                layoutId={layoutId}
                transition={
                  reduceMotion ? INSTANT_TRANSITION : SPRING.indicatorFlat
                }
              />
            ) : null}
            <span className="relative z-10">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function CompetitorSwatch({
  color,
  label,
  selected,
  className,
  style,
  ...props
}: {
  color: string;
  label: string;
  selected: boolean;
} & ComponentProps<"button">) {
  return (
    <button
      aria-label={label}
      aria-pressed={selected}
      className={cn(
        "duration-fast relative size-6 rounded-full outline outline-1 -outline-offset-1 outline-black/10 transition-transform ease-out dark:outline-white/10",
        "focus-visible:ring-1 focus-visible:ring-white/70 focus-visible:outline-none focus-visible:ring-inset",
        "active:scale-[0.96]",
        !selected && "hover:scale-105",
        className
      )}
      style={{ backgroundColor: color, ...style }}
      type="button"
      {...props}
    >
      {selected ? (
        <HugeiconsIcon
          className="absolute inset-0 m-auto"
          color={swatchInk(color)}
          icon={Tick01Icon}
          size={11}
          strokeWidth={2.4}
        />
      ) : null}
    </button>
  );
}

function CompetitorSynonymsField({
  id,
  synonyms,
  onChange,
}: {
  id: string;
  synonyms: string[];
  onChange: (next: string[]) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const draftRef = useRef(draft);
  const skipCommitRef = useRef(false);
  const restoreFocusRef = useRef(false);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const reduceMotion = useReducedMotion();
  const composerTransition = reduceMotion
    ? INSTANT_TRANSITION
    : SPRING.indicatorFlat;
  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);
  useEffect(() => {
    if (adding) {
      inputRef.current?.focus();
    }
  }, [adding]);

  useEffect(() => {
    if (adding || !restoreFocusRef.current) {
      return;
    }
    restoreFocusRef.current = false;
    addButtonRef.current?.focus();
  }, [adding]);

  const commitDraft = () => {
    const value = draftRef.current.trim();
    if (value.length === 0) {
      return;
    }
    const exists = synonyms.some(
      (item) => item.toLowerCase() === value.toLowerCase()
    );
    if (!exists) {
      onChange([...synonyms, value]);
    }
    draftRef.current = "";
    setDraft("");
  };

  const stopAdding = (restoreFocus: boolean) => {
    restoreFocusRef.current = restoreFocus;
    draftRef.current = "";
    setDraft("");
    setAdding(false);
  };

  return (
    <div className="space-y-1.5">
      <Label htmlFor={adding ? id : undefined}>
        Synonyms <span className="text-muted-foreground">(Optional)</span>
      </Label>
      <div className="flex flex-wrap items-center gap-1.5">
        {synonyms.map((synonym) => (
          <Badge className="gap-1 pr-1" key={synonym} variant="secondary">
            {synonym}
            <button
              aria-label={`Remove ${synonym}`}
              className="hover:bg-background rounded-full p-0.5"
              onClick={() =>
                onChange(synonyms.filter((item) => item !== synonym))
              }
              type="button"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={12} />
            </button>
          </Badge>
        ))}
        <AnimatePresence initial={false} mode="popLayout">
          {adding ? (
            <motion.div
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              className="w-48 origin-left"
              exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
              initial={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }}
              key="synonym-draft"
              transition={composerTransition}
            >
              <Input
                className="h-8"
                id={id}
                onBlur={() => {
                  if (!skipCommitRef.current) {
                    commitDraft();
                  }
                  skipCommitRef.current = false;
                  draftRef.current = "";
                  setDraft("");
                  setAdding(false);
                }}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    commitDraft();
                  }
                  if (event.key === "Escape") {
                    event.preventDefault();
                    event.stopPropagation();
                    skipCommitRef.current = true;
                    stopAdding(true);
                  }
                }}
                placeholder="Another name"
                ref={inputRef}
                value={draft}
              />
            </motion.div>
          ) : (
            <motion.button
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              aria-label="Add synonym"
              className="border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground inline-flex h-8 cursor-pointer items-center gap-0.5 rounded-lg border border-dashed px-2.5 text-xs transition-colors active:scale-[0.96]"
              exit={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }}
              initial={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }}
              key="synonym-add"
              onClick={() => setAdding(true)}
              ref={addButtonRef}
              transition={composerTransition}
              type="button"
            >
              <HugeiconsIcon icon={PlusSignIcon} size={12} strokeWidth={2} />
              Add
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export function CompetitorEditForm({
  organizationId,
  competitor,
  initialName,
  onDone,
  onCancel,
}: CompetitorEditFormProps) {
  const { saveCompetitor } = useGeoCompetitorsDb(organizationId);
  const nameId = useId();
  const websiteId = useId();
  const synonymId = useId();

  const form = useForm({
    defaultValues: {
      name: competitor?.name ?? initialName ?? "",
      website: competitor?.domain ?? "",
      synonyms: competitor?.synonyms ?? [],
      kind: competitor?.kind ?? ("direct" as GeoCompetitorKind),
      color: competitor?.color ?? "",
    },
    onSubmit: ({ value }) => {
      saveCompetitor({
        id: competitor?.id ?? crypto.randomUUID(),
        name: value.name.trim(),
        domain: normalizeCompetitorDomain(value.website),
        synonyms: value.synonyms,
        kind: value.kind,
        color: value.color.length === 0 ? null : value.color,
      });
      if (!competitor) {
        form.reset();
      }
      onDone();
    },
  });

  const debouncedColorChange = useDebouncedCallback(
    (hex: string) => form.setFieldValue("color", hex),
    { wait: GEO_COLOR_DEBOUNCE_MS }
  );

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        form.handleSubmit();
      }}
    >
      <form.Field name="name">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor={nameId}>Name</Label>
            <Input
              id={nameId}
              onChange={(event) => field.handleChange(event.target.value)}
              value={field.state.value}
            />
          </div>
        )}
      </form.Field>

      <form.Field name="website">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor={websiteId}>Website</Label>
            <div className="flex items-center gap-2">
              <CompetitorLogoPreview
                className="size-8"
                name={form.state.values.name || competitor?.name || "?"}
                website={field.state.value}
              />
              <Input
                id={websiteId}
                onChange={(event) => field.handleChange(event.target.value)}
                placeholder="example.com"
                value={field.state.value}
              />
            </div>
          </div>
        )}
      </form.Field>

      <form.Field name="synonyms">
        {(field) => (
          <CompetitorSynonymsField
            id={synonymId}
            onChange={field.handleChange}
            synonyms={field.state.value}
          />
        )}
      </form.Field>

      <form.Field name="color">
        {(field) => {
          const isCustom =
            field.state.value.length > 0 &&
            !COMPETITOR_SWATCHES.includes(field.state.value);
          return (
            <div className="space-y-2">
              <Label>Chart color</Label>
              <div className="flex flex-wrap items-center gap-1.5">
                {COMPETITOR_SWATCHES.map((swatch) => (
                  <CompetitorSwatch
                    color={swatch}
                    key={swatch}
                    label={`Use ${swatch}`}
                    onClick={() => field.handleChange(swatch)}
                    selected={field.state.value === swatch}
                  />
                ))}
                <Popover>
                  <PopoverTrigger
                    render={
                      <CompetitorSwatch
                        color={isCustom ? field.state.value : "#ffffff"}
                        label="Pick a custom color"
                        selected={isCustom}
                      />
                    }
                  />
                  <PopoverContent
                    align="start"
                    className="w-64 p-3"
                    initialFocus={false}
                  >
                    <ColorPicker
                      className="w-full gap-3"
                      onChange={(value) =>
                        debouncedColorChange(Color.rgb(value).hex())
                      }
                      value={
                        isCustom
                          ? field.state.value
                          : field.state.value || "#ffffff"
                      }
                    >
                      <ColorPickerSelection className="h-24" />
                      <div className="flex items-center gap-2">
                        <ColorPickerEyeDropper />
                        <ColorPickerHue />
                      </div>
                      <ColorPickerFormat className="[&_input]:focus-visible:border-input [&_input]:focus-visible:ring-0" />
                    </ColorPicker>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          );
        }}
      </form.Field>

      <form.Field name="kind">
        {(field) => (
          <div className="space-y-1.5">
            <TooltipPrimitive.Root>
              <TooltipPrimitive.Trigger
                delay={500}
                render={
                  <Label className="inline-flex w-fit items-center gap-1">
                    Type
                    <span className="text-muted-foreground font-normal">
                      (Optional)
                    </span>
                    <HugeiconsIcon
                      className="text-muted-foreground"
                      icon={InformationCircleIcon}
                      size={13}
                    />
                  </Label>
                }
              />
              <TooltipContent>{COMPETITOR_KIND_HINT}</TooltipContent>
            </TooltipPrimitive.Root>
            <CompetitorKindToggle
              onChange={field.handleChange}
              value={field.state.value}
            />
          </div>
        )}
      </form.Field>

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button onClick={onCancel} type="button" variant="outline">
            Cancel
          </Button>
        )}
        <Button type="submit">
          {competitor ? "Save changes" : "Add competitor"}
        </Button>
      </div>
    </form>
  );
}
