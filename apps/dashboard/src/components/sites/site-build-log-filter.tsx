"use client";

import { Cancel01Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@notra/ui/components/ui/input-group";
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
    <InputGroup className="h-7 w-32 sm:w-44">
      <InputGroupAddon>
        <HugeiconsIcon
          aria-hidden="true"
          className="size-3.5"
          icon={Search01Icon}
          strokeWidth={1.5}
        />
      </InputGroupAddon>
      <InputGroupInput
        aria-label={t("filter")}
        className="h-full"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder={t("filter")}
        spellCheck={false}
        type="text"
        value={value}
      />
      {value ? (
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            aria-label={t("clearFilter")}
            onClick={() => onChange("")}
            size="icon-xs"
          >
            <HugeiconsIcon
              aria-hidden="true"
              className="size-3"
              icon={Cancel01Icon}
              strokeWidth={1.5}
            />
          </InputGroupButton>
        </InputGroupAddon>
      ) : null}
    </InputGroup>
  );
}
