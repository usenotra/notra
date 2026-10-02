import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { EngineIcon } from "@notra/ui/components/geo/engine-icon";

import { formatListDate } from "@/lib/ip-checker/format";
import type { CrawlerListsTableProps } from "@/types/ip-checker";

import { CrawlerAgentTag } from "./crawler-agent-tag";

const headCellClass =
  "px-4 py-3 text-left font-sans text-[0.8125rem]/5 font-medium text-[#1E1E1E99] dark:text-white/50";
const cellClass =
  "px-4 py-3.5 align-top font-sans text-[0.9375rem]/6 text-[#1E1E1E] dark:text-white";

export function CrawlerListsTable({ lists }: CrawlerListsTableProps) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-[#1E1E1E14] bg-white dark:border-white/10 dark:bg-white/[0.03]">
      <table className="w-full min-w-[52rem] border-collapse">
        <caption className="sr-only">
          AI crawler IP range lists published by each vendor
        </caption>
        <thead>
          <tr className="border-b border-[#1E1E1E0D] dark:border-white/10">
            <th className={headCellClass} scope="col">
              Vendor
            </th>
            <th className={headCellClass} scope="col">
              Crawlers
            </th>
            <th className={`${headCellClass} text-right`} scope="col">
              Ranges
            </th>
            <th className={headCellClass} scope="col">
              Updated
            </th>
            <th className={headCellClass} scope="col">
              List
            </th>
          </tr>
        </thead>
        <tbody>
          {lists.map((list) => (
            <tr
              className="border-b border-[#1E1E1E0D] last:border-b-0 dark:border-white/10"
              key={list.id}
            >
              <td className={cellClass}>
                <span className="flex items-center gap-2.5 whitespace-nowrap">
                  <EngineIcon className="size-5" engine={list.iconEngine} />
                  <span className="font-medium">{list.vendor}</span>
                </span>
              </td>
              <td className={cellClass}>
                <span className="flex flex-wrap gap-1.5">
                  {list.agents.map((agent) => (
                    <CrawlerAgentTag agent={agent} key={agent.name} />
                  ))}
                </span>
              </td>
              <td className={`${cellClass} text-right font-mono tabular-nums`}>
                {list.ok ? list.rangeCount : "Unavailable"}
              </td>
              <td className={`${cellClass} whitespace-nowrap`}>
                {formatListDate(list.updatedAt)}
              </td>
              <td className={cellClass}>
                <a
                  className="inline-flex items-center gap-1 font-medium whitespace-nowrap text-[#8B5CF6] hover:underline dark:text-[#A78BFA]"
                  href={list.url}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  JSON
                  <HugeiconsIcon
                    className="size-3.5"
                    icon={ArrowUpRight01Icon}
                  />
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
