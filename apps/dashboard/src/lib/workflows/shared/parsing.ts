import {
  type LookbackWindow,
  triggerTargetsSchema,
} from "@notra/schemas/dashboard/integrations";
import {
  nullableTriggerOutputConfigSchema,
  workflowLookbackWindowSchema,
} from "@notra/schemas/dashboard/workflows";

import { DEFAULT_LOOKBACK_WINDOW } from "@/constants/workflows";

export function parseLookbackWindow(value: unknown): LookbackWindow {
  const parsedLookbackWindow = workflowLookbackWindowSchema.safeParse(value);
  return parsedLookbackWindow.success
    ? parsedLookbackWindow.data
    : DEFAULT_LOOKBACK_WINDOW;
}

export function parseTriggerTargets(value: unknown) {
  const parsedTargets = triggerTargetsSchema.safeParse(value);
  return parsedTargets.success ? parsedTargets.data : null;
}

export function parseTriggerOutputConfig(value: unknown) {
  const parsedOutputConfig = nullableTriggerOutputConfigSchema.safeParse(value);
  return parsedOutputConfig.success ? parsedOutputConfig.data : null;
}
