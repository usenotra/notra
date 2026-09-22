"use client";

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
import type { PersonaGenerationProgress } from "@/types/geo-personas-ui";

const WRITING_MEMORIES_PROGRESS: PersonaGenerationProgress = {
  step: 3,
  total: 4,
  label: "Writing memories",
  fill: 0.82,
};

export default function GeoPersonasDesignSystemPage() {
  return (
    <div className="dark bg-background min-h-screen">
      <main className="flex min-h-screen items-center justify-center p-8">
        <div className="w-full max-w-3xl">
          <EmptyState
            action={
              <GeneratePersonasButton
                hasPersonas={false}
                onClick={() => undefined}
                progress={WRITING_MEMORIES_PROGRESS}
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
