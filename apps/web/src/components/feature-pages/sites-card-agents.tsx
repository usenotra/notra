import { cn } from "@notra/ui/lib/utils";

import {
  SITES_AGENTS_FILES,
  SITES_AGENTS_REQUEST,
  SITES_AGENTS_RESPONSE,
  SITES_MOCK_SURFACE_CLASS,
  SITES_TERMINAL_CLASS,
} from "@/constants/feature-pages/sites";

export function SitesCardAgents() {
  return (
    <div
      aria-hidden="true"
      className={cn(SITES_MOCK_SURFACE_CLASS, "flex flex-col gap-4 p-4")}
    >
      <div className={SITES_TERMINAL_CLASS}>
        {SITES_AGENTS_REQUEST.map((line) => (
          <span className="block whitespace-pre text-[#E7E3F0]" key={line}>
            {line}
          </span>
        ))}
        <span className="mt-3 block text-[#8C86A0]">
          200 OK · content-type: text/markdown
        </span>
        <div className="mt-2 border-l-2 border-[#8B5CF6]/60 pl-3">
          {SITES_AGENTS_RESPONSE.map((line, index) => (
            <span
              className={cn(
                "block min-h-5.5 whitespace-pre",
                index === 0 && "font-semibold text-[#C4B5FD]"
              )}
              key={`${index}-${line}`}
            >
              {line}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {SITES_AGENTS_FILES.map((file) => (
          <span
            className="bg-muted/60 text-foreground rounded-lg border px-2.5 py-1.5 font-mono text-xs"
            key={file}
          >
            {file}
          </span>
        ))}
      </div>
    </div>
  );
}
