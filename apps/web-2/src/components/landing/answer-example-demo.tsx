import { GeoPromptAnswerThread } from "@notra/ui/components/geo/geo-prompt-answer-thread";
import { PromptEngineSwitcher } from "@notra/ui/components/geo/prompt-engine-switcher";
import { useState } from "react";

import {
  ANSWER_EXAMPLE_DEFAULT_ENGINE,
  ANSWER_EXAMPLE_PROMPT,
  ANSWER_EXAMPLE_RESULTS,
  ANSWER_EXAMPLE_TIMESTAMP,
} from "@/constants/landing/answer-example";
import { GEO_ENGINE_NAMES } from "@/constants/landing/geo-engines";

const SWITCHER_ITEMS = ANSWER_EXAMPLE_RESULTS.map((result) => ({
  engine: result.id,
  family: GEO_ENGINE_NAMES[result.id],
  label: GEO_ENGINE_NAMES[result.id],
  showSearchIcon: false,
}));

export function AnswerExampleDemo() {
  const [engine, setEngine] = useState<string>(ANSWER_EXAMPLE_DEFAULT_ENGINE);
  const active =
    ANSWER_EXAMPLE_RESULTS.find((result) => result.id === engine) ??
    ANSWER_EXAMPLE_RESULTS[0];

  return (
    <div className="border-border bg-background flex h-[40rem] flex-col overflow-hidden rounded-2xl border shadow-[0_0.125rem_1.4375rem_#0000001A,0_0.0625rem_0.125rem_#0000000A] dark:shadow-none">
      <div className="border-border flex shrink-0 flex-col gap-3 border-b px-6 pt-5 pb-3">
        <p className="text-xl leading-snug font-semibold text-balance">
          {ANSWER_EXAMPLE_PROMPT}
        </p>
        <PromptEngineSwitcher
          active={engine}
          items={SWITCHER_ITEMS}
          onChange={setEngine}
        />
      </div>
      {active ? (
        <GeoPromptAnswerThread
          key={active.id}
          prompt={ANSWER_EXAMPLE_PROMPT}
          result={{
            engine: active.id,
            excerpt: active.excerpt,
            mentioned: active.mentioned,
          }}
          timestamp={ANSWER_EXAMPLE_TIMESTAMP}
        />
      ) : null}
    </div>
  );
}
