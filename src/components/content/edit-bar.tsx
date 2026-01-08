"use client";

import { Button } from "@/components/ui/button";

interface EditBarProps {
  hasChanges: boolean;
  isSaving: boolean;
  onSave: () => void;
  onDiscard: () => void;
}

export function EditBar({
  hasChanges,
  isSaving,
  onSave,
  onDiscard,
}: EditBarProps) {
  if (!hasChanges) {
    return null;
  }

  return (
    <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2">
      <div className="flex items-center gap-3 rounded-full border border-border/80 bg-background/95 px-4 py-2 shadow-lg backdrop-blur">
        <span className="text-muted-foreground text-sm">Unsaved changes</span>
        <Button
          disabled={isSaving}
          onClick={onDiscard}
          size="sm"
          variant="ghost"
        >
          Discard
        </Button>
        <Button disabled={isSaving} onClick={onSave} size="sm">
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}
