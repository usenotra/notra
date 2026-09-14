"use client";

import { useHotkey } from "@tanstack/react-hotkeys";
import dynamic from "next/dynamic";
import { useState } from "react";

import { CreateContentButton } from "@/components/content/create-content-button";
import type { ContentCreateEntry } from "@/types/analytics/studio-events";

const loadCreateContentDialog = () =>
  import("@/components/content/create-content-dialog").then(
    (mod) => mod.CreateContentDialog
  );

const CreateContentDialog = dynamic(loadCreateContentDialog, { ssr: false });

interface LazyCreateContentDialogProps {
  organizationId: string;
  entry: ContentCreateEntry;
}

export function LazyCreateContentDialog({
  organizationId,
  entry,
}: LazyCreateContentDialogProps) {
  const [open, setOpen] = useState(false);
  const [openEntry, setOpenEntry] = useState<ContentCreateEntry>(entry);

  useHotkey(
    "C",
    () => {
      if (organizationId) {
        setOpenEntry("hotkey");
        setOpen(true);
      }
    },
    { conflictBehavior: "replace", enabled: !open }
  );

  return (
    <>
      <CreateContentButton
        disabled={!organizationId}
        onClick={() => {
          setOpenEntry(entry);
          setOpen(true);
        }}
        onFocus={() => {
          loadCreateContentDialog();
        }}
        onMouseEnter={() => {
          loadCreateContentDialog();
        }}
      />
      {open && (
        <CreateContentDialog
          entry={openEntry}
          hideTrigger
          onOpenChange={setOpen}
          open={open}
          organizationId={organizationId}
        />
      )}
    </>
  );
}
