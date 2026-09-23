"use client";

import { useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { EmptyStateTablePreview } from "@/components/empty-state-preview";
import { GeneratePersonasButton } from "@/components/geo/generate-personas-button";
import {
  EMPTY_STATE_TABLE_COLUMNS,
  EMPTY_STATE_TABLE_ROWS,
} from "@/constants/empty-state";
import {
  GEO_PERSONAS_EMPTY_DESCRIPTION,
  GEO_PERSONAS_EMPTY_TITLE,
} from "@/constants/geo-personas";
import { usePersonaGenerationProgress } from "@/lib/hooks/use-persona-generation-progress";

export default function GeoPersonasDesignSystemPage() {
  const [startedAt] = useState(() => new Date().toISOString());
  const progress = usePersonaGenerationProgress(true, startedAt);

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
