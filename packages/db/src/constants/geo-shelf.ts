/**
 * A bare origin such as `https://example.com/`: a brand's homepage rather than
 * a page that lists or reviews brands. Shared between the SQL `~` filter and
 * application code, so it stays a plain POSIX-compatible pattern.
 */
export const GEO_SHELF_ROOT_URL_PATTERN_SOURCE = "^https?://[^/?#]+/?$";
export const GEO_SHELF_ROOT_URL_PATTERN = new RegExp(
  GEO_SHELF_ROOT_URL_PATTERN_SOURCE
);
