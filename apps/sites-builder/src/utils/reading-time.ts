import { WORDS_PER_MINUTE } from "../constants/entries";

export function readingMinutes(body: string | undefined): number {
  const words = (body ?? "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<[^>]+>/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}
