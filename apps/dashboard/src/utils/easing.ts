/** Strong deceleration, close to the `ease-emphasized` CSS curve. */
export function easeOutQuint(progress: number): number {
  return 1 - (1 - progress) ** 5;
}
