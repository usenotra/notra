export function redactBuildLog(
  log: string,
  secrets: readonly string[] = []
): string {
  return secrets
    .reduce(
      (text, secret) => (secret ? text.replaceAll(secret, "[REDACTED]") : text),
      log
    )
    .replace(/\b([a-z][a-z\d+.-]{0,31}:\/\/)[^/\s@]+@/gi, "$1[REDACTED]@")
    .replace(/\b(Bearer|Basic)\s+[^\s"'<>]+/gi, "$1 [REDACTED]")
    .replace(
      /((?:authorization|x-box-api-key|api[_-]?key|(?:access|refresh|id)[_-]?token|token|password|secret|cookie)["']?\s*[=:]\s*)(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi,
      "$1[REDACTED]"
    );
}
