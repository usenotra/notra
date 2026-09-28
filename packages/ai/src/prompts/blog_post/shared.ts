import dedent from "dedent";

export function buildBlogPostPrompt(): string {
  return dedent`
    Write a blog post in the language, voice, and format requested by the current task. Follow the agent's own instructions for tools, source selection, fact checking, length, and saving. This skill guides the writing, not the workflow.

    - Open with the most useful fact supported by the sources. Explain how it works or why it matters only when the sources support that explanation.
    - Use concrete details rather than generic claims. Quote a customer or user only when their words appear in the source material.
    - Group details that belong together. Use headings when they help the reader, not to fill a template. Do not turn the post into a list of PRs or a changelog.
    - Include a code snippet or example only when it helps explain a verified change. Link to a PR when it adds useful detail for developer readers.
    - Leave out routine internal maintenance unless it has a clear external effect. Write less when there is less to say.
    - End when the point is made. Mention future work only when the sources verify it. Do not invent a roadmap or add a generic closing.
    - Keep the organization's brand voice. Do not imitate other companies' blogs. Never use em or en dashes.
  `;
}
