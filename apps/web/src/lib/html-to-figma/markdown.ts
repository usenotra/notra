import {
  HTML_EXPORT_COPY,
  HTML_EXPORT_PLACEHOLDER,
} from "@/lib/html-to-figma/constants";
import type { HtmlExportTarget } from "@/types/html-to-figma";
import { markdownSection } from "@/utils/markdown";
import { SITE_URL } from "@/utils/urls";

export function buildHtmlExportMarkdown(target: HtmlExportTarget) {
  const { productName, buttonLabel, successMessage } = HTML_EXPORT_COPY[target];
  const otherTarget: HtmlExportTarget = target === "figma" ? "paper" : "figma";
  const otherProductName = HTML_EXPORT_COPY[otherTarget].productName;
  const extraButton =
    target === "figma"
      ? [
          `The page also has a ${HTML_EXPORT_COPY.paper.buttonLabel} button, so the same HTML can go to Paper.`,
          "",
        ]
      : [];

  return [
    `# Turn HTML into ${productName} layers`,
    "",
    `Paste any HTML and copy it as editable layers, straight into ${productName}. Conversion runs entirely in your browser, so nothing is uploaded. Free, no sign-up.`,
    "",
    markdownSection("How to use it", [
      `1. Open ${SITE_URL}/html-to-${target} in a browser.`,
      "2. Paste your HTML into the HTML tab. Switch to the Preview tab to see how it renders.",
      `3. Click ${buttonLabel}. The page confirms: "${successMessage}"`,
      `4. Paste into ${productName}. The HTML lands on the canvas as editable layers.`,
      "",
      ...extraButton,
      "Example input:",
      "",
      "```html",
      HTML_EXPORT_PLACEHOLDER,
      "```",
    ]),
    markdownSection("Notes", [
      "- Runs in your browser. Nothing is uploaded.",
      `- Not affiliated with ${productName}.`,
      "- This is an interactive tool. It has no API, so agents should hand the link to a person.",
    ]),
    markdownSection("Related", [
      `- [HTML to ${otherProductName}](${SITE_URL}/html-to-${otherTarget}.md)`,
      `- [Marketing Assets](${SITE_URL}/features/marketing/assets.md): Notra generates editable marketing visuals from merged PRs, ready to paste into Paper or Figma.`,
    ]),
  ].join("\n");
}
