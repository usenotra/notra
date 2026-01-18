import dedent from "dedent";

interface ToolDescription {
  intro: string;
  toolName: string;
  whenToUse?: string;
  whenNotToUse?: string;
  usageNotes?: string;
}

export const toolDescription = (input: ToolDescription) => {
  const intro = input.intro ? dedent(input.intro) : undefined;
  const whenToUse = input.whenToUse ? dedent(input.whenToUse) : undefined;
  const whenNotToUse = input.whenNotToUse
    ? dedent(input.whenNotToUse)
    : undefined;
  const usageNotes = input.usageNotes ? dedent(input.usageNotes) : undefined;
  const toolName = input.toolName;

  const parts: string[] = [];

  if (intro) {
    parts.push(intro);
  }
  if (whenToUse) {
    parts.push(`**When to use the ${toolName} tool**\n${whenToUse}`);
  }
  if (whenNotToUse) {
    parts.push(`**When NOT to use the ${toolName} tool**\n${whenNotToUse}`);
  }
  if (usageNotes) {
    parts.push(`**Usage notes**\n${usageNotes}`);
  }

  return parts.join("\n\n");
};
