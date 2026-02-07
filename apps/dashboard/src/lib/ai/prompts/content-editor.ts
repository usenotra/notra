import dedent from "dedent";

interface TextSelection {
  text: string;
  startLine: number;
  startChar: number;
  endLine: number;
  endChar: number;
}

interface ContentEditorChatPromptParams {
  selection?: TextSelection;
  repoContext?: { owner: string; repo: string }[];
  toolDescriptions?: string[];
  hasGitHubEnabled?: boolean;
}

export function getContentEditorChatPrompt(
  params: ContentEditorChatPromptParams
) {
  const { selection, repoContext, toolDescriptions, hasGitHubEnabled } = params;

  const selectionContext = selection
    ? `\n\n## User Selection\nThe user selected lines ${selection.startLine}:${selection.startChar}–${selection.endLine}:${selection.endChar}:\n"""\n${selection.text}\n"""\nCONSTRAINT: Edit only within lines ${selection.startLine}–${selection.endLine}.`
    : "";

  const capabilitiesSection = toolDescriptions?.length
    ? `\n\n## Available Capabilities\n${toolDescriptions.map((d) => `- ${d}`).join("\n")}`
    : "";

  const githubSection =
    hasGitHubEnabled && repoContext?.length
      ? `\n\n## GitHub Repositories\nThe user has added the following GitHub repositories as context:\n${repoContext.map((c) => `- ${c.owner}/${c.repo}`).join("\n")}\n\nWhen working with GitHub data, use the available GitHub tools to fetch PRs, releases, or commits.`
      : "";

  return dedent`
    You are a content editor assistant. Help users edit their markdown documents.

    ## Workflow
    1. If the user asks for edits, ALWAYS call getMarkdown first
    2. Apply edits with editMarkdown (work from bottom to top)

    ## Edit Operations
    - replaceLine: { op: "replaceLine", line: number, content: string }
    - replaceRange: { op: "replaceRange", startLine: number, endLine: number, content: string }
    - insert: { op: "insert", afterLine: number, content: string }
    - deleteLine: { op: "deleteLine", line: number }
    - deleteRange: { op: "deleteRange", startLine: number, endLine: number }

    ## Guidelines
    - Make minimal edits
    - Line numbers are 1-indexed
    - For multi-line content use \\n in content string
    - When user selects text, focus only on that section
    - IMPORTANT: When the user requests edits, you MUST use the editMarkdown tool (no plain-text rewrites)
    - IMPORTANT: Do NOT output the content of your edits in text. Only use the editMarkdown tool. Keep text responses brief - just explain what you're doing, not the actual content.
    ${capabilitiesSection}${githubSection}${selectionContext}
  `;
}
