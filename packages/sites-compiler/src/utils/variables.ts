import { FRONTMATTER_BLOCK } from "../constants/frontmatter";
import {
  CODE_FENCE_CLOSE,
  CODE_FENCE_OPEN,
  VARIABLE_OR_CODE_SPAN,
  VARIABLE_REFERENCE,
  YAML_SAFE_VALUE,
} from "../constants/variables";
import type {
  SettingSubstitution,
  TextSegment,
  UnknownVariable,
  VariableSubstitution,
} from "../types/variables";

function lookup(
  variables: Readonly<Record<string, string>>,
  name: string
): string | undefined {
  return Object.hasOwn(variables, name) ? variables[name] : undefined;
}

function splitFencedCode(source: string, start: number): TextSegment[] {
  const segments: TextSegment[] = [];
  let segmentStart = start;
  let fence: string | null = null;
  let lineStart = start;
  while (lineStart < source.length) {
    const newline = source.indexOf("\n", lineStart);
    const lineEnd = newline === -1 ? source.length : newline + 1;
    const line = source.slice(lineStart, lineEnd).replace(/\r?\n$/, "");
    if (fence === null) {
      const open = CODE_FENCE_OPEN.exec(line)?.[1];
      if (open) {
        segments.push({ start: segmentStart, end: lineStart, code: false });
        segmentStart = lineStart;
        fence = open;
      }
    } else {
      const close = CODE_FENCE_CLOSE.exec(line)?.[1];
      if (close && close[0] === fence[0] && close.length >= fence.length) {
        segments.push({ start: segmentStart, end: lineEnd, code: true });
        segmentStart = lineEnd;
        fence = null;
      }
    }
    lineStart = lineEnd;
  }
  segments.push({
    start: segmentStart,
    end: source.length,
    code: fence !== null,
  });
  return segments.filter((segment) => segment.end > segment.start);
}

export function substituteVariables(
  source: string,
  variables: Readonly<Record<string, string>>
): VariableSubstitution {
  const unknown: UnknownVariable[] = [];
  const bodyStart = FRONTMATTER_BLOCK.exec(source)?.[0].length ?? 0;
  const frontmatter = substituteFrontmatter(
    source.slice(0, bodyStart),
    variables
  );
  unknown.push(...frontmatter.unknown);
  const parts = [frontmatter.text];
  for (const segment of splitFencedCode(source, bodyStart)) {
    const text = source.slice(segment.start, segment.end);
    if (segment.code || !text.includes("{{")) {
      parts.push(text);
      continue;
    }
    parts.push(
      text.replace(
        VARIABLE_OR_CODE_SPAN,
        (
          match,
          codeSpan: string | undefined,
          name: string | undefined,
          offset: number
        ) => {
          if (codeSpan !== undefined || name === undefined) {
            return match;
          }
          const value = lookup(variables, name);
          if (value !== undefined) {
            return value;
          }
          unknown.push({ name, offset: segment.start + offset });
          return match.replaceAll("{", "\\{").replaceAll("}", "\\}");
        }
      )
    );
  }
  return { text: parts.join(""), unknown };
}

function substituteFrontmatter(
  block: string,
  variables: Readonly<Record<string, string>>
): VariableSubstitution {
  const unknown: UnknownVariable[] = [];
  const text = block.replace(
    VARIABLE_REFERENCE,
    (match, name: string, offset: number) => {
      const value = lookup(variables, name);
      if (value !== undefined && YAML_SAFE_VALUE.test(value)) {
        return value;
      }
      unknown.push({ name, offset });
      return match;
    }
  );
  return { text, unknown };
}

export function substituteSettingText(
  text: string,
  variables: Readonly<Record<string, string>>
): SettingSubstitution {
  const unknown: string[] = [];
  const result = text.replace(VARIABLE_REFERENCE, (match, name: string) => {
    const value = lookup(variables, name);
    if (value === undefined) {
      unknown.push(name);
      return match;
    }
    return value;
  });
  return { text: result, unknown };
}
