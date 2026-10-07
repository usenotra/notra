"use client";

import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Kbd } from "@notra/ui/components/ui/kbd";
import type { ComponentProps } from "react";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";

type CreateContentButtonProps = Omit<ComponentProps<typeof Button>, "children">;

export function CreateContentButton(props: CreateContentButtonProps) {
  const tContentShared = useTranslations("content.shared");
  return (
    <Button className="w-fit gap-2" {...props}>
      <span className="inline-flex items-center gap-1.5">
        <HugeiconsIcon className="size-4" icon={PlusSignIcon} />
        {tContentShared("createContent")}
      </span>
      <Kbd className="hidden sm:inline-flex">C</Kbd>
    </Button>
  );
}
