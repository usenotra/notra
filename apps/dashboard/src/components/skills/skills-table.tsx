"use client";

import { Badge } from "@notra/ui/components/ui/badge";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

import { Table, type TableColumn } from "@/components/motion/table";
import { TABLE_ROW_HEIGHT } from "@/constants/table";
import type { SkillListItem, SkillsTableProps } from "@/types/skills/page";
import { formatSkillUpdatedAt, toggleSkillSort } from "@/utils/skills";
import { tableHeightFor } from "@/utils/table";

function SkillUpdatedAtCell({ skill }: { skill: SkillListItem }) {
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const updatedAt = new Date(skill.updatedAt);
  return (
    <time
      className="text-muted-foreground text-sm"
      dateTime={updatedAt.toISOString()}
      title={updatedAt.toLocaleString(locale)}
    >
      {formatSkillUpdatedAt(skill.updatedAt, locale) ??
        tCommon("labels.justNow")}
    </time>
  );
}

export function SkillsTable({
  slug,
  skills,
  sort,
  onSortChange,
  searchActive,
  loading = false,
}: SkillsTableProps) {
  const router = useRouter();
  const t = useTranslations("skills.table");
  const tCommon = useTranslations("common");
  const columns: TableColumn<SkillListItem>[] = [
    {
      key: "name",
      header: tCommon("labels.name"),
      width: "14rem",
      sortable: true,
      cell: (skill) => (
        <span
          className="block truncate font-mono text-sm font-medium"
          title={skill.name}
        >
          {skill.name}
        </span>
      ),
    },
    {
      key: "description",
      header: tCommon("labels.description"),
      width: "1fr",
      minWidth: "16rem",
      cell: (skill) => (
        <span
          className="text-muted-foreground block truncate text-sm"
          title={skill.description}
        >
          {skill.description}
        </span>
      ),
    },
    {
      key: "type",
      header: tCommon("labels.type"),
      width: "7rem",
      sortable: true,
      sortValue: (skill) => -Number(skill.isSystem),
      cell: (skill) => (
        <Badge variant={skill.isSystem ? "secondary" : "outline"}>
          {skill.isSystem
            ? tCommon("labels.system")
            : tCommon("labels.customOwn")}
        </Badge>
      ),
    },
    {
      key: "updatedAt",
      header: tCommon("labels.updated"),
      width: "9rem",
      sortable: true,
      sortValue: (skill) => new Date(skill.updatedAt).getTime(),
      cell: (skill) => <SkillUpdatedAtCell skill={skill} />,
    },
  ];

  return (
    <Table
      columns={columns}
      data={skills}
      emptyState={searchActive ? t("noSearchResults") : t("emptyView")}
      getRowId={(skill) => skill.id}
      height={tableHeightFor(skills.length)}
      loading={loading}
      onRowClick={(skill) => router.push(`/${slug}/skills/${skill.name}`)}
      onRowPointerEnter={(skill) =>
        router.prefetch(`/${slug}/skills/${skill.name}`)
      }
      onSortChange={(next) => {
        const key = next?.key ?? sort.key;
        if (key === "name" || key === "type" || key === "updatedAt") {
          onSortChange(toggleSkillSort(sort, key));
        }
      }}
      rowHeight={TABLE_ROW_HEIGHT}
      sort={sort}
    />
  );
}
