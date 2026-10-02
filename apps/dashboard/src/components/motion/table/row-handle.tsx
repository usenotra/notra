"use client";

import {
  ArrowDownToLineIcon,
  ArrowUpToLineIcon,
  Delete02Icon,
  MoreVerticalIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "use-intl";

import { TableMenu } from "./table-menu";

/** The row handle, portaled so it can sit on the row's left border without the
 * scroll container clipping it. Straddles the border to bridge hover. */
export function RowHandle({
  rowEl,
  id,
  index,
  onInsertRow,
  onDeleteRow,
  onEnter,
  onLeave,
}: {
  rowEl: HTMLTableRowElement | null;
  id: string;
  index: number;
  onInsertRow?: (index: number, position: "before" | "after") => void;
  onDeleteRow?: (rowId: string, index: number) => void;
  onEnter: () => void;
  onLeave: () => void;
}) {
  const t = useTranslations("shared.table");
  const tCommon = useTranslations("common");
  useEffect(() => {
    window.addEventListener("scroll", onLeave, true);
    return () => window.removeEventListener("scroll", onLeave, true);
  }, [onLeave]);

  if (!rowEl || typeof document === "undefined") {
    return null;
  }
  const rect = rowEl.getBoundingClientRect();

  return createPortal(
    <div
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      style={{
        position: "fixed",
        top: rect.top + rect.height / 2,
        left: rect.left,
        transform: "translate(-50%, -50%)",
        zIndex: 40,
      }}
    >
      <TableMenu
        ariaLabel={t("rowOptions", { row: index + 1 })}
        items={[
          ...(onInsertRow
            ? [
                {
                  label: t("insertBefore"),
                  icon: <HugeiconsIcon icon={ArrowUpToLineIcon} size={16} />,
                  onSelect: () => onInsertRow(index, "before"),
                },
                {
                  label: t("insertAfter"),
                  icon: <HugeiconsIcon icon={ArrowDownToLineIcon} size={16} />,
                  onSelect: () => onInsertRow(index, "after"),
                },
              ]
            : []),
          ...(onDeleteRow
            ? [
                {
                  label: tCommon("labels.deleteRow"),
                  icon: <HugeiconsIcon icon={Delete02Icon} size={16} />,
                  destructive: true,
                  onSelect: () => onDeleteRow(id, index),
                },
              ]
            : []),
        ]}
        trigger={<HugeiconsIcon icon={MoreVerticalIcon} size={12} />}
        triggerClassName="flex h-6 w-2 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
      />
    </div>,
    document.body
  );
}
