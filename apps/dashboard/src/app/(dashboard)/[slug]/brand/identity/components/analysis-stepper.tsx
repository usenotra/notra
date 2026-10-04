import { MinusSignIcon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Stepper,
  StepperIndicator,
  StepperItem,
  StepperList,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from "@notra/ui/components/ui/stepper";
import { Loader2Icon } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslations } from "use-intl";

import { ANALYSIS_STEPS } from "@/constants/brand-identity";
import type { StepIconState } from "@/types/brand-identity";
import { getStepIconState, getStepperValue } from "@/utils/brand-identity";

const STEP_ICONS: Record<StepIconState, () => ReactNode> = {
  completed: () => <HugeiconsIcon className="size-4" icon={Tick02Icon} />,
  active: () => <Loader2Icon className="size-4 animate-spin" />,
  pending: () => (
    <HugeiconsIcon
      className="text-muted-foreground size-4"
      icon={MinusSignIcon}
    />
  ),
};

interface AnalysisStepperProps {
  progress: { status: string; currentStep: number };
}

export function AnalysisStepper({ progress }: AnalysisStepperProps) {
  const t = useTranslations("brand.identity.analysisSteps");
  const tCommon = useTranslations("common");
  return (
    <Stepper
      nonInteractive
      value={getStepperValue(progress.status, progress.currentStep)}
    >
      <StepperList>
        {ANALYSIS_STEPS.map(({ value: step }, index) => {
          const stepNumber = index + 1;
          const iconState = getStepIconState(progress.currentStep, stepNumber);

          return (
            <StepperItem
              completed={progress.currentStep > stepNumber}
              key={step}
              value={step}
            >
              <StepperTrigger className="gap-2 px-2">
                <StepperIndicator className="size-8">
                  {STEP_ICONS[iconState]()}
                </StepperIndicator>
                <StepperTitle className="text-sm">
                  {step === "saving" ? tCommon("labels.saving") : t(step)}
                </StepperTitle>
              </StepperTrigger>
              <StepperSeparator className="h-0.5" />
            </StepperItem>
          );
        })}
      </StepperList>
    </Stepper>
  );
}
