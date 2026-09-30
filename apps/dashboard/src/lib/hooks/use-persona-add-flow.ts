"use client";

import { GEO_PERSONA_MAX_COUNT } from "@notra/geo-core/constants/geo-personas";
import type { GeoPersona } from "@notra/geo-core/types/geo-personas";
import { useState } from "react";

import { useGeoPersonasGenerate } from "@/lib/hooks/use-geo-personas";
import { usePersonaGenerationProgress } from "@/lib/hooks/use-persona-generation-progress";

export function usePersonaAddFlow(
  organizationId: string,
  personas: GeoPersona[]
) {
  const generatePersonas = useGeoPersonasGenerate(organizationId);
  const [addOpen, setAddOpen] = useState(false);
  const [autoOpenBaseline, setAutoOpenBaseline] = useState<Set<string> | null>(
    null
  );
  const hasPersonas = personas.length > 0;
  const atPersonaLimit = personas.length >= GEO_PERSONA_MAX_COUNT;
  const progress = usePersonaGenerationProgress(
    generatePersonas.isPending,
    generatePersonas.startedAt
  );
  const autoOpenPersona =
    generatePersonas.generationStatus === "completed" && autoOpenBaseline
      ? personas.find((persona) => !autoOpenBaseline.has(persona.id))
      : undefined;
  const isAddingPersona = Boolean(
    autoOpenBaseline &&
    !autoOpenPersona &&
    generatePersonas.generationStatus !== "failed"
  );

  const onGenerateClick = () => {
    if (hasPersonas) {
      setAddOpen(true);
      return;
    }
    generatePersonas.mutate();
  };

  const submitPersona = async (brief: string) => {
    setAutoOpenBaseline(new Set(personas.map((persona) => persona.id)));
    try {
      await generatePersonas.mutateAsync({ brief });
      setAddOpen(false);
      return true;
    } catch {
      setAutoOpenBaseline(null);
      return false;
    }
  };

  return {
    addOpen,
    atPersonaLimit,
    autoOpenPersonaId: autoOpenPersona?.id,
    clearAutoOpenPersona: () => setAutoOpenBaseline(null),
    hasPersonas,
    isAddingPersona,
    isGenerating: generatePersonas.isPending,
    onGenerateClick,
    progress,
    setAddOpen,
    submitPersona,
  };
}
