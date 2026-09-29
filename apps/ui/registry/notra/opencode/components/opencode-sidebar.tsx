"use client";

import { cn } from "cn";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Item, ItemGroup, ItemMedia, ItemTitle } from "@/components/ui/item";
import { ScrollArea } from "@/components/ui/scroll-area";

import {
  OPENCODE_DEFAULT_CWD,
  OPENCODE_DEFAULT_SERVERS,
  OPENCODE_DEFAULT_VERSION,
  OPENCODE_MCP_STATUS_CLASS,
} from "../constants/opencode";
import type { OpencodeSidebarProps } from "../types/opencode";

export const OpencodeSidebar = ({
  className,
  cwd = OPENCODE_DEFAULT_CWD,
  lsp = "LSPs are disabled",
  mcpOpen,
  onMcpOpenChange,
  servers = OPENCODE_DEFAULT_SERVERS,
  spent = "$0.00 spent",
  title = "New session",
  tokens = "26,167 tokens",
  used = "7% used",
  version = OPENCODE_DEFAULT_VERSION,
  ...props
}: OpencodeSidebarProps) => (
  <aside
    className={cn(
      "border-opencode-subtle font-opencode text-opencode-fg flex min-h-0 flex-col border-s text-[0.8125rem] leading-[1.3]",
      className
    )}
    data-slot="opencode-sidebar"
    {...props}
  >
    <ScrollArea className="min-h-0 flex-1 [&>[data-slot=scroll-area-viewport]>div]:min-h-full">
      <div className="flex min-h-full flex-col px-[2ch] py-[1.0625rem]">
        <div className="font-semibold">{title}</div>
        <div className="mt-[1.0625rem] font-semibold">Context</div>
        <div className="text-opencode-muted">{tokens}</div>
        <div className="text-opencode-muted">{used}</div>
        <div className="text-opencode-muted">{spent}</div>

        <Collapsible
          className="mt-[1.0625rem]"
          defaultOpen
          onOpenChange={onMcpOpenChange}
          open={mcpOpen}
        >
          <CollapsibleTrigger
            render={
              <Button
                className="group/mcp text-opencode-fg hover:text-opencode-fg aria-expanded:text-opencode-fg focus-visible:ring-opencode-purple/60 h-auto gap-2 rounded-xs p-0 text-[length:inherit] leading-[inherit] font-semibold hover:bg-transparent focus-visible:border-transparent focus-visible:ring-1 active:not-aria-[haspopup]:translate-y-0 aria-expanded:bg-transparent dark:hover:bg-transparent"
                variant="ghost"
              />
            }
          >
            <span
              aria-hidden="true"
              className="inline-block text-[0.625rem] transition-transform duration-150 group-data-panel-open/mcp:rotate-90 motion-reduce:transition-none"
            >
              ▶
            </span>
            MCP
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ItemGroup className="gap-0">
              {servers.map((server) => {
                const status = server.status ?? "Connected";

                return (
                  <Item
                    className="flex-nowrap items-baseline gap-[1ch] rounded-none border-0 p-0 text-[length:inherit] leading-[inherit]"
                    key={server.name}
                    role="listitem"
                  >
                    <ItemMedia
                      aria-hidden="true"
                      className={OPENCODE_MCP_STATUS_CLASS[status]}
                    >
                      •
                    </ItemMedia>
                    <ItemTitle className="block w-auto min-w-0 truncate text-[length:inherit] leading-[inherit] font-normal">
                      {server.name}
                    </ItemTitle>
                    <Badge className="text-opencode-muted h-auto min-w-0 justify-start truncate rounded-none border-0 bg-transparent p-0 text-[length:inherit] leading-[inherit] font-normal">
                      {status}
                    </Badge>
                  </Item>
                );
              })}
            </ItemGroup>
          </CollapsibleContent>
        </Collapsible>

        <div className="mt-[1.0625rem] font-semibold">LSP</div>
        <div className="text-opencode-muted">{lsp}</div>

        <div className="mt-auto pt-[1.0625rem]">
          <div className="wrap-break-word">{cwd}</div>
          <div className="mt-[1.0625rem] flex items-center gap-[1ch]">
            <span aria-hidden="true" className="text-opencode-green">
              •
            </span>
            <span className="text-opencode-muted font-semibold">OpenCode</span>
            <span className="text-opencode-muted">{version}</span>
          </div>
        </div>
      </div>
    </ScrollArea>
  </aside>
);
