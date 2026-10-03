/**
 * Base UI's own defaults (600ms open, 300ms close) are tuned for link previews
 * that fetch content. Our hover cards only reveal text that is already loaded,
 * so they should feel immediate in both directions. Base UI keeps a safe
 * polygon between trigger and popup, so a short close delay is enough to reach
 * buttons inside the card.
 */
export const HOVER_CARD_DELAY_MS = 70;
export const HOVER_CARD_CLOSE_DELAY_MS = 70;
