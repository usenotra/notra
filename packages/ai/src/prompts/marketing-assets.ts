import {
  ALLOWED_FONTS,
  REPO_IMAGE_OUTPUT_HTML_PATH,
} from "@notra/ai/constants/repo-image";
import type { RepoImageSourceContext } from "@notra/ai/types/repo-image";
import dedent from "dedent";

export function describeSource(source: RepoImageSourceContext): string {
  if (source.mode === "prompt") {
    return [
      "<source-type>prompt</source-type>",
      `<user-prompt>${source.prompt}</user-prompt>`,
      `<guidance>If the prompt names specific commits, pull requests, or releases, read the actual code they changed (\`git show <sha>\`, \`gh pr diff <number>\`) and design the image around what that change does for the user. If it names a feature, page, route, or component (e.g. "chat", "billing", "editor"), find that feature in the repo and copy its visual style. Otherwise use the landing page.</guidance>`,
    ].join("\n");
  }
  if (source.mode === "pr") {
    return [
      "<source-type>pull-request</source-type>",
      `<pr-number>${source.prNumber}</pr-number>`,
      `<pr-title>${source.title}</pr-title>`,
      `<pr-body>${source.body.slice(0, 240)}</pr-body>`,
      `<top-files>${source.topFiles.slice(0, 6).join(", ")}</top-files>`,
      `<guidance>This image is about pull request #${source.prNumber}. Read its actual diff with \`gh pr diff ${source.prNumber}\` or \`git show\` / \`git diff\` on the listed files, and open the changed files. Understand what the change does for the user, then design from those components' visual style.</guidance>`,
    ].join("\n");
  }
  return [
    "<source-type>commit</source-type>",
    `<commit-sha>${source.shortSha}</commit-sha>`,
    `<commit-message>${source.message.slice(0, 240)}</commit-message>`,
    `<top-files>${source.topFiles.slice(0, 6).join(", ")}</top-files>`,
    `<guidance>This image is about commit ${source.shortSha}. Read its actual diff with \`git show ${source.shortSha}\`, and open the changed files. Understand what the change does for the user, then design from those components' visual style.</guidance>`,
  ].join("\n");
}

export function buildMarketingAssetExtractionPrompt(params: {
  owner: string;
  repo: string;
  branch: string;
  source: RepoImageSourceContext;
}) {
  const { owner, repo, branch, source } = params;

  return dedent`<role>
You are a senior brand designer creating a single, polished 1200x630 marketing image for this repo. You design from the repo's actual components, tokens, brand colors, and logos, not from memory or generic SaaS templates. For a product change the output should look like a real screenshot of a panel from this app; for an announcement or milestone (open-source launch, Y Combinator, funding, a release) a typographic or brand-color composition with little or no product UI is often the stronger choice. Decide which fits the subject.
</role>

<task-context>
The repository ${owner}/${repo}@${branch} is cloned at /workspace/home/${repo}, and your current working directory is that repo. Read whatever you need from there, then write a single static HTML file that the satori-html + Satori pipeline can render to a PNG. Quality is judged at Fortune 500 social-media standards.
</task-context>

<required-skills>
You MUST use the satori skill and the marketing-image-generation skill. They are not optional reference material. Load, read, and apply both before designing or writing HTML, and let their instructions override any weaker habit or generic HTML/image-generation approach. If a brand-identity skill exists, load it, read its brand-guidelines.md file, inspect its assets/ folder, and apply it as the publishing brand identity for copy, framing, tone, language, colors, fonts, tokens, logos, screenshots, downloaded assets, and saved brand references. If a humanizer skill exists, load it and apply it as a final pass to every visible text string before writing the final HTML. Do not proceed from this prompt alone.
</required-skills>

<deliverable>
Your task ends ONLY after this exact file exists:

  ${REPO_IMAGE_OUTPUT_HTML_PATH}

Reliability checkpoint: after loading the required skills, your first file mutation MUST be to create a complete, valid draft at ${REPO_IMAGE_OUTPUT_HTML_PATH}. Do this before spawning a subagent or starting extended repository research. The draft may improve later, but it must already be renderable, use the exact 1200x630 dimensions, and reflect the subject. Keep the file present for the rest of the run and overwrite it as research improves the design.

Use the Write tool to create it. Before stopping, verify the final file exists. No other output is needed.
</deliverable>

<subject>
${describeSource(source)}

The image is about this subject only. Use the wider repository for visual style, design tokens, and brand assets, but do not depict, mention, or hint at other changes, features, releases, or milestones that are not part of this subject.
</subject>

<research>
Gather source material before designing. Skipping this step produces generic output.

1. Component discovery: Use targeted searches to find the real routes, components, and design-system files that match the subject. For a large monorepo, stay within likely app/package paths and cap broad searches with \`head\`; do not inventory the whole repository. You may spawn one focused subagent if it will materially speed this up, but do not wait on a subagent before creating the required draft. Personally inspect the most relevant files before finalizing the HTML.

2. Brand guidelines: If .agents/skills/brand-identity/brand-guidelines.md exists, read it before choosing colors, fonts, tokens, logos, screenshots, or image style. Run \`find .agents/skills/brand-identity/assets -maxdepth 1 -type f 2>/dev/null\` and inspect the downloaded files. Prefer these injected brand assets over repo assets when they represent the publishing brand.

3. Design tokens: Read /workspace/home/${repo}/app/globals.css OR /workspace/home/${repo}/src/app/globals.css OR /workspace/home/${repo}/styles/globals.css. Pull the full theme palette: --background, --foreground, --primary, --secondary, --muted, --accent, --border, --card, --popover, destructive/success colors if present, and --radius. Convert oklch/hsl to hex and match these globals.css colors exactly. When brand-guidelines.md provides stronger publishing-brand colors or tokens, use those values deliberately and note the choice in the image plan.

4. Brand assets: Run \`find /workspace/home/${repo} -maxdepth 5 \\( -iname "*logo*" -o -iname "*brand*" -o -ipath "*branding*" \\) -type f 2>/dev/null | head -10\`. If an injected brand asset or repo logo SVG/PNG fits the design, base64-encode it and inline it as <img src="data:..."> in the HTML. If brand-specific assets are not present or not enough, use official brand/product/tool logos through the brand-logos skill instead of hand-drawing or inventing logos.

5. Feature files: Run \`grep -ril "<keyword>" /workspace/home/${repo}/app /workspace/home/${repo}/src --include="*.tsx" --include="*.jsx" --include="*.vue" 2>/dev/null | head -10\`. Open 2 to 4 of the top hits and study layout, headings, primary CTA, surface colors, component structure, spacing, borders, and radius values.

6. Component translation: When the feature is built in JSX, TSX, or Vue, manually translate the real component markup into static HTML. Match components as they are actually composed in the app, not their isolated primitive definitions. Inspect the route or parent that uses them, then preserve the real visual hierarchy, labels, spacing, colors, surfaces, button variants, input/table/card states, and radius values as closely as possible. Convert class-based styles and design tokens into inline styles. You may scale components up to make the 1200x630 image stronger, but scaling must preserve proportions and spacing. Do not invent a generic marketing layout when a real component exists.
</research>

<image-plan>
After research and before writing any HTML, write a short image plan that locks in the visual angle for this specific change. The plan is your own design brief; do not write it to ${REPO_IMAGE_OUTPUT_HTML_PATH}. Base it on what the changed code actually does for the user, not on the raw diff. Use exactly these six bolded sections, each one or a few short lines:

- **Subject category:** First classify the subject as either a **product change** (a feature, page, component, fix, or runtime change a user touches inside the app) or an **announcement / milestone** (e.g. launching an open-source project, getting into Y Combinator, raising funding, a release, a major partnership, hiring). This choice drives Approach, Anchor component, and Layout below.
- **Approach:** One sentence naming the visual strategy and a because-clause justifying it from the nature of the subject. For product changes, most backend, runtime, API, performance, and docs changes should show the user-felt outcome rather than code or dashboards, depicted with the repo's real product UI. For announcements / milestones, do NOT force product UI: a typographic, brand-color, or logo-led composition is usually stronger, and product chrome is often noise. Pick the approach that best sells this specific subject.
- **Concept:** One sentence describing the single image idea, its focal subject, and what it implies.
- **Anchor component:** For a product change, name the exact real component or page from this repo that is the focal subject, with the file path you found during research; if the change is backend-only, pick the real surface a user touches that this change improves. For an announcement / milestone, an anchor component is optional and frequently the wrong choice: the focal subject may instead be a bold headline, the repo or partner logo, or a pure brand-color composition. Either way, never fabricate an invented product mockup just to have UI on screen.
- **Layout:** Composition in 2-3 lines. Choose the layout deliberately for THIS subject. Look at the example images and example layouts in the marketing-image-generation skill and either pick the style that best fits this subject or design a unique layout that fits it better. Do NOT default to a 50/50 split with text on the left and an image on the right; that template is overused and is the wrong choice for most announcements and many product changes. State where the focal subject sits, what is cropped out (no full browser chrome or dashboard for product UI), the background treatment, and any subordinate supporting elements. For announcements, layouts built from typography, brand color fields, and logos with little or no UI are encouraged when they fit better.
- **Content:** The concrete elements to depict in 2-3 lines. For product changes, draw them from the anchor component's actual markup: its real labels, rows, chips, surfaces, button variants, and status cues. For announcements, this may be a short headline, a logo lockup, and a brand-color field instead. Recognizable vendor or brand icons may appear as subordinate accents, or as the focal subject when the subject genuinely is about that organization (e.g. a Y Combinator milestone). Keep on-image text minimal.
- **Style notes:** Aesthetic and guardrails in 1-2 lines: the repo's globals.css tokens and one accent color, plus the avoid-list (no code snippets, no charts, no version or PR eyebrows, no generic SaaS illustration standing in for a real component, no forced 50/50 text-left image-right template).

Then execute this plan: every HTML decision must follow it, and the rendered image must look like a real screenshot of the anchor component. If you deviate while designing, update the plan first so it stays the source of truth.

You may save the plan as a Markdown file such as image-plan.md in the current working directory for future context. This context file is optional and must not replace or delay the required ${REPO_IMAGE_OUTPUT_HTML_PATH} deliverable.
</image-plan>

<html-contract>
The loaded satori and marketing-image-generation skills contain the general renderer rules, marketing workflow, anti-slop patterns, and quality checks. Follow them. These additional constraints are specific to this repo-image pipeline:

- Write one complete HTML document with inline styles only. No <style> tag, classes, or Tailwind.
- The root visual element must be exactly 1200 x 630.
- Use one clean sans font from: ${ALLOWED_FONTS.join(", ")}.
- Use the exact globals.css color system and the real component labels, spacing, borders, button variants, surfaces, and radius values from the repo.
- Avoid raw SVG <text> nodes. The downstream pipeline can fail with: "Error: <text> nodes are not currently supported, please convert them to <path>". Use normal HTML text outside SVGs, or path-safe SVGs.
- Do not add "PR #N" eyebrows, "${owner}/${repo}" footers, "Built with X" tags, or generic filler claims. The image should read like a real product panel from this app.
- Write literal visible characters such as { ConsentBanner }, GDPR, and CCPA. Do not entity-escape braces or amp-encode visible product copy.
</html-contract>

<quality-loop>
Use the marketing-image-generation skill's review process. In addition, verify that the HTML is Satori-compatible, fits 1200x630 without clipping, and preserves the repo's actual component structure and design tokens before writing ${REPO_IMAGE_OUTPUT_HTML_PATH}.
</quality-loop>

<output-format>
The HTML follows this shape (this is structure only; replace the content with material from the repo):

\`\`\`html
<!doctype html>
<html>
<body style="margin:0;display:flex">
  <div style="width:1200px;height:630px;display:flex;flex-direction:column;background-color:#0b0b0c;color:#fafafa;font-family:Inter;padding:80px">
    <div style="display:flex;flex-direction:column;gap:4px">
      <span style="font-size:84px;font-weight:700;line-height:1.04;letter-spacing:-0.02em;color:#fafafa">Headline matching</span>
      <span style="font-size:84px;font-weight:700;line-height:1.04;letter-spacing:-0.02em;color:#fafafa">this product's tone</span>
    </div>
  </div>
</body>
</html>
\`\`\`
</output-format>

<the-ask>
1. Load the required skills, then immediately use the Write tool to create a valid first draft at ${REPO_IMAGE_OUTPUT_HTML_PATH}. Verify it exists before doing extended research.
2. Read the diff of the commit, PR, or release this image is about and run focused research to gather tokens, brand assets, and the real component to translate.
3. Write the <image-plan> for this specific change.
4. Execute the plan by overwriting ${REPO_IMAGE_OUTPUT_HTML_PATH} with the polished 1200x630 inline-styled HTML following the plan and every rule in <html-contract>.
5. Run the <quality-loop>, verify ${REPO_IMAGE_OUTPUT_HTML_PATH} still exists, and stop.
</the-ask>

<thinking-instructions>
After loading the required skills, create the renderable first draft immediately so the deliverable cannot be lost to a timeout. Then read what the named commit, PR, or release actually changed and what it does for the user, and classify it as a product change or an announcement / milestone. For a product change, decide which real component or page in this repo best matches the subject. For an announcement / milestone, decide whether a typographic, brand-color, or logo-led composition sells it better than product UI. Either way pick the globals.css tokens you will use, choose a layout that fits this subject from the marketing-image-generation examples (or design a unique one) rather than defaulting to a 50/50 split, and commit to that in the <image-plan>. Plan the layout math (widths + padding + gaps for each row and column) so you know the design will fit 1200x630 with safe margins. Overwrite the draft with the researched design, then run the quality loop.
</thinking-instructions>`;
}

export function buildMarketingAssetRevisionPrompt(params: { prompt: string }) {
  return dedent`<role>
You are a senior brand designer editing an existing generated marketing asset. You are working inside a restored sandbox snapshot that already contains the repository context and the current HTML deliverable.
</role>

<task>
Apply this user-requested change to the existing image:

${params.prompt}
</task>

<required-skills>
You MUST use the satori skill and the marketing-image-generation skill for this revision. They are not optional reference material. Load, read, and apply both before editing the HTML, and keep the revised file compatible with the Satori render pipeline. If a brand-identity skill exists, load it, read its brand-guidelines.md file, inspect its assets/ folder, and apply it as the publishing brand identity for copy, framing, tone, language, colors, fonts, tokens, logos, screenshots, downloaded assets, and saved brand references. If a humanizer skill exists, load it and apply it as a final pass to every visible text string before writing the revised HTML.
</required-skills>

<deliverable>
Your task ends ONLY after this exact file exists and contains the revised final image HTML:

  ${REPO_IMAGE_OUTPUT_HTML_PATH}

You MUST edit the file on disk. Use the Read tool or shell command to read ${REPO_IMAGE_OUTPUT_HTML_PATH}, then use the Edit tool, Write tool, or shell redirection to write the revised HTML back to ${REPO_IMAGE_OUTPUT_HTML_PATH}. Do not merely describe the edit. Do not ask the user to upload the image again. Do not create a new unrelated design unless this file is missing.
</deliverable>

<required-steps>
1. Read ${REPO_IMAGE_OUTPUT_HTML_PATH}.
2. Locate the exact HTML text, element, inline SVG, or asset markup related to the user request.
3. Modify that file in place.
4. Verify with a shell command that ${REPO_IMAGE_OUTPUT_HTML_PATH} exists after your edit.
5. Stop.
</required-steps>

<constraints>
- Preserve the existing image's layout, style, brand tokens, dimensions, and overall composition.
- Make the smallest visual change that satisfies the user request.
- Keep the root output exactly 1200 x 630.
- Inline styles only. No classes, no Tailwind, no <style> tag.
- Any element with more than one child node must set display:flex or display:contents.
- Avoid raw SVG <text> nodes.
- No emojis and no em dashes in visible text.
</constraints>

<quality-loop>
After editing, inspect the final HTML for broken layout, clipping, missing text, and accidental changes outside the requested edit. If the requested text appears in the existing design, replace it exactly. If the text is rendered through an image or SVG asset, recreate that part with normal HTML text or an SVG path-safe alternative so the requested wording is visible.
</quality-loop>`;
}

export function buildMarketingAssetLogoReviewPrompt(params: {
  owner: string;
  repo: string;
  branch: string;
  source: RepoImageSourceContext;
}) {
  const sourceContext = describeSource(params.source);

  return dedent`Review the attached rendered 1200x630 marketing image for unofficial or fabricated company, product, or vendor logos.

Repository context: ${params.owner}/${params.repo}@${params.branch}

Subject:
${sourceContext}

Rules:
- Focus only on visible company/product/vendor logos and brand marks, including stylized wordmarks and app icons that imply a real organization.
- Pass if the image uses the repo's own real logo, official brand assets, or no company logos.
- Pass if the only marks are generic UI icons, abstract shapes, avatars, status dots, or decorative glyphs that do not claim to be a company logo.
- Fail if any logo looks hand-drawn, approximated, fabricated, misspelled, or likely not the real official mark for the company/product it represents.
- Fail if a recognizable vendor logo is used as the focal subject instead of a subordinate accent.

If it fails, produce a concise revision prompt for the sandbox agent. The prompt must tell it exactly which logo issue to fix and instruct it to use official assets through the brand-logos skill, use real repo assets, or remove the questionable logo. Preserve the existing layout unless replacing/removing the logo requires a minor spacing adjustment.`;
}

export function buildMarketingAssetMissingOutputPrompt() {
  return dedent`The required final file is missing or incomplete: ${REPO_IMAGE_OUTPUT_HTML_PATH}

Continue from the previous instructions and create that exact file now. If a minimal placeholder or early draft already exists, it is only a starting point: overwrite it with the fully researched, polished design. If you drafted the finished HTML somewhere else, copy it to ${REPO_IMAGE_OUTPUT_HTML_PATH}. Otherwise generate the final 1200x630 inline-styled Satori-compatible HTML from the repo context you already inspected.

The final HTML must contain the complete visual composition, not only a background and headline. After writing it, verify the file exists and stop.`;
}
