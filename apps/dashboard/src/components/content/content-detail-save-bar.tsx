"use client";

import { Button } from "@notra/ui/components/ui/button";

interface ContentDetailSaveBarProps {
  sidebarOffsetClass: string;
  isSaving: boolean;
  onDiscard: () => void;
  onSave: () => void;
  saveLabel?: string;
  savingLabel?: string;
}

export function ContentDetailSaveBar({
  sidebarOffsetClass,
  isSaving,
  onDiscard,
  onSave,
  saveLabel = "Save",
  savingLabel = "Saving...",
}: ContentDetailSaveBarProps) {
  return (
    <div
      className={`pointer-events-none fixed bottom-4 left-0 z-50 hidden lg:right-96 lg:block ${sidebarOffsetClass}`}
    >
      <div className="pointer-events-auto mx-auto w-full max-w-xl px-4">
        <div
          className="border-border bg-background rounded-[14px] border p-0.5 shadow-sm"
          data-save-bar
        >
          <div className="bg-background flex items-center gap-3 rounded-lg py-2 pr-2 pl-4">
            <span className="text-muted-foreground flex-1 text-sm">
              You have unsaved changes
            </span>
            <Button
              disabled={isSaving}
              onClick={onDiscard}
              size="sm"
              variant="ghost"
            >
              Discard
            </Button>
            <Button
              aria-keyshortcuts="Meta+S Control+S"
              disabled={isSaving}
              onClick={onSave}
              size="sm"
            >
              {isSaving ? savingLabel : saveLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ContentDetailSaveToastProps {
  isSaving: boolean;
  onDiscard: () => void;
  onSave: () => void;
  onDismiss: () => void;
  saveLabel?: string;
  savingLabel?: string;
}

export function ContentDetailSaveToast({
  isSaving,
  onDiscard,
  onSave,
  onDismiss,
  saveLabel = "Save",
  savingLabel = "Saving...",
}: ContentDetailSaveToastProps) {
  return (
    <div
      className="border-border bg-background rounded-[14px] border p-0.5 shadow-sm"
      data-save-bar
    >
      <div className="bg-background flex items-center gap-3 rounded-lg px-4 py-3">
        <span className="text-muted-foreground text-sm">Unsaved changes</span>
        <Button
          disabled={isSaving}
          onClick={() => {
            onDismiss();
            onDiscard();
          }}
          size="sm"
          variant="ghost"
        >
          Discard
        </Button>
        <Button
          aria-keyshortcuts="Meta+S Control+S"
          disabled={isSaving}
          onClick={() => {
            onDismiss();
            onSave();
          }}
          size="sm"
        >
          {isSaving ? savingLabel : saveLabel}
        </Button>
      </div>
    </div>
  );
}
