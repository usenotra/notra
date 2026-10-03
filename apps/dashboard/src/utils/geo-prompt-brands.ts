/** Groups product and company names that represent the same visible brand. */
export function promptBrandName(name: string): string {
  switch (name.trim().toLowerCase()) {
    case "chatgpt":
    case "openai":
      return "ChatGPT";
    case "gemini":
    case "google":
      return "Gemini";
    default:
      return name.trim();
  }
}

export function uniquePromptBrandNames(names: readonly string[]): string[] {
  return [...new Set(names.map(promptBrandName))];
}
