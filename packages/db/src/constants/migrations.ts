// These journaled migrations predate validation. Preserve their tags and timestamps.
export const LEGACY_MIGRATION_PREFIX_COLLISIONS = [
  ["0009_cuddly_quentin_quire", "0009_brief_union_jack"],
  ["0029_redundant_steel_serpent", "0029_spicy_network"],
] as const;
