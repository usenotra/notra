"use client";

import { ConfirmDialog } from "@notra/ui/components/shared/confirm-dialog";
import { Card, CardContent } from "@notra/ui/components/ui/card";
import { useState } from "react";

import { Button } from "@/components/button";
import { DesignSystemSectionHeader } from "@/components/design-system/design-system-section-header";

const FAKE_REQUEST_MS = 1500;

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function DefaultConfirmDemo() {
  const [open, setOpen] = useState(false);

  return (
    <ConfirmDialog
      confirmLabel="Publish"
      description="The post goes live on your changelog and subscribers get an email."
      onConfirm={() => setOpen(false)}
      onOpenChange={setOpen}
      open={open}
      title="Publish this post?"
      trigger={<Button variant="outline">Publish post</Button>}
    />
  );
}

function DestructiveConfirmDemo() {
  const [open, setOpen] = useState(false);

  return (
    <ConfirmDialog
      confirmLabel="Delete"
      description="This permanently deletes the Weekly changelog automation and its run history."
      onConfirm={() => setOpen(false)}
      onOpenChange={setOpen}
      open={open}
      title="Delete automation?"
      trigger={<Button variant="destructive">Delete automation</Button>}
      variant="destructive"
    />
  );
}

function AsyncConfirmDemo() {
  const [open, setOpen] = useState(false);

  return (
    <ConfirmDialog
      confirmLabel="Remove"
      description="Remove Ada Lovelace from Acme? She loses access right away."
      onConfirm={async () => {
        await wait(FAKE_REQUEST_MS);
        setOpen(false);
      }}
      onOpenChange={setOpen}
      open={open}
      title="Remove member?"
      trigger={<Button variant="outline">Remove member</Button>}
      variant="destructive"
    />
  );
}

export function ConfirmDialogSection() {
  return (
    <section className="scroll-mt-10 space-y-6" id="confirm-dialog">
      <DesignSystemSectionHeader
        description="Shared confirm step from @notra/ui. Becomes a bottom sheet on mobile. Return a promise from onConfirm and the button shows dots until it settles; the dialog can't be dismissed meanwhile."
        id="confirm-dialog"
        title="Confirm Dialog"
      />
      <Card>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="space-y-3">
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                Default
              </p>
              <DefaultConfirmDemo />
            </div>
            <div className="space-y-3">
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                Destructive
              </p>
              <DestructiveConfirmDemo />
            </div>
            <div className="space-y-3">
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                Async (1.5 s)
              </p>
              <AsyncConfirmDemo />
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
