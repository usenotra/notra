"use client";

import {
  GEO_PERSONA_BRIEF_MAX_LENGTH,
  GEO_PERSONA_MAX_COUNT,
} from "@notra/geo-core/constants/geo-personas";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
} from "@notra/ui/components/shared/responsive-dialog";
import { Textarea } from "@notra/ui/components/ui/textarea";
import { useId, useState } from "react";

import { Button } from "@/components/button";
import type { PersonaAddDialogProps } from "@/types/geo-personas-ui";

export function PersonaAddDialog({
  open,
  atLimit,
  onOpenChange,
  onSubmit,
  isPending,
}: PersonaAddDialogProps) {
  const id = useId();
  const [brief, setBrief] = useState("");
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-md">
        <form
          className="flex flex-col gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!brief.trim() || isPending || atLimit) {
              return;
            }
            if (await onSubmit(brief.trim())) {
              setBrief("");
            }
          }}
        >
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Add persona</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Describe the buyer you have in mind. We’ll fill in their profile
              and memories.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium" htmlFor={id}>
              Who should this persona represent?
            </label>
            <Textarea
              id={id}
              value={brief}
              onChange={(event) => setBrief(event.target.value)}
              required
              maxLength={GEO_PERSONA_BRIEF_MAX_LENGTH}
              disabled={isPending}
              placeholder="An agency founder comparing AI visibility tools for clients, with a tight budget and little time for setup…"
              className="min-h-28"
            />
            {atLimit ? (
              <p className="text-destructive text-sm" role="alert">
                You’ve reached the {GEO_PERSONA_MAX_COUNT}-persona limit. Delete
                one to generate this persona; your description will stay here.
              </p>
            ) : null}
          </div>
          <ResponsiveDialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || atLimit}>
              {isPending ? "Starting…" : "Generate persona"}
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
