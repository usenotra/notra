"use client";

import { Badge } from "@notra/ui/components/ui/badge";
import { useRouter } from "next/navigation";

import { Table, type TableColumn } from "@/components/motion/table";
import { SKILL_TYPE_LABELS } from "@/constants/skills";
import { TABLE_ROW_HEIGHT } from "@/constants/table";
import type { SkillListItem, SkillsTableProps } from "@/types/skills/page";
import { formatSkillUpdatedAt, toggleSkillSort } from "@/utils/skills";
import { tableHeightFor } from "@/utils/table";

const columns: TableColumn<SkillListItem>[] = [
  {
    key: "name",
    header: "Name",
    width: "14rem",
    sortable: true,
    cell: (skill) => (
      <span className="block truncate font-mono text-sm font-medium">
        {skill.name}
      </span>
    ),
  },
  {
    key: "description",
    header: "Description",
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
    header: "Type",
    width: "7rem",
    sortable: true,
    sortValue: (skill) => -Number(skill.isSystem),
    cell: (skill) => (
      <Badge variant={skill.isSystem ? "secondary" : "outline"}>
        {skill.isSystem ? SKILL_TYPE_LABELS.system : SKILL_TYPE_LABELS.custom}
      </Badge>
    ),
  },
  {
    key: "updatedAt",
    header: "Updated",
    width: "9rem",
    sortable: true,
    sortValue: (skill) => new Date(skill.updatedAt).getTime(),
    cell: (skill) => (
      <time
        className="text-muted-foreground text-sm"
        dateTime={new Date(skill.updatedAt).toISOString()}
        title={new Date(skill.updatedAt).toLocaleString("en-US")}
      >
        {formatSkillUpdatedAt(skill.updatedAt)}
      </time>
    ),
  },
];

export function SkillsTable({
  slug,
  skills,
  sort,
  onSortChange,
  searchActive,
}: SkillsTableProps) {
  const router = useRouter();

  return (
    <Table
      columns={columns}
      data={skills}
      emptyState={
        searchActive
          ? "No skills match your search."
          : "No skills in this view yet."
      }
      getRowId={(skill) => skill.id}
      height={tableHeightFor(skills.length)}
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
