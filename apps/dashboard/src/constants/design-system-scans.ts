const PROMPTS = [
  "what's the best option for AI-powered content generation right now",
  "looking for an alternative for AI-powered content generation",
  "can you recommend something for AI-powered content generation",
  "which AI content tools should a small team consider",
] as const;

export const DESIGN_SYSTEM_SCAN_MODELS = [
  "openai/gpt-5.6-sol",
  "anthropic/claude-opus-5",
  "anthropic/claude-fable-5.1",
] as const;

export const DESIGN_SYSTEM_SCAN_ANSWERS = Array.from(
  { length: 170 },
  (_, index) => ({
    id: `answer-${index + 1}`,
    prompt: PROMPTS[index % PROMPTS.length] ?? PROMPTS[0],
    engine:
      DESIGN_SYSTEM_SCAN_MODELS[index % DESIGN_SYSTEM_SCAN_MODELS.length] ??
      DESIGN_SYSTEM_SCAN_MODELS[0],
    language: "English",
    mentioned: index % 11 === 0,
    position: index % 11 === 0 ? (index % 5) + 1 : null,
    sources: 3 + (index % 18),
  })
);

export const DESIGN_SYSTEM_SCAN_MISSING = DESIGN_SYSTEM_SCAN_ANSWERS.slice(
  0,
  52
).map((row, index) => ({
  ...row,
  id: `missing-${index + 1}`,
}));
