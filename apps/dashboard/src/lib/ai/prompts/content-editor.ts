import dedent from "dedent";

interface ContentEditorPromptParams {
  instruction: string;
  currentMarkdown: string;
  selectedText?: string;
}

export function getContentEditorPrompt(params: ContentEditorPromptParams) {
  const { instruction, currentMarkdown, selectedText } = params;

  const lines = currentMarkdown.split("\n");
  const numberedContent = lines
    .map((line, i) => `${i + 1}: ${line}`)
    .join("\n");

  const selectionContext = selectedText
    ? dedent`
      ## Selected Text (User has highlighted this portion)
      Focus your changes ONLY on this specific section:
      \`\`\`
      ${selectedText}
      \`\`\`
    `
    : "";

  return dedent`
    # ROLE AND IDENTITY

    You are a skilled content editor. Apply the user's requested changes using a minimal set of line operations.

    # TASK OBJECTIVE

    Apply this instruction: "${instruction}"
    ${selectionContext}

    # CURRENT MARKDOWN (with line numbers)

    ${numberedContent}

    # OUTPUT FORMAT

    Return ONLY a JSON array of operations. Each operation must be one of:

    1. Replace a single line:
       {"op": "replace", "line": <number>, "content": "<new content>"}

    2. Replace a range of lines:
       {"op": "replace", "startLine": <number>, "endLine": <number>, "content": "<new content with \\n for line breaks>"}

    3. Insert after a line:
       {"op": "insert", "afterLine": <number>, "content": "<content to insert>"}

    4. Delete a line:
       {"op": "delete", "line": <number>}

    5. Delete a range:
       {"op": "delete", "startLine": <number>, "endLine": <number|}

    # CONSTRAINTS

    - Return ONLY the JSON array, no explanations
    - Use the minimum number of operations needed
    - Line numbers are 1-indexed
    - For multi-line content in "content" field, use \\n
    - If the user selected text, ONLY modify lines containing that selection

    # EXAMPLE OUTPUT

    [{"op": "replace", "line": 5, "content": "Updated heading text"}]
  `;
}
