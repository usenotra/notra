/*
 * A mild standard curve: strong ease-outs land almost everything in the first
 * frames (a snap), long in-outs drag. This sits between the two.
 */
const FADE_SWAP_EASE = [0.4, 0, 0.2, 1] as const;

export const FADE_SWAP_TRANSITION = { duration: 0.35, ease: FADE_SWAP_EASE };
