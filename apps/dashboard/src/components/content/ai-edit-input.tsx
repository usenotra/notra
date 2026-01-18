"use client";

import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@notra/ui/components/ui/button";
import { Textarea } from "@notra/ui/components/ui/textarea";
import { useEffect, useRef, useState } from "react";

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

  const handleMouseDown = (e: React.MouseEvent) => {
    // Prevent clearing text selection when clicking on the chat input
    if (selectedText) {
      e.preventDefault();
      textareaRef.current?.focus();
    }
  };

  return (
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: Intentional to preserve selection
    // biome-ignore lint/a11y/noStaticElementInteractions: Intentional to preserve selection
    <div
      className="fixed inset-x-0 bottom-6 z-40 md:left-64"
      onMouseDown={handleMouseDown}
    >
      <div className="mx-auto max-w-2xl px-4 lg:px-6">
        {selectedText && (
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-primary/50 bg-primary/10 px-3 py-2 backdrop-blur">
            <span className="font-medium text-primary text-xs">Selected:</span>
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
          className="flex items-center gap-2 rounded-2xl border border-border/80 bg-background/95 p-2 shadow-lg backdrop-blur"
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
            className="h-10 shrink-0 rounded-xl"
            disabled={isLoading || !input.trim()}
            type="submit"
          >
            {isLoading ? "Editing..." : "Edit"}
          </Button>
        </form>
      </div>
    </div>
  );
}
