/** Index of the step closest to `value`, so values between stops still land on one. */
export const nearestStepIndex = (steps: readonly number[], value: number) => {
  let nearest = 0;
  for (const [index, step] of steps.entries()) {
    if (Math.abs(step - value) < Math.abs((steps[nearest] ?? 0) - value)) {
      nearest = index;
    }
  }
  return nearest;
};

/** Where a stop sits along the track, from 0 to 1. */
export const stepRatio = (index: number, count: number) =>
  count > 1 ? index / (count - 1) : 0;
