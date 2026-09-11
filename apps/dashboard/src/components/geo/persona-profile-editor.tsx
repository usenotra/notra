"use client";

import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { GEO_PERSONA_FIELD_MAX_LENGTH } from "@notra/geo-core/constants/geo-personas";
import { geoPersonaEditableDetailsSchema } from "@notra/geo-core/schemas/geo-personas";
import { Badge } from "@notra/ui/components/ui/badge";
import { Input } from "@notra/ui/components/ui/input";
import { Textarea } from "@notra/ui/components/ui/textarea";
import { useId, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/button";
import { GEO_PERSONA_PROFILE_SECTIONS } from "@/constants/geo-personas";
import { useGeoPersonaUpdate } from "@/lib/hooks/use-geo-personas";
import type { PersonaProfileEditorProps } from "@/types/geo-personas-ui";
import { groupPersonaMemories } from "@/utils/geo-personas";

export function PersonaProfileEditor({
  persona,
  organizationId,
  onCancel,
}: PersonaProfileEditorProps) {
  const id = useId();
  const update = useGeoPersonaUpdate(organizationId);
  const [error, setError] = useState<string | null>(null);
  const [stack, setStack] = useState(() => [
    ...new Set(persona.profile.currentStack),
  ]);
  const [stackDraft, setStackDraft] = useState("");
  const stackInput = useRef<HTMLInputElement>(null);
  return (
    <form
      className="flex h-full min-h-0 flex-col"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        form.set(
          "currentStack",
          [...new Set([...stack, stackDraft.trim()])].filter(Boolean).join("\n")
        );
        const profile = Object.fromEntries(
          GEO_PERSONA_PROFILE_SECTIONS.map(({ key }) => [
            key,
            String(form.get(key) ?? "")
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean),
          ])
        );
        const parsed = geoPersonaEditableDetailsSchema.safeParse({
          name: form.get("name"),
          role: form.get("role"),
          company: form.get("company"),
          summary: form.get("summary"),
          searchStyle: form.get("searchStyle"),
          profile,
        });
        if (!parsed.success) {
          setError(
            parsed.error.issues
              .map((issue) => `${issue.path.join(" · ")}: ${issue.message}`)
              .join(". ")
          );
          return;
        }
        setError(null);
        update.mutate(
          { personaId: persona.id, details: parsed.data },
          {
            onSuccess: () => {
              setStack([...new Set(parsed.data.profile.currentStack)]);
              setStackDraft("");
              toast.success("Persona saved");
            },
          }
        );
      }}
    >
      <fieldset
        disabled={update.isPending}
        className="min-h-0 flex-1 space-y-8 overflow-y-auto px-6 py-6"
      >
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor={`${id}-name`}>
            Name
          </label>
          <Input
            id={`${id}-name`}
            name="name"
            defaultValue={persona.name}
            maxLength={GEO_PERSONA_FIELD_MAX_LENGTH}
            required
          />
        </div>
        <section className="space-y-4">
          <h3 className="text-base font-semibold">Employment</h3>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor={`${id}-role`}>
              Job title
            </label>
            <Input
              id={`${id}-role`}
              name="role"
              defaultValue={persona.role}
              maxLength={200}
              required
              aria-describedby={`${id}-role-hint`}
            />
            <p className="text-muted-foreground text-xs" id={`${id}-role-hint`}>
              Up to two words, e.g. Marketing Lead.
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor={`${id}-company`}>
              Company profile
            </label>
            <Textarea
              id={`${id}-company`}
              name="company"
              defaultValue={persona.company}
              maxLength={200}
              required
              rows={2}
            />
          </div>
        </section>
        <section className="space-y-4">
          <h3 className="text-base font-semibold">Behavior</h3>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor={`${id}-summary`}>
              Motivations
            </label>
            <Textarea
              id={`${id}-summary`}
              name="summary"
              defaultValue={persona.summary}
              maxLength={800}
              required
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <label
              className="text-sm font-medium"
              htmlFor={`${id}-searchStyle`}
            >
              How they search
            </label>
            <Textarea
              id={`${id}-searchStyle`}
              name="searchStyle"
              defaultValue={persona.searchStyle}
              maxLength={800}
              required
              rows={3}
            />
          </div>
          {GEO_PERSONA_PROFILE_SECTIONS.map((section) => (
            <div className="space-y-2" key={section.key}>
              <label
                className="text-sm font-medium"
                htmlFor={`${id}-${section.key}`}
              >
                {section.label}
              </label>
              {section.key === "currentStack" ? (
                <div className="border-input flex flex-wrap items-center gap-1.5 rounded-lg border p-2">
                  {stack.map((tool) => (
                    <Badge
                      className="max-w-full gap-1 pr-0.5 font-normal"
                      variant="secondary"
                      key={tool}
                    >
                      <span className="min-w-0 wrap-anywhere">{tool}</span>
                      <button
                        type="button"
                        className="hover:bg-muted focus-visible:ring-ring flex size-6 shrink-0 items-center justify-center rounded-sm focus-visible:ring-2 focus-visible:outline-none"
                        aria-label={`Remove ${tool}`}
                        onClick={() => {
                          setStack((items) =>
                            items.filter((item) => item !== tool)
                          );
                          stackInput.current?.focus();
                        }}
                      >
                        <span aria-hidden="true">×</span>
                      </button>
                    </Badge>
                  ))}
                  <input
                    ref={stackInput}
                    id={`${id}-${section.key}`}
                    className="placeholder:text-muted-foreground focus-visible:ring-ring min-h-8 min-w-24 flex-1 rounded-sm bg-transparent px-1 text-base outline-none focus-visible:ring-2 md:text-sm"
                    placeholder="Add tool…"
                    maxLength={200}
                    value={stackDraft}
                    onChange={(event) => setStackDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (
                        event.key !== "Enter" ||
                        event.nativeEvent.isComposing
                      ) {
                        return;
                      }
                      event.preventDefault();
                      const tool = stackDraft.trim();
                      if (stack.includes(tool)) {
                        setStackDraft("");
                        return;
                      }
                      if (!tool) {
                        return;
                      }
                      if (stack.length >= 6) {
                        setError("Current stack can contain up to six tools.");
                        return;
                      }
                      setStack((items) => [...items, tool]);
                      setStackDraft("");
                      setError(null);
                    }}
                  />
                </div>
              ) : (
                <Textarea
                  id={`${id}-${section.key}`}
                  name={section.key}
                  defaultValue={persona.profile[section.key].join("\n")}
                  rows={3}
                />
              )}
            </div>
          ))}
        </section>
        {persona.memories.length > 0 ? (
          <details className="group/memories border-t pt-4">
            <summary className="hover:bg-muted/50 focus-visible:ring-ring -mx-2 flex cursor-pointer list-none items-center gap-2 rounded-md px-2 py-2 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
              <span>Memories</span>
              <span className="text-muted-foreground bg-muted rounded-md px-1.5 py-0.5 text-xs font-normal tabular-nums">
                {persona.memories.length}
              </span>
              <HugeiconsIcon
                icon={ArrowDown01Icon}
                size={16}
                aria-hidden="true"
                className="text-muted-foreground ml-auto -rotate-90 group-open/memories:rotate-0"
              />
            </summary>
            <div className="space-y-6 pt-4">
              {groupPersonaMemories(persona.memories).map((group) => (
                <section className="space-y-2" key={group.kind}>
                  <h4 className="text-muted-foreground text-xs font-medium">
                    {group.label}
                  </h4>
                  <ul className="bg-muted/20 divide-border/60 divide-y rounded-lg border px-3">
                    {group.memories.map((memory) => (
                      <li
                        className="py-3 text-[13px] leading-5 wrap-anywhere"
                        key={memory.id}
                      >
                        {memory.content}
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </details>
        ) : null}
      </fieldset>
      <footer className="bg-background shrink-0 space-y-3 border-t px-6 py-4">
        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={update.isPending}
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={update.isPending}>
            {update.isPending ? "Saving…" : "Save persona"}
          </Button>
        </div>
      </footer>
    </form>
  );
}
