"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@notra/ui/components/ui/select";
import { useTranslations } from "next-intl";

import { ShelfMemberAvatar } from "@/components/geo/shelf/shelf-member-avatar";
import {
  GEO_SHELF_POC_SAME_AS_ASSIGNEE,
  GEO_SHELF_UNASSIGNED,
} from "@/constants/geo-shelf";
import type { GeoShelfMemberSelectProps } from "@/types/geo-shelf";

export function ShelfMemberSelect({
  members,
  value,
  onChange,
  placeholder,
  allowSameAsAssignee = false,
  disabled = false,
  id,
  ariaLabel,
}: GeoShelfMemberSelectProps) {
  const t = useTranslations("geo.shelf.shelfMemberSelect");
  const tCommon = useTranslations("common");
  const emptyValue = allowSameAsAssignee
    ? GEO_SHELF_POC_SAME_AS_ASSIGNEE
    : GEO_SHELF_UNASSIGNED;
  const emptyLabel = allowSameAsAssignee
    ? t("sameAsAssignee")
    : (placeholder ?? tCommon("labels.unassigned"));
  const selected = value
    ? (members.find((member) => member.id === value) ?? null)
    : null;

  return (
    <Select
      disabled={disabled}
      onValueChange={(next) => {
        if (!next || next === emptyValue) {
          onChange(null);
          return;
        }
        onChange(next);
      }}
      value={value ?? emptyValue}
    >
      <SelectTrigger aria-label={ariaLabel} className="w-full" id={id}>
        <SelectValue>
          <ShelfMemberAvatar fallbackLabel={emptyLabel} member={selected} />
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={emptyValue}>
          <ShelfMemberAvatar fallbackLabel={emptyLabel} member={null} />
        </SelectItem>
        {members.map((member) => (
          <SelectItem key={member.id} value={member.id}>
            <ShelfMemberAvatar member={member} />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
