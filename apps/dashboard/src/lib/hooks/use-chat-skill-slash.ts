"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { dashboardOrpc } from "@/lib/orpc/query";
import type { SkillSlashOption, SlashSkillQuery } from "@/types/skills/slash";
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
  const [taggedSkills, setTaggedSkills] = useState<SkillSlashOption[]>([]);
  const slashListRef = useRef<HTMLDivElement | null>(null);
  const taggedSkillsRef = useRef<SkillSlashOption[]>([]);
  const organizationIdRef = useRef(organizationId);

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

  useEffect(() => {
    if (organizationIdRef.current === organizationId) {
      return;
    }
    organizationIdRef.current = organizationId;
    taggedSkillsRef.current = [];
    setTaggedSkills([]);
    setSlashQuery(null);
    setSlashIndex(0);
  }, [organizationId]);

  const closeSlashMenu = useCallback(() => {
    setSlashQuery(null);
    setSlashIndex(0);
  }, []);

  const tagSkill = useCallback((skill: SkillSlashOption) => {
    const next = taggedSkillsRef.current.some(
      (tagged) => tagged.name === skill.name
    )
      ? taggedSkillsRef.current
      : [...taggedSkillsRef.current, skill];
    taggedSkillsRef.current = next;
    setTaggedSkills(next);
  }, []);

  const untagSkill = useCallback((name: string) => {
    const next = taggedSkillsRef.current.filter(
      (tagged) => tagged.name !== name
    );
    taggedSkillsRef.current = next;
    setTaggedSkills(next);
  }, []);

  const clearTaggedSkills = useCallback(() => {
    taggedSkillsRef.current = [];
    setTaggedSkills([]);
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
    taggedSkillsRef,
    closeSlashMenu,
    syncSlashQuery,
    moveSlashIndex,
    taggedSkills,
    tagSkill,
    untagSkill,
    clearTaggedSkills,
  };
}
