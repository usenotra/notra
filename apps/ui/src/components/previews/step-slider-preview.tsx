import { StepSlider } from "../../../registry/notra/step-slider/components/step-slider";

const PREVIEW_STEPS = [5, 10, 25, 50, 100] as const;
const PREVIEW_VALUE = 25;

export default function StepSliderPreview() {
  return (
    <div className="flex w-full max-w-xs flex-col gap-4 self-center px-6 pb-6">
      <div className="flex items-baseline justify-between gap-6">
        <span className="text-sm font-medium">Prompts</span>
        <span className="text-2xl tabular-nums">{PREVIEW_VALUE}</span>
      </div>
      <StepSlider
        aria-label="Prompts"
        steps={PREVIEW_STEPS}
        value={PREVIEW_VALUE}
      />
    </div>
  );
}
