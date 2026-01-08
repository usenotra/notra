"use client";

import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface AiEditInputProps {
  selectedText: string | null;
  isLoading: boolean;
  onSubmit: (instruction: string) => void;
  onClearSelection: () => void;
}

export function AiEditInput({
  selectedText,
  isLoading,
  onSubmit,
  onClearSelection,
}: AiEditInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: input dependency needed to trigger height recalculation
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) {
      return;
    }
    onSubmit(input.trim());
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 z-40 w-full max-w-2xl -translate-x-1/2 px-4">
      {selectedText && (
        <div className="mb-2 flex items-center gap-2 rounded-lg border border-border/80 bg-muted/80 px-3 py-2 backdrop-blur">
          <span className="text-muted-foreground text-xs">Selected:</span>
          <span className="flex-1 truncate text-sm">{selectedText}</span>
          <Button
            className="h-6 w-6 p-0"
            onClick={onClearSelection}
            size="sm"
            variant="ghost"
          >
            <HugeiconsIcon className="size-3" icon={Cancel01Icon} />
          </Button>
        </div>
      )}
      <form
        className="flex items-end gap-2 rounded-2xl border border-border/80 bg-background/95 p-2 shadow-lg backdrop-blur"
        onSubmit={handleSubmit}
      >
        <Textarea
          className="max-h-[200px] min-h-[40px] flex-1 resize-none border-0 bg-transparent px-2 py-2 focus-visible:ring-0"
          disabled={isLoading}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            selectedText
              ? "Describe how to edit the selected text..."
              : "Describe the changes you want to make..."
          }
          ref={textareaRef}
          rows={1}
          value={input}
        />
        <Button
          className="shrink-0 rounded-xl"
          disabled={isLoading || !input.trim()}
          type="submit"
        >
          {isLoading ? "Editing..." : "Edit"}
        </Button>
      </form>
    </div>
  );
}
