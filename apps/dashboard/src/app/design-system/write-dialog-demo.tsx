"use client";

import { Button } from "@notra/ui/components/ui/button";
import { useState } from "react";

import { DesignSystemSectionHeader } from "@/components/design-system/design-system-section-header";
import { WriteDialog } from "@/components/geo/writer/write-dialog";

export function DesignSystemWriteDialogDemo() {
  const [open, setOpen] = useState(false);
  // Mount on first open so the closed dialog doesn't sync org data.
  const [mounted, setMounted] = useState(false);
  const [events, setEvents] = useState<string[]>([]);

  return (
    <section className="scroll-mt-10 space-y-6" id="write-dialog">
      <DesignSystemSectionHeader
        description="GEO writer dialog in the settings modal layout with a section nav."
        id="write-dialog"
        title="Write dialog"
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button
          data-testid="open-write-dialog"
          onClick={() => {
            setMounted(true);
            setOpen(true);
          }}
        >
          Open write dialog
        </Button>
        <span
          className="text-muted-foreground font-mono text-xs"
          data-testid="write-dialog-state"
        >
          open={String(open)} · events={events.join(",") || "none"}
        </span>
      </div>
      {mounted ? (
        <WriteDialog
          initial={null}
          onOpenChange={(next) => {
            setEvents((current) => [...current, String(next)]);
            setOpen(next);
          }}
          open={open}
          organizationId=""
          organizationSlug="design-system"
        />
      ) : null}
    </section>
  );
}
