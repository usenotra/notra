"use client";

import type { GeoContentSubtype } from "@notra/ai/types/geo-writer";
import { useState } from "react";

import type {
  WriteDialogProps,
  WriteDialogSourceKind,
} from "@/types/components/geo-writer";
import { recommendedContentSubtype } from "@/utils/geo-writer";

import { useGeoPromptsDb } from "./use-geo-db";

export function useWriterPromptSelection({
  organizationId,
  open,
  initial,
}: Pick<WriteDialogProps, "organizationId" | "open" | "initial">) {
  const { prompts } = useGeoPromptsDb(organizationId, { enabled: open });
  const [topic, setTopic] = useState(initial?.topic ?? "");
  const [contentSubtype, setContentSubtype] = useState<GeoContentSubtype>(
    initial?.contentSubtype ??
      recommendedContentSubtype(initial?.topic ?? "").id
  );
  const [sourceKind, setSourceKind] = useState<WriteDialogSourceKind>(
    initial?.sourceKind ?? "manual"
  );
  const [sourceId, setSourceId] = useState(initial?.sourceId);

  const changeTopic = (value: string) => {
    setTopic(value);
    setSourceKind("manual");
    setSourceId(undefined);
  };

  const selectPrompt = (id: string) => {
    if (id === "manual") {
      setSourceKind("manual");
      setSourceId(undefined);
      return;
    }
    const prompt = prompts.find((item) => item.id === id);
    if (prompt) {
      setSourceKind("prompt");
      setSourceId(prompt.id);
      setTopic(prompt.prompt);
    }
  };

  return {
    prompts,
    topic,
    changeTopic,
    sourceKind,
    sourceId,
    selectPrompt,
    contentSubtype,
    setContentSubtype,
  };
}
