/** Row errors logged per contact sync, so a bad batch cannot flood the logs. */
export const BREW_CONTACTS_LOGGED_ERROR_LIMIT = 10;

/**
 * A prune that would delete more than this share of synced contacts (and more
 * than the floor) stops instead: that smells like a wrong database, not
 * deleted accounts.
 */
export const BREW_CONTACTS_MAX_PRUNE_RATIO = 0.1;
export const BREW_CONTACTS_PRUNE_FLOOR = 5;
