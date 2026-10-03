const HASH_MODULUS = 2_147_483_647;

/** Stable string hash so sample and demo data agree across runs. */
export function hashInt(seed: string): number {
  let hash = 0;
  for (let index = 0; index < seed.length; index++) {
    hash = (hash * 31 + seed.charCodeAt(index)) % HASH_MODULUS;
  }
  return hash;
}

/** `hashInt` scaled to [0, 1). */
export function unit(seed: string): number {
  return hashInt(seed) / HASH_MODULUS;
}
