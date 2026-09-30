"use client";

import {
  OPENCODE_DEFAULT_CWD,
  OPENCODE_DEFAULT_SERVERS,
  OPENCODE_DEFAULT_VERSION,
  OPENCODE_MCP_STATUS_CLASS,
} from "@notra/ui/constants/opencode-skin";
import { cn } from "@notra/ui/lib/utils";
import type { OpencodeSidebarProps } from "@notra/ui/types/opencode-skin";
import { useState } from "react";

function Location({ cwd, branch }: { cwd: string; branch?: string }) {
  if (!branch) {
    return <p className="break-all text-opencode-tui-muted">{cwd}</p>;
  }
  const cut = branch.lastIndexOf("/") + 1;
  return (
    <p className="break-all">
      <span className="text-opencode-tui-muted">
        {cwd}:{branch.slice(0, cut)}
      </span>
      {branch.slice(cut)}
    </p>
  );
}

export function OpencodeSidebar({
  title = "New session",
  tokens = "0 tokens",
  used = "0% used",
  spent = "$0.00 spent",
  servers = OPENCODE_DEFAULT_SERVERS,
  lsp = "LSPs are disabled",
  cwd = OPENCODE_DEFAULT_CWD,
  branch,
  version = OPENCODE_DEFAULT_VERSION,
  className,
}: OpencodeSidebarProps) {
  const [mcpOpen, setMcpOpen] = useState(true);

  return (
    <aside
      className={cn(
        "flex min-h-0 flex-col gap-5 bg-opencode-tui-sidebar px-[2ch] py-5 font-mono text-[13px] text-opencode-tui-foreground leading-5",
        className
      )}
    >
      <h2 className="break-words font-bold">{title}</h2>

      <section>
        <h3 className="font-bold">Context</h3>
        <p className="text-opencode-tui-muted tabular-nums">{tokens}</p>
        <p className="text-opencode-tui-muted tabular-nums">{used}</p>
        <p className="text-opencode-tui-muted tabular-nums">{spent}</p>
      </section>

      <section>
        <button
          aria-expanded={mcpOpen}
          className="flex items-center gap-[1ch] font-bold outline-none focus-visible:ring-1 focus-visible:ring-opencode-tui-blue"
          onClick={() => setMcpOpen((open) => !open)}
          type="button"
        >
          <span
            aria-hidden
            className={cn(
              "inline-block w-[1ch] text-[0.75em] transition-transform duration-150 motion-reduce:transition-none",
              mcpOpen && "rotate-90"
            )}
          >
            ▶
          </span>
          MCP
        </button>
        {mcpOpen ? (
          <ul>
            {servers.map((server) => {
              const status = server.status ?? "Connected";
              return (
                <li className="flex min-w-0 gap-[1ch]" key={server.name}>
                  <span aria-hidden className={OPENCODE_MCP_STATUS_CLASS[status]}>
                    •
                  </span>
                  <span className="min-w-0 truncate">
                    {server.name}{" "}
                    <span className="text-opencode-tui-muted">{status}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>

      <section>
        <h3 className="font-bold">LSP</h3>
        <p className="text-opencode-tui-muted">{lsp}</p>
      </section>

      <div className="mt-auto flex flex-col gap-5 pt-5">
        <Location branch={branch} cwd={cwd} />
        <p className="flex gap-[1ch]">
          <span aria-hidden className="text-opencode-tui-green">
            •
          </span>
          <span className="font-bold">
            <span className="text-opencode-tui-muted">Open</span>Code
          </span>
          <span className="text-opencode-tui-muted tabular-nums">{version}</span>
        </p>
      </div>
    </aside>
  );
}
