/**
 * FNV-1a 32-bit string hashing algorithm.
 * Deterministically turns any string seed into a positive 32-bit unsigned integer.
 */
export const hashSeed = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0);
};

/**
 * Standard Mulberry32 deterministic pseudo-random number generator.
 * Produces high-quality uniform floats in [0, 1).
 */
export const createMulberry32 = (seedVal: number) => {
  let a = (seedVal || 1) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/**
 * Fast xor-shift / imul PRNG compatible with Vice Shores HTML reference.
 */
export const createRng = (seedVal: number) => {
  let x = (seedVal || 1) >>> 0;
  return () => {
    x = (Math.imul(x ^ (x >>> 15), 2246822507) ^ Math.imul(x ^ (x >>> 13), 3266489909)) >>> 0;
    return x / 4294967296;
  };
};

/**
 * Deterministically pick an element from an array given a seed.
 */
export const deterministicChoice = <T>(items: T[], seed: number | string): T => {
  if (!items || items.length === 0) {
    throw new Error('Cannot pick from empty array');
  }
  const seedNum = typeof seed === 'string' ? hashSeed(seed) : seed;
  const rng = createMulberry32(seedNum);
  const index = Math.floor(rng() * items.length);
  return items[index];
};

/**
 * Deterministically generate a random float between min and max.
 */
export const deterministicRange = (min: number, max: number, seed: number | string): number => {
  const seedNum = typeof seed === 'string' ? hashSeed(seed) : seed;
  const rng = createMulberry32(seedNum);
  return min + rng() * (max - min);
};
