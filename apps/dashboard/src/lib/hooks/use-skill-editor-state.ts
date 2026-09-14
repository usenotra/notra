"use client";

import { useEffect, useState } from "react";

import type { SkillEditorSnapshot } from "@/types/skills/page";

/**
 * Editor fields of one skill plus the saved snapshot they are compared
 * against. Seeds itself from the first loaded row and warns before the tab
 * closes with unsaved edits.
 */
export function useSkillEditorState(skill: SkillEditorSnapshot | undefined) {
  const [original, setOriginal] = useState<SkillEditorSnapshot | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");

  const reset = (row: SkillEditorSnapshot) => {
    setOriginal({
      name: row.name,
      description: row.description,
      content: row.content,
    });
    setNameInput(row.name);
    setDescription(row.description);
    setContent(row.content);
  };

  if (skill && !original) {
    reset(skill);
  }

  const hasChanges =
    original !== null &&
    (nameInput !== original.name ||
      description !== original.description ||
      content !== original.content);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasChanges) {
        event.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasChanges]);

  const discard = () => {
    if (original) {
      reset(original);
    }
  };

  return {
    original,
    nameInput,
    setNameInput,
    description,
    setDescription,
    content,
    setContent,
    hasChanges,
    reset,
    discard,
  };
}
