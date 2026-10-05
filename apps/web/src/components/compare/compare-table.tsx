import {
  Cancel01Icon,
  MinusSignIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { cn } from "@notra/ui/lib/utils";
import { Fragment } from "react";

import { CompareLogoTile } from "@/components/compare/compare-logo";
import {
  COMPARE_NOT_LISTED,
  COMPARE_NOT_LISTED_NOTE,
  COMPARE_ROW_GROUPS,
  NOTRA_COMPARE_LOGO,
} from "@/constants/compare/page";
import type {
  CompareCellProps,
  CompareCompetitorProps,
  CompareMarkProps,
} from "@/types/compare";

function CompareMark({ kind, highlight = false }: CompareMarkProps) {
  if (kind === "yes") {
    return (
      <span
        className={cn(
          "inline-flex size-6 shrink-0 items-center justify-center rounded-full",
          highlight
            ? "bg-primary text-white"
            : "bg-[#1E1E1E14] text-[#1E1E1E99] dark:bg-white/10 dark:text-white/60"
        )}
      >
        <HugeiconsIcon
          aria-label="Yes"
          className="size-3.5"
          icon={Tick02Icon}
          strokeWidth={2.5}
        />
      </span>
    );
  }
  if (kind === "no") {
    return (
      <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-[#E5484D1A] text-[#E5484D] dark:bg-[#E5484D26] dark:text-[#FF6369]">
        <HugeiconsIcon
          aria-label="No"
          className="size-3.5"
          icon={Cancel01Icon}
        />
      </span>
    );
  }
  return (
    <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-dashed border-[#1E1E1E33] text-[#1E1E1E59] dark:border-white/20 dark:text-white/35">
      <HugeiconsIcon
        aria-label={COMPARE_NOT_LISTED}
        className="size-3"
        icon={MinusSignIcon}
      />
    </span>
  );
}

export function CompareCell({ value, highlight = false }: CompareCellProps) {
  if (typeof value === "boolean") {
    return <CompareMark highlight={highlight} kind={value ? "yes" : "no"} />;
  }
  if (value === COMPARE_NOT_LISTED) {
    return <CompareMark kind="unknown" />;
  }
  return (
    <span
      className={cn(
        "font-sans text-[0.8125rem] leading-5 break-words sm:text-sm",
        highlight
          ? "font-medium text-[#1E1E1E] dark:text-white"
          : "text-[#1E1E1EBF] dark:text-white/70"
      )}
    >
      {value}
    </span>
  );
}

function CompareLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-sans text-[0.8125rem] text-[#1E1E1E99] dark:text-white/55">
      <span className="flex items-center gap-2">
        <CompareMark highlight kind="yes" />
        Included
      </span>
      <span className="flex items-center gap-2">
        <CompareMark kind="no" />
        Not available
      </span>
      <span className="flex items-center gap-2">
        <CompareMark kind="unknown" />
        {COMPARE_NOT_LISTED_NOTE}
      </span>
    </div>
  );
}

export function CompareTable({ competitor }: CompareCompetitorProps) {
  return (
    <div className="flex flex-col gap-5">
      <CompareLegend />
      <div className="rounded-3xl border border-[#1E1E1E1A] dark:border-white/10">
        <table className="w-full table-fixed border-separate border-spacing-0 text-left">
          <thead className="sticky top-20 z-10">
            <tr>
              <th
                className="w-[40%] rounded-tl-3xl border-b border-[#1E1E1E14] bg-white/95 px-4 py-4 font-sans text-sm font-medium text-[#1E1E1E99] backdrop-blur sm:px-6 dark:border-white/[0.08] dark:bg-[#141416]/95 dark:text-white/50"
                scope="col"
              >
                Feature
              </th>
              <th
                className="w-[30%] border-b border-l border-[#1E1E1E14] bg-[#F6F2FD]/95 px-3 py-4 backdrop-blur dark:border-white/[0.08] dark:bg-[#1E1A2A]/95"
                scope="col"
              >
                <span className="text-primary flex items-center justify-center gap-2 font-sans text-sm font-semibold break-words sm:text-[0.9375rem]">
                  <span className="hidden sm:inline-flex">
                    <CompareLogoTile
                      logo={NOTRA_COMPARE_LOGO}
                      name="Notra"
                      size="xs"
                    />
                  </span>
                  Notra
                </span>
              </th>
              <th
                className="w-[30%] rounded-tr-3xl border-b border-l border-[#1E1E1E14] bg-white/95 px-3 py-4 backdrop-blur dark:border-white/[0.08] dark:bg-[#141416]/95"
                scope="col"
              >
                <span className="flex items-center justify-center gap-2 font-sans text-sm font-semibold break-words text-[#1E1E1E] sm:text-[0.9375rem] dark:text-white">
                  <span className="hidden sm:inline-flex">
                    <CompareLogoTile
                      logo={competitor.logo}
                      name={competitor.name}
                      size="xs"
                    />
                  </span>
                  {competitor.name}
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="[&>tr:last-child>*]:border-b-0">
            {COMPARE_ROW_GROUPS.map((group) => (
              <Fragment key={group.category}>
                <tr>
                  <th
                    className="border-b border-[#1E1E1E14] bg-[#FAFAFA] px-4 pt-6 pb-4 text-left align-top sm:px-6 dark:border-white/[0.08] dark:bg-white/[0.02]"
                    colSpan={3}
                    scope="colgroup"
                  >
                    <span className="block font-sans text-base font-semibold text-[#1E1E1E] dark:text-white">
                      {group.category}
                    </span>
                    <span className="mt-1 block font-sans text-sm font-normal text-[#1E1E1E99] dark:text-white/50">
                      {group.description}
                    </span>
                  </th>
                </tr>
                {group.rows.map((row) => (
                  <tr className="group/row" key={row.id}>
                    <th
                      className="border-b border-[#1E1E1E0F] px-3 py-3.5 text-left font-sans text-sm font-normal break-words text-[#1E1E1E] sm:px-6 sm:text-[0.9375rem] dark:border-white/[0.06] dark:text-white/90"
                      scope="row"
                    >
                      {row.label}
                    </th>
                    <td className="border-b border-l border-[#1E1E1E0F] bg-[#C8B2EE14] px-3 py-3.5 text-center align-middle dark:border-white/[0.06] dark:bg-[#8B5CF60A]">
                      <span className="inline-flex justify-center">
                        <CompareCell highlight value={row.notra} />
                      </span>
                    </td>
                    <td className="border-b border-l border-[#1E1E1E0F] px-3 py-3.5 text-center align-middle dark:border-white/[0.06]">
                      <span className="inline-flex justify-center">
                        <CompareCell value={competitor.values[row.id]} />
                      </span>
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
