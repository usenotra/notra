export const TIMESTAMP_PREFIX = /^(\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?) (.*)$/;
export const ERROR_LINE =
  /\[error\]|\berror\b|\bERR!|\bbuild failed\b|✘|✖|^\s*×\s+/i;
export const LOG_STATUS_PREFIX = /^\s*[✘✖×]\s+/;
export const WARNING_LINE = /\[warn\]|\bwarn(?:ing)?\b/i;
export const SUCCESS_LINE = /[✓✔]/;
export const CONTINUATION_LINE = /^[\s│╭╰─┬┴├└┌]/;
export const LINE_BREAK = /\r?\n/;
export const NOISE_LINE = /^\s*(?:[├└│]|at\s)/;
export const TAG_PREFIX = /^(\[[\w:@/-]+\])\s?(.*)$/;
export const CLOCK = /^(\d{2}):(\d{2}):(\d{2})/;
export const SECONDS_PER_MINUTE = 60;
export const SECONDS_PER_HOUR = 3600;
export const SECONDS_PER_DAY = 86_400;
export const STACK_FRAME = /^\s+at\s/;
