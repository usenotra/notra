import { CommandLineIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { CommandTabs } from "@notra/ui/components/ui/command-tabs";
import { ExpandableTabs } from "@notra/ui/components/ui/expandable-tabs";
import { cn } from "@notra/ui/lib/utils";
import { useState } from "react";

import { MCP_CLIENTS } from "@/constants/mcp";
import type { McpClient, McpCommandTabsProps } from "@/types/mcp";

function clientIcon(client: McpClient) {
  if (!client.iconSrc) {
    return (
      <HugeiconsIcon
        className="text-foreground size-4 shrink-0"
        icon={CommandLineIcon}
      />
    );
  }
  return (
    <img
      decoding="async"
      loading="lazy"
      alt={`${client.label} logo`}
      className={cn("size-4 shrink-0", client.invertInDark && "dark:invert")}
      height={16}
      src={client.iconSrc}
      width={16}
    />
  );
}

const CLIENT_ITEMS = MCP_CLIENTS.map((client) => ({
  value: client.id,
  label: client.label,
  command: client.command,
  icon: clientIcon(client),
}));

export function McpCommandTabs({ className }: McpCommandTabsProps) {
  const [activeClientId, setActiveClientId] = useState<string | undefined>(
    MCP_CLIENTS[0]?.id
  );

  return (
    <div className={cn("flex w-full flex-col", className)}>
      <CommandTabs
        highlight
        items={CLIENT_ITEMS}
        onValueChange={setActiveClientId}
        tabsPosition="none"
        value={activeClientId}
      />
      <ExpandableTabs
        className="-mt-px rounded-t-none border-t-0"
        items={CLIENT_ITEMS}
        label="Choose an MCP client"
        onValueChange={setActiveClientId}
        value={activeClientId}
      />
    </div>
  );
}
