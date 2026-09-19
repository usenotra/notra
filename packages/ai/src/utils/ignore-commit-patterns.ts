export const MAX_IGNORE_COMMIT_PATTERNS = 10;
export const MAX_IGNORE_COMMIT_PATTERN_LENGTH = 120;
export const IGNORE_COMMIT_PATTERN_FLAGS = "i";

const QUANTIFIER_BRACE_PATTERN = /\{\d/;

export function isUnsafeIgnoreCommitPattern(pattern: string): boolean {
  const groupHasQuantifier: boolean[] = [];
  const groupHasAlternation: boolean[] = [];
  let escaped = false;
  let inClass = false;

  const markQuantifier = () => {
    if (groupHasQuantifier.length > 0) {
      groupHasQuantifier[groupHasQuantifier.length - 1] = true;
    }
  };

  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index] ?? "";
    if (escaped && !inClass && char >= "1" && char <= "9") {
      return true;
    }
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (inClass) {
      inClass = char !== "]";
      continue;
    }
    if (char === "[") {
      inClass = true;
      continue;
    }
    if (char === "(") {
      const rest = pattern.slice(index + 1, index + 4);
      if (
        rest.startsWith("?=") ||
        rest.startsWith("?!") ||
        rest.startsWith("?<=") ||
        rest.startsWith("?<!")
      ) {
        return true;
      }
      if (pattern[index + 1] === "?") {
        index += 1;
      }
      groupHasQuantifier.push(false);
      groupHasAlternation.push(false);
      continue;
    }
    if (char === "|") {
      if (groupHasAlternation.length > 0) {
        groupHasAlternation[groupHasAlternation.length - 1] = true;
      }
      continue;
    }
    if (char === ")") {
      const hasInnerQuantifier = groupHasQuantifier.pop() ?? false;
      const hasInnerAlternation = groupHasAlternation.pop() ?? false;
      const next = pattern[index + 1];
      const isQuantified =
        next === "*" ||
        next === "+" ||
        next === "?" ||
        (next === "{" &&
          QUANTIFIER_BRACE_PATTERN.test(pattern.slice(index + 1, index + 3)));
      if (isQuantified && (hasInnerQuantifier || hasInnerAlternation)) {
        return true;
      }
      if (hasInnerQuantifier) {
        markQuantifier();
      }
      continue;
    }
    if (char === "*" || char === "+" || char === "?") {
      markQuantifier();
      continue;
    }
    if (
      char === "{" &&
      QUANTIFIER_BRACE_PATTERN.test(pattern.slice(index, index + 2))
    ) {
      markQuantifier();
    }
  }

  return false;
}

export const IGNORE_COMMIT_PATTERNS_SEPARATOR = ", ";

function scanTopLevelCommas(
  text: string,
  onComma: (index: number) => void
): void {
  let escaped = false;
  let inClass = false;
  let braceDepth = 0;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (inClass) {
      inClass = char !== "]";
      continue;
    }
    if (char === "[") {
      inClass = true;
    } else if (char === "{") {
      braceDepth += 1;
    } else if (char === "}") {
      braceDepth = Math.max(0, braceDepth - 1);
    } else if (char === "," && braceDepth === 0) {
      onComma(index);
    }
  }
}

export function splitIgnoreCommitPatternsText(text: string): string[] {
  const parts: string[] = [];
  let start = 0;
  scanTopLevelCommas(text, (index) => {
    parts.push(text.slice(start, index));
    start = index + 1;
  });
  parts.push(text.slice(start));
  return parts.map((part) => part.trim()).filter(Boolean);
}

export function escapeIgnoreCommitPatternCommas(pattern: string): string {
  const indices: number[] = [];
  scanTopLevelCommas(pattern, (index) => indices.push(index));
  let result = pattern;
  for (const index of indices.reverse()) {
    result = `${result.slice(0, index)}\\,${result.slice(index + 1)}`;
  }
  return result;
}

export function joinIgnoreCommitPatterns(patterns: string[]): string {
  return patterns
    .map(escapeIgnoreCommitPatternCommas)
    .join(IGNORE_COMMIT_PATTERNS_SEPARATOR);
}

export function toIgnoreCommitRegExp(pattern: string): RegExp {
  return new RegExp(pattern, IGNORE_COMMIT_PATTERN_FLAGS);
}

export function isValidIgnoreCommitPattern(pattern: string): boolean {
  try {
    toIgnoreCommitRegExp(pattern);
    return true;
  } catch {
    return false;
  }
}
