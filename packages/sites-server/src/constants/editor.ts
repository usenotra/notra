export const MAX_DRAFT_BYTES = 512 * 1024;
export const EDITABLE_TEXT_FILE = /\.(?:mdx?|jsx?|json|css)$/i;
export const EDITABLE_PATH_SEGMENT = /^[A-Za-z0-9._@()+ -]+$/;
export const VALIDATED_SOURCE_FILE = /\.jsx?$/i;
export const SITE_EDIT_BRANCH_PREFIX = "notra/site-edit-";
export const MAX_PUBLISH_HEADLINE_LENGTH = 200;
export const DEFAULT_PUBLISH_HEADLINE = "Update site content";
export const PULL_REQUEST_RULE_TYPES: ReadonlySet<string> = new Set([
  "pull_request",
  "required_status_checks",
  "non_fast_forward",
  "update",
]);
