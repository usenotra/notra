"use client";

import { Cancel01Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { KeyboardEvent } from "react";
import { useTranslations } from "use-intl";

import type { SiteBuildLogFilterProps } from "@/types/components/sites";

export function SiteBuildLogFilter({
  value,
  onChange,
}: SiteBuildLogFilterProps) {
  const t = useTranslations("sites.deploymentPage.log");

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape" && value) {
      event.preventDefault();
      onChange("");
    }
  };

  return (
    <label className="text-muted-foreground focus-within:text-foreground relative flex h-7 w-32 items-center sm:w-44">
      <HugeiconsIcon
        aria-hidden="true"
        className="pointer-events-none absolute start-2 size-3.5"
        icon={Search01Icon}
        strokeWidth={1.75}
      />
      <input
        aria-label={t("filter")}
        className="text-foreground placeholder:text-muted-foreground hover:bg-background/60 focus:bg-background focus:border-border h-full w-full rounded-md border border-transparent bg-transparent ps-7 pe-6 text-xs transition-colors duration-150 outline-none"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder={t("filter")}
        spellCheck={false}
        type="text"
        value={value}
      />
      {value ? (
        <button
          aria-label={t("clearFilter")}
          className="hover:text-foreground absolute end-1 flex size-5 items-center justify-center rounded-sm"
          onClick={() => onChange("")}
          type="button"
        >
          <HugeiconsIcon
            className="size-3"
            icon={Cancel01Icon}
            strokeWidth={2}
          />
        </button>
      ) : null}
    </label>
  );
}
