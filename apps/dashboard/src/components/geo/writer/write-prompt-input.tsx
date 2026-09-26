"use client";

import { GEO_WRITER_TOPIC_MAX_LENGTH } from "@notra/geo-core/constants/geo";
import { Badge } from "@notra/ui/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@notra/ui/components/ui/select";
import { Textarea } from "@notra/ui/components/ui/textarea";
import { cn } from "@notra/ui/lib/utils";

import { GEO_WRITE_EDIT_NOTE } from "@/constants/geo-writer";
import type { WritePromptInputProps } from "@/types/components/geo-writer";

export function WritePromptInput({
  topicId,
  topic,
  prompts,
  sourceKind,
  sourceId,
  badgeLabel,
  onTopicChange,
  onPromptSelect,
  children,
}: WritePromptInputProps) {
  const isTracked = sourceKind === "prompt" || sourceKind === "gap";
  const selectedPrompt = isTracked
    ? prompts.find((item) => item.id === sourceId)
    : undefined;

  return (
    <section className="scroll-mt-2 space-y-4 px-6 py-6" data-section="prompt">
      <div className="flex flex-wrap items-start justify-between gap-2">
        {children}
        {badgeLabel ? (
          <Badge className="shrink-0 font-normal" variant="outline">
            {badgeLabel}
          </Badge>
        ) : null}
      </div>
      {prompts.length > 0 ? (
        <Select
          onValueChange={(value) => {
            if (value) {
              onPromptSelect(value);
            }
          }}
          value={selectedPrompt?.id ?? "manual"}
        >
          <SelectTrigger aria-label="Tracked prompt" className="h-10 w-full">
            <SelectValue>
              <span
                className={cn(
                  "truncate",
                  !selectedPrompt && "text-muted-foreground"
                )}
              >
                {selectedPrompt?.prompt ?? "Write a custom prompt"}
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            <SelectItem value="manual">Write a custom prompt</SelectItem>
            {prompts.map((prompt) => (
              <SelectItem key={prompt.id} value={prompt.id}>
                <span className="line-clamp-2 whitespace-normal">
                  {prompt.prompt}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
      <Textarea
        className="min-h-24"
        id={topicId}
        maxLength={GEO_WRITER_TOPIC_MAX_LENGTH}
        onChange={(event) => onTopicChange(event.target.value)}
        placeholder="e.g. Which tools are best for sharing music demos?"
        value={topic}
      />
      {sourceId && isTracked ? (
        <p className="text-muted-foreground text-xs">{GEO_WRITE_EDIT_NOTE}</p>
      ) : null}
    </section>
  );
}
