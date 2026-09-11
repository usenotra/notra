import {
  CommandLineIcon,
  PlugSocketIcon,
  SourceCodeIcon,
} from "@hugeicons/core-free-icons";
import { API_KEY_GRANULAR_PERMISSIONS } from "@notra/schemas/constants/dashboard/api-keys";
import type { ConnectedCardItem } from "@notra/ui/components/shared/connected-cards";

import { API_KEY_GRANULAR_READ_PERMISSIONS } from "@/constants/api-keys";
import type { ApiKeyPreset } from "@/types/api-keys";

const DOCS_BASE_URL = "https://docs.usenotra.com";

export const API_KEY_PRESETS: ApiKeyPreset[] = [
  {
    id: "mcp",
    icon: PlugSocketIcon,
    title: "MCP Server",
    description:
      "Connect Claude, Cursor, and other MCP clients to read and write your content.",
    docsHref: `${DOCS_BASE_URL}/devtools/mcp`,
    defaultName: "MCP Server",
    accessMode: "full",
    scopes: [...API_KEY_GRANULAR_PERMISSIONS],
    expiration: "never",
  },
  {
    id: "sdk",
    icon: SourceCodeIcon,
    title: "SDK",
    description:
      "Pull your data programmatically with the TypeScript and Python SDKs.",
    docsHref: `${DOCS_BASE_URL}/api/getting-started`,
    defaultName: "SDK",
    accessMode: "restricted",
    scopes: [...API_KEY_GRANULAR_READ_PERMISSIONS],
    expiration: "never",
  },
  {
    id: "cli",
    icon: CommandLineIcon,
    title: "CLI",
    description:
      "Script and automate your workflow from the terminal with full access.",
    docsHref: `${DOCS_BASE_URL}/devtools/cli`,
    defaultName: "CLI",
    accessMode: "full",
    scopes: [...API_KEY_GRANULAR_PERMISSIONS],
    expiration: "never",
  },
];

export const API_KEY_CARD_ITEMS: ConnectedCardItem[] = API_KEY_PRESETS.map(
  (preset) => ({
    id: preset.id,
    icon: preset.icon,
    title: preset.title,
    description: preset.description,
    docsHref: preset.docsHref,
  })
);
