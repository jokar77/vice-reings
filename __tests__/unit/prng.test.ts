import {
  createMulberry32,
  createRng,
  deterministicChoice,
  deterministicRange,
  hashSeed,
} from '../../src/utils/prng';

describe('PRNG & Hashing Utilities', () => {
  describe('hashSeed (FNV-1a)', () => {
    it('returns consistent deterministic hash for the same string', () => {
      const hash1 = hashSeed('camila-66');
      const hash2 = hashSeed('camila-66');
      expect(hash1).toBe(hash2);
      expect(typeof hash1).toBe('number');
      expect(hash1).toBeGreaterThanOrEqual(0);
    });

    it('returns different hashes for different string seeds', () => {
      const hashA = hashSeed('vance-01');
      const hashB = hashSeed('lexi-99');
      const hashC = hashSeed('ruso-33');
      expect(hashA).not.toBe(hashB);
      expect(hashB).not.toBe(hashC);
    });

    it('handles empty string without throwing', () => {
      const hashEmpty = hashSeed('');
      expect(typeof hashEmpty).toBe('number');
      expect(hashEmpty).toBeGreaterThanOrEqual(0);
    });
  });

  describe('createMulberry32', () => {
    it('generates identical sequence of numbers for same seed', () => {
      const rng1 = createMulberry32(12345);
      const rng2 = createMulberry32(12345);

      const seq1 = [rng1(), rng1(), rng1(), rng1(), rng1()];
      const seq2 = [rng2(), rng2(), rng2(), rng2(), rng2()];

      expect(seq1).toEqual(seq2);
    });

    it('generates values within uniform [0, 1) range', () => {
      const rng = createMulberry32(987654);
      for (let i = 0; i < 100; i++) {
        const val = rng();
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(1);
      }
    });

    it('handles 0 seed gracefully by defaulting to 1', () => {
      const rng = createMulberry32(0);
      const val = rng();
      expect(typeof val).toBe('number');
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    });
  });

  describe('createRng (Reference PRNG)', () => {
    it('produces deterministic output stream', () => {
      const rngA = createRng(42);
      const rngB = createRng(42);

      expect(rngA()).toBe(rngB());
      expect(rngA()).toBe(rngB());
      expect(rngA()).toBe(rngB());
    });
  });

  describe('deterministicChoice', () => {
    const items = ['apple', 'banana', 'cherry', 'date', 'elderberry'];

    it('picks the same item for the same string seed', () => {
      const pick1 = deterministicChoice(items, 'fixed-seed-abc');
      const pick2 = deterministicChoice(items, 'fixed-seed-abc');
      expect(pick1).toBe(pick2);
      expect(items).toContain(pick1);
    });

    it('throws when array is empty', () => {
      expect(() => deterministicChoice([], 'test')).toThrow('Cannot pick from empty array');
    });
  });

  describe('deterministicRange', () => {
    it('produces number within [min, max] range deterministically', () => {
      const val1 = deterministicRange(10, 50, 'seed-123');
      const val2 = deterministicRange(10, 50, 'seed-123');
      expect(val1).toBe(val2);
      expect(val1).toBeGreaterThanOrEqual(10);
      expect(val1).toBeLessThanOrEqual(50);
    });
  });
});
