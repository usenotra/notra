export const GITHUB_URL_PATTERNS = [
  /^https?:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/i,
  /^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/i,
  /^([^/]+)\/([^/]+)$/,
] as const;
export const GITHUB_PUBLISH_CONTENT_TYPES = ["changelog", "blog_post"] as const;
export const GITHUB_CONTENT_PATH_MAX_LENGTH = 1024;
export const GITHUB_PATH_INVALID_CHARACTERS_REGEX = /[?#]/;
