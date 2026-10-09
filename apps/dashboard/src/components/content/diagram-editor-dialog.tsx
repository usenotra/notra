"use client";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { PencilEdit02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@notra/ui/components/ui/dialog";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import { DIAGRAM_REVISION_HEADER } from "@/constants/diagram-editor";
import type {
  DiagramEditorDialogProps,
  DiagramEditorLoadedScene,
  DiagramEditorSaveResult,
} from "@/types/components/diagram-editor";
import lazyComponent from "@/utils/lazy-component";

// Excalidraw touches `window` at module load. Keeping it out of the server
// graph also stops the bundler from merging it into lib chunks that SSR pages
// share (DOMPurify ended up next to it and crashed every server render).
const DiagramEditorCanvas = lazyComponent(
  () =>
    import.meta.env.SSR
      ? new Promise<never>(() => undefined)
      : import("@/components/content/diagram-editor-canvas"),
  {
    loading: () => <Skeleton className="size-full rounded-lg" />,
    ssr: false,
  }
);

export function DiagramEditorDialog({
  organizationId,
  contentId,
  onSaved,
}: DiagramEditorDialogProps) {
  const t = useTranslations("content.diagramEditor");
  const [open, setOpen] = useState(false);
  // Save stays off until this session's canvas hands over its API; a ref
  // alone would still point at the previous, unmounted editor on reopen.
  const [editorReady, setEditorReady] = useState(false);
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const sceneUrl = `/api/organizations/${organizationId}/content/${contentId}/excalidraw`;

  const queryClient = useQueryClient();
  const sceneQueryKey = ["diagram-editor-scene", organizationId, contentId];

  const sceneQuery = useQuery({
    queryKey: sceneQueryKey,
    queryFn: async (): Promise<DiagramEditorLoadedScene> => {
      const response = await fetch(sceneUrl, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Failed to load diagram: ${response.status}`);
      }
      return {
        scene: await response.json(),
        revision: Number(response.headers.get(DIAGRAM_REVISION_HEADER) ?? 0),
      };
    },
    enabled: open,
    gcTime: 0,
    staleTime: 0,
    // The canvas only reads the scene on mount; a refetch mid-edit is wasted.
    refetchOnWindowFocus: false,
  });

  // Every session starts from the stored scene: a cached one would bring back
  // the drawing from before the last save or chat edit.
  const openEditor = () => {
    apiRef.current = null;
    setEditorReady(false);
    queryClient.resetQueries({ queryKey: sceneQueryKey, exact: true });
    setOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (): Promise<DiagramEditorSaveResult> => {
      const api = apiRef.current;
      const loaded = sceneQuery.data;
      if (!(api && loaded)) {
        throw new Error("Editor is not ready");
      }
      const response = await fetch(sceneUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scene: {
            elements: api.getSceneElements(),
            appState: {
              viewBackgroundColor: api.getAppState().viewBackgroundColor,
            },
          },
          revision: loaded.revision,
        }),
      });
      if (response.status === 409) {
        return { status: "conflict" };
      }
      if (response.status === 422) {
        const { error } = (await response.json()) as { error: string };
        return { status: "invalid", reason: error };
      }
      if (!response.ok) {
        throw new Error(`Failed to save diagram: ${response.status}`);
      }
      const { droppedTypes } = (await response.json()) as {
        droppedTypes: string[];
      };
      return { status: "saved", droppedTypes };
    },
    onSuccess: async (result) => {
      // Keep the editor open so the drawing is not lost.
      if (result.status === "conflict") {
        toast.error(t("conflict"));
        return;
      }
      if (result.status === "invalid") {
        toast.error(t("saveRejected", { reason: result.reason }));
        return;
      }
      const { droppedTypes } = result;
      await onSaved();
      setOpen(false);
      if (droppedTypes.length > 0) {
        toast.warning(
          t("savedWithDropped", { types: droppedTypes.join(", ") })
        );
        return;
      }
      toast.success(t("saved"));
    },
    onError: (error) => {
      console.error("Failed to save diagram", error);
      toast.error(t("saveFailed"));
    },
  });

  let editorContent = <Skeleton className="size-full rounded-lg" />;
  if (sceneQuery.data) {
    editorContent = (
      <DiagramEditorCanvas
        onReady={(api) => {
          apiRef.current = api;
          setEditorReady(true);
        }}
        scene={sceneQuery.data.scene}
      />
    );
  } else if (sceneQuery.isError) {
    editorContent = (
      <div className="text-muted-foreground flex size-full items-center justify-center">
        {t("loadFailed")}
      </div>
    );
  }

  return (
    <>
      <Button onClick={openEditor} size="sm">
        <HugeiconsIcon className="size-4" icon={PencilEdit02Icon} />
        {t("open")}
      </Button>
      {/* Escape and outside clicks belong to Excalidraw (deselect, leave text
          editing); closing on them would throw away unsaved edits. */}
      <Dialog
        disablePointerDismissal
        onOpenChange={(nextOpen, eventDetails) => {
          if (!nextOpen && eventDetails.reason === "escape-key") {
            eventDetails.allowPropagation();
            return;
          }
          setOpen(nextOpen);
        }}
        open={open}
      >
        <DialogContent className="flex h-[90svh] w-[95vw] max-w-none flex-col sm:max-w-none">
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>
          <div className="ring-foreground/10 min-h-0 flex-1 overflow-hidden rounded-lg ring-1">
            {editorContent}
            <span className="sr-only" role="status">
              {editorReady || sceneQuery.isError ? null : t("loading")}
            </span>
          </div>
          <DialogFooter>
            <Button onClick={() => setOpen(false)} variant="outline">
              {t("cancel")}
            </Button>
            <Button
              disabled={!(sceneQuery.data && editorReady)}
              loading={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              {t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
