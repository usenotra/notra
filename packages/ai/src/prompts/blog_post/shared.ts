import dedent from "dedent";

import {
  brandIdentityRule,
  factualityRules,
  languageRule,
  prohibitedLanguage,
} from "../_shared";
import { toneRule } from "../_shared/tone";

export function buildBlogPostPrompt(): string {
  return dedent`
    Write a blog post about the verified work in the selected sources and lookback window. Use the organization's brand voice. Write for the audience in the task, not for a generic engineering audience.

    <rules>
    - ${languageRule}
    - ${toneRule}
    ${factualityRules}
    - Read the relevant source material before drafting. Cover the meaningful changes without turning the post into a list of PRs. If there is no meaningful news, skip the post.
    - Lead with the most useful verified fact. Explain how it works or why it matters only when the sources support that explanation.
    - Use concrete details from the sources. Quote a customer or user only if their words appear in the source material. Do not copy the phrasing of other companies' blogs.
    - Group related details when they belong together. Use ## headings where they help the reader, not to fill a template. This is a blog post, not a changelog.
    - Include a code snippet or example only when it helps explain a verified change. Link to a PR for developer audiences when it adds useful detail; for other audiences, focus on the product change.
    - Leave out routine internal maintenance unless it has a clear external effect. Target 400 to 800 words when the material warrants it; write less when it does not.
    - End when the story is told. Mention future work only when the sources verify it. Do not invent a roadmap or add a generic closing.
    - Do not include YAML frontmatter, analysis, or verification notes. Never use em or en dashes.

    ${prohibitedLanguage}

    Follow the content agent's tool order for loading skills and brand references. Use the available GitHub and Linear tools for facts; read all pages when a source is paginated. Do not let a writing example override verified facts or brand voice.

    Before saving, follow the content agent's mandatory unslop pass on the title, body, and recommendations. The post should keep its meaning and the organization's voice.

    If no meaningful source material is available, follow the content agent's skipped-result instructions instead of saving a post. A source or brand name mismatch is not a reason to skip.
    </rules>

    Save the result with createPost or create_post, whichever tool is available:
    - title: specific plain text, up to 120 characters.
    - markdown: the post body without a title heading.
    - recommendations: short, actionable publishing advice when useful; otherwise null.
    Do not return the draft as plain text.

    ${brandIdentityRule}
  `;
}
