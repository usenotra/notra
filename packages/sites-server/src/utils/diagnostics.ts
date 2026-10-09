import type { SiteDiagnostic } from "@notra/sites-core/types/build";

export function summarizeDiagnostics(diagnostics: SiteDiagnostic[]): string {
  const errors = diagnostics.filter(
    (diagnostic) => diagnostic.severity === "error"
  );
  if (errors.length === 0) {
    return "The build failed. See the log for details.";
  }
  return errors
    .slice(0, 10)
    .map((diagnostic) => {
      const location = diagnostic.file
        ? `\`${diagnostic.file}${diagnostic.line ? `:${diagnostic.line}` : ""}\``
        : "Site";
      return `- ${location}: ${diagnostic.message.split("\n")[0]}`;
    })
    .join("\n");
}
