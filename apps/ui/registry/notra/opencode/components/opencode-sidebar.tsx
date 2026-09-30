"use client";

import { cn } from "cn";

import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";

import {
  OPENCODE_DEFAULT_CWD,
  OPENCODE_DEFAULT_SERVERS,
  OPENCODE_DEFAULT_VERSION,
  OPENCODE_MCP_STATUS_CLASS,
} from "../constants/opencode";
import type { OpencodeSidebarProps } from "../types/opencode";

const splitBranch = (branch: string) => {
  const cut = branch.lastIndexOf("/") + 1;
  return { head: branch.slice(cut), prefix: branch.slice(0, cut) };
};

const SidebarLocation = ({ branch, cwd }: { branch?: string; cwd: string }) => {
  if (!branch) {
    return <div className="text-opencode-muted break-all">{cwd}</div>;
  }
  const { head, prefix } = splitBranch(branch);
  return (
    <div className="break-all">
      <span className="text-opencode-muted">
        {cwd}:{prefix}
      </span>
      <span className="text-opencode-fg">{head}</span>
    </div>
  );
};

export const OpencodeSidebar = ({
  branch,
  className,
  cwd = OPENCODE_DEFAULT_CWD,
  lsp = "LSPs are disabled",
  mcpOpen,
  onMcpOpenChange,
  servers = OPENCODE_DEFAULT_SERVERS,
  spent = "$0.00 spent",
  title = "New session",
  tokens = "0 tokens",
  used = "0% used",
  version = OPENCODE_DEFAULT_VERSION,
  ...props
}: OpencodeSidebarProps) => (
  <aside
    className={cn(
      "bg-opencode-sidebar text-opencode-fg flex min-h-0 flex-col",
      className
    )}
    data-slot="opencode-sidebar"
    {...props}
  >
    <ScrollArea className="min-h-0 flex-1 [&>[data-slot=scroll-area-viewport]>div]:min-h-full">
      <div className="flex min-h-full flex-col gap-[1lh] px-[2ch] py-[1lh]">
        <h2 className="text-[length:inherit] leading-[inherit] font-bold wrap-break-word">
          {title}
        </h2>

        <section>
          <h3 className="text-[length:inherit] leading-[inherit] font-bold">
            Context
          </h3>
          <p className="text-opencode-muted tabular-nums">{tokens}</p>
          <p className="text-opencode-muted tabular-nums">{used}</p>
          <p className="text-opencode-muted tabular-nums">{spent}</p>
        </section>

        <Collapsible defaultOpen onOpenChange={onMcpOpenChange} open={mcpOpen}>
          <CollapsibleTrigger
            render={
              <Button
                className="group/mcp text-opencode-fg hover:text-opencode-fg aria-expanded:text-opencode-fg focus-visible:ring-opencode-blue h-auto gap-[1ch] rounded-none p-0 text-[length:inherit] leading-[inherit] font-bold hover:bg-transparent focus-visible:border-transparent focus-visible:ring-1 active:not-aria-[haspopup]:translate-y-0 aria-expanded:bg-transparent dark:hover:bg-transparent"
                variant="ghost"
              />
            }
          >
            <span
              aria-hidden="true"
              className="inline-block w-[1ch] text-[0.75em] transition-transform duration-150 group-aria-expanded/mcp:rotate-90 motion-reduce:transition-none"
            >
              ▶
            </span>
            MCP
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul>
              {servers.map((server) => {
                const status = server.status ?? "Connected";
                return (
                  <li className="flex min-w-0 gap-[1ch]" key={server.name}>
                    <span
                      aria-hidden="true"
                      className={OPENCODE_MCP_STATUS_CLASS[status]}
                    >
                      •
                    </span>
                    <span className="min-w-0 truncate">
                      {server.name}{" "}
                      <span className="text-opencode-muted">{status}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </CollapsibleContent>
        </Collapsible>

        <section>
          <h3 className="text-[length:inherit] leading-[inherit] font-bold">
            LSP
          </h3>
          <p className="text-opencode-muted">{lsp}</p>
        </section>

        <div className="mt-auto flex flex-col gap-[1lh] pt-[1lh]">
          <SidebarLocation branch={branch} cwd={cwd} />
          <p className="flex gap-[1ch]">
            <span aria-hidden="true" className="text-opencode-green">
              •
            </span>
            <span className="font-bold">
              <span className="text-opencode-muted">Open</span>Code
            </span>
            <span className="text-opencode-muted tabular-nums">{version}</span>
          </p>
        </div>
      </div>
    </ScrollArea>
  </aside>
);
