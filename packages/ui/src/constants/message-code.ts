import { createCodePlugin } from "@streamdown/code";
import type { PluginConfig } from "streamdown";

export const MESSAGE_CODE_PLUGINS = {
  code: createCodePlugin({ themes: ["github-light", "github-dark-default"] }),
} satisfies PluginConfig;
