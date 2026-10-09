import { AI_ASSISTANTS } from "../constants/ai-assistants";
import {
  CONTEXTUAL_PLACEHOLDER,
  EXTERNAL_HREF,
  SAFE_CUSTOM_HREF,
} from "../constants/contextual";
import type {
  ContextualActions,
  ContextualMenuItem,
  ContextualPage,
} from "../types/ai-assistants";
import { lucideIcon } from "../utils/icons";
import { absoluteUrl, config } from "./params";

function fillTemplate(
  template: string,
  values: Record<string, string>
): string {
  return template.replace(
    CONTEXTUAL_PLACEHOLDER,
    (_, key: string, offset: number) => {
      const value = values[key] ?? "";
      return offset === 0 ? value : encodeURIComponent(value);
    }
  );
}

export function contextualActions(page: ContextualPage): ContextualActions {
  if (config.contextual.display === "none") {
    return { copy: false, menu: [] };
  }
  const prompt = encodeURIComponent(
    `Read the article "${page.title}" at ${absoluteUrl(page.markdownHref)} and help me with any questions I have about it.`
  );
  const values = {
    url: absoluteUrl(page.pagePath),
    markdownUrl: absoluteUrl(page.markdownHref),
  };
  let copy = false;
  const menu: ContextualMenuItem[] = [];
  for (const option of config.contextual.options) {
    if (option === "copy") {
      copy = true;
      continue;
    }
    if (option === "view") {
      menu.push({
        kind: "view",
        label: "View as Markdown",
        href: page.markdownHref,
        external: false,
        icon: lucideIcon("file-text"),
      });
      continue;
    }
    if (typeof option === "string") {
      const assistant = AI_ASSISTANTS.find((item) => item.id === option);
      if (assistant) {
        menu.push({
          kind: "assistant",
          label: `Open in ${assistant.name}`,
          href: `${assistant.url}${prompt}`,
          external: true,
          logo: assistant.logo,
        });
      }
      continue;
    }
    const target = fillTemplate(option.href, values);
    if (SAFE_CUSTOM_HREF.test(target)) {
      menu.push({
        kind: "custom",
        label: option.title,
        description: option.description,
        href: target,
        external: EXTERNAL_HREF.test(target),
        icon: lucideIcon(option.icon) ?? lucideIcon("arrow-up-right"),
      });
    }
  }
  return { copy, menu };
}
