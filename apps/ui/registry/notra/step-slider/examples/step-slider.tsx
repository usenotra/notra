"use client";

import { useState } from "react";

import { StepSlider } from "../components/step-slider";

const PROMPT_STEPS = [5, 10, 25, 50, 100, 150, 250, 500, 1000] as const;
const THOUSAND = 1000;

const formatPrompts = (value: number) =>
  value >= THOUSAND ? `${value / THOUSAND}K` : value;

export default function StepSliderExample() {
  const [prompts, setPrompts] = useState(10);

  return (
    <div className="flex w-full max-w-3xl flex-col gap-5 p-6">
      <div className="flex items-baseline justify-between gap-6">
        <span className="text-lg font-medium">Prompts</span>
        <span className="text-4xl tabular-nums">{prompts}</span>
      </div>
      <StepSlider
        aria-label="Prompts"
        formatLabel={formatPrompts}
        getValueText={(value) => `${value} prompts`}
        majorSteps={[5, 25, 100, 250, 1000]}
        onValueChange={setPrompts}
        steps={PROMPT_STEPS}
        value={prompts}
      />
    </div>
  );
}
