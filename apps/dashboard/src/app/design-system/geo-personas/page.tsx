"use client";

import { useEffect, useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { EmptyStateTablePreview } from "@/components/empty-state-preview";
import { GeneratePersonasButton } from "@/components/geo/generate-personas-button";
import {
  EMPTY_STATE_TABLE_COLUMNS,
  EMPTY_STATE_TABLE_ROWS,
} from "@/constants/empty-state";
import {
  GEO_PERSONA_GENERATION_STEPS,
  GEO_PERSONAS_EMPTY_DESCRIPTION,
  GEO_PERSONAS_EMPTY_TITLE,
} from "@/constants/geo-personas";
import { usePersonaGenerationProgress } from "@/lib/hooks/use-persona-generation-progress";

const PREVIEW_LOOP_MS = GEO_PERSONA_GENERATION_STEPS[1]?.afterMs ?? 12_000;

export default function GeoPersonasDesignSystemPage() {
  const [startedAt, setStartedAt] = useState(() => new Date().toISOString());
  const progress = usePersonaGenerationProgress(true, startedAt);

  useEffect(() => {
    const timer = setInterval(() => {
      setStartedAt(new Date().toISOString());
    }, PREVIEW_LOOP_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="dark bg-background text-foreground min-h-screen">
      <main className="flex min-h-screen items-center justify-center p-8">
        <div className="w-full max-w-3xl">
          <EmptyState
            action={
              <GeneratePersonasButton
                hasPersonas={false}
                onClick={() => undefined}
                progress={progress}
              />
            }
            description={GEO_PERSONAS_EMPTY_DESCRIPTION}
            preview={
              <EmptyStateTablePreview
                columns={EMPTY_STATE_TABLE_COLUMNS.personas}
                rows={EMPTY_STATE_TABLE_ROWS}
              />
            }
            title={GEO_PERSONAS_EMPTY_TITLE}
          />
        </div>
      </main>
    </div>
  );
}
