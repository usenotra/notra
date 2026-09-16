"use client";

import { useHotkey } from "@tanstack/react-hotkeys";
import dynamic from "next/dynamic";
import { useState } from "react";

import { CreateContentButtonGroup } from "@/components/content/create-content-button-group";
import type { ContentCreateEntry } from "@/types/analytics/studio-events";
import type { CreateContentActionsProps } from "@/types/content/create-post";

const loadCreateContentDialog = () =>
  import("@/components/content/create-content-dialog").then(
    (mod) => mod.CreateContentDialog
  );

const loadCreatePostDialog = () =>
  import("@/components/content/create-post-dialog").then(
    (mod) => mod.CreatePostDialog
  );

const CreateContentDialog = dynamic(loadCreateContentDialog, { ssr: false });
const CreatePostDialog = dynamic(loadCreatePostDialog, { ssr: false });

export function LazyCreateContentDialog({
  organizationId,
  organizationSlug,
  entry,
}: CreateContentActionsProps) {
  const [open, setOpen] = useState(false);
  const [postOpen, setPostOpen] = useState(false);
  const [openEntry, setOpenEntry] = useState<ContentCreateEntry>(entry);

  useHotkey(
    "C",
    () => {
      if (organizationId) {
        setOpenEntry("hotkey");
        setOpen(true);
      }
    },
    { conflictBehavior: "replace", enabled: !(open || postOpen) }
  );

  return (
    <>
      <CreateContentButtonGroup
        disabled={!organizationId}
        onCreateContent={() => {
          setOpenEntry(entry);
          setOpen(true);
        }}
        onCreatePost={() => setPostOpen(true)}
        onPrefetchCreateContent={() => {
          loadCreateContentDialog();
        }}
        onPrefetchCreatePost={() => {
          loadCreatePostDialog();
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
      {postOpen && (
        <CreatePostDialog
          onOpenChange={setPostOpen}
          open={postOpen}
          organizationId={organizationId}
          organizationSlug={organizationSlug}
        />
      )}
    </>
  );
}
