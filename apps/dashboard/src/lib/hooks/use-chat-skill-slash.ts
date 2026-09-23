"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useRef, useState } from "react";

import { dashboardOrpc } from "@/lib/orpc/query";
import type { SlashSkillQuery } from "@/types/skills/slash";
import {
  cycleSlashIndex,
  filterSlashSkills,
  getSlashSkillQuery,
} from "@/utils/slash-skill-query";

export function useChatSkillSlash(organizationId?: string) {
  const { data: skillRows = [] } = useQuery({
    ...dashboardOrpc.skills.list.queryOptions({
      input: { organizationId: organizationId ?? "" },
    }),
    enabled: Boolean(organizationId),
  });
  const [slashQuery, setSlashQuery] = useState<SlashSkillQuery | null>(null);
  const [slashIndex, setSlashIndex] = useState(0);
  const slashListRef = useRef<HTMLDivElement | null>(null);

  const skills = useMemo(
    () =>
      skillRows.toSorted((left, right) => left.name.localeCompare(right.name)),
    [skillRows]
  );

  const filteredSkills = useMemo(
    () =>
      slashQuery === null ? [] : filterSlashSkills(skills, slashQuery.query),
    [skills, slashQuery]
  );

  const closeSlashMenu = useCallback(() => {
    setSlashQuery(null);
    setSlashIndex(0);
  }, []);

  const syncSlashQuery = useCallback((text: string, cursor: number) => {
    const next = getSlashSkillQuery(text, cursor);
    setSlashQuery(next);
    if (next) {
      setSlashIndex(0);
    }
  }, []);

  const moveSlashIndex = useCallback(
    (delta: 1 | -1) => {
      setSlashIndex((prev) =>
        cycleSlashIndex(prev, filteredSkills.length, delta)
      );
    },
    [filteredSkills.length]
  );

  return {
    skills,
    filteredSkills,
    slashQuery,
    slashIndex,
    isSlashMenuOpen: slashQuery !== null,
    slashListRef,
    closeSlashMenu,
    syncSlashQuery,
    moveSlashIndex,
  };
}
