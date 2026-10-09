import type { LinkIcon } from "./icons";

export interface AiAssistant {
  id: string;
  name: string;
  url: string;
  logo: string;
}

export interface ContextualPage {
  title: string;
  pagePath: string;
  markdownHref: string;
}

export interface ContextualActions {
  copy: boolean;
  menu: ContextualMenuItem[];
}

export interface ContextualMenuItem {
  kind: "view" | "assistant" | "custom";
  label: string;
  description?: string;
  href: string;
  external: boolean;
  logo?: string;
  icon?: LinkIcon;
}
