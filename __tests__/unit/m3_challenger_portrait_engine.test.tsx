import React from 'react';
import { render } from '@testing-library/react-native';
import { processColor } from 'react-native';
import {
  PortraitSvg,
  ProceduralPortrait,
  SKIN_PALETTE,
  TINT_PALETTE,
  getProceduralFeatures,
} from '@/components/PortraitSvg';
import { CHARACTERS, INITIAL_PARTNERS } from '@/constants/characters';
import { hashSeed } from '@/utils/prng';

describe('Milestone 3 Challenger - Procedural SVG Portrait Engine Empirical Stress Harness', () => {
  const CANONICAL_SEEDS = [
    ...Object.values(CHARACTERS).map((c) => c.seed),
    INITIAL_PARTNERS.partnerA.seed,
    INITIAL_PARTNERS.partnerB.seed,
  ];

  describe('1. Determinism and Idempotency Verification', () => {
    it('guarantees bitwise deterministic procedural features across 1,000 iterations for all canonical cast seeds', () => {
      CANONICAL_SEEDS.forEach((seed) => {
        const baseline = getProceduralFeatures(seed);

        for (let i = 0; i < 1000; i++) {
          const sample = getProceduralFeatures(seed);
          expect(sample.seedNum).toBe(baseline.seedNum);
          expect(sample.tint).toBe(baseline.tint);
          expect(sample.skin).toBe(baseline.skin);
          expect(sample.collarTint).toBe(baseline.collarTint);
          expect(sample.hairTint).toBe(baseline.hairTint);
          expect(sample.glassesTint).toBe(baseline.glassesTint);
          expect(sample.hairIndex).toBe(baseline.hairIndex);
          expect(sample.glassesIndex).toBe(baseline.glassesIndex);
          expect(sample.accIndex).toBe(baseline.accIndex);
        }
      });
    });

    it('produces identical serialized component trees on repeated renders with identical seeds', () => {
      CANONICAL_SEEDS.forEach((seed) => {
        const tree1 = render(<PortraitSvg seed={seed} testID={`p-test-${seed}`} />).toJSON();
        const tree2 = render(<PortraitSvg seed={seed} testID={`p-test-${seed}`} />).toJSON();
        expect(JSON.stringify(tree1)).toBe(JSON.stringify(tree2));
      });
    });

    it('verifies FNV-1a hash function produces non-negative 32-bit unsigned integers', () => {
      const testCases = [
        'vance-01',
        'lexi-99',
        'ruso-33',
        'cody-777',
        'trey-22',
        'isa-55',
        'tommy-88',
        'manny-11',
        'broker-44',
        'camila-66',
        '',
        ' ',
        'a'.repeat(1000),
        '🌴_vice_shores_#1',
      ];

      testCases.forEach((tc) => {
        const hash = hashSeed(tc);
        expect(Number.isInteger(hash)).toBe(true);
        expect(hash).toBeGreaterThanOrEqual(0);
        expect(hash).toBeLessThanOrEqual(0xffffffff);
      });
    });
  });

  describe('2. Diversity and Visual Output Distinction Verification', () => {
    it('produces distinct seedNum hashes across all canonical cast characters', () => {
      const hashes = new Set(CANONICAL_SEEDS.map((s) => hashSeed(s)));
      expect(hashes.size).toBe(CANONICAL_SEEDS.length);
    });

    it('produces distinct procedural feature signatures across all canonical characters', () => {
      const signatures = new Set<string>();
      CANONICAL_SEEDS.forEach((seed) => {
        const f = getProceduralFeatures(seed);
        const sig = `${f.tint}-${f.skin}-${f.collarTint}-${f.hairTint}-${f.hairIndex}-${f.glassesIndex}-${f.accIndex}`;
        signatures.add(sig);
      });
      // All canonical characters have distinct visual feature tuples
      expect(signatures.size).toBe(CANONICAL_SEEDS.length);
    });

    it('covers all skin tones, neon tints, hair variants, glasses, and accessories across 500 random seeds', () => {
      const skinSet = new Set<string>();
      const tintSet = new Set<string>();
      const hairSet = new Set<number>();
      const glassesSet = new Set<number>();
      const accSet = new Set<number>();

      for (let i = 0; i < 500; i++) {
        const f = getProceduralFeatures(`entropy-seed-probe-${i * 37 + 13}`);
        skinSet.add(f.skin);
        tintSet.add(f.tint);
        hairSet.add(f.hairIndex);
        glassesSet.add(f.glassesIndex);
        accSet.add(f.accIndex);
      }

      // Must cover all 6 skin tones
      expect(skinSet.size).toBe(SKIN_PALETTE.length);
      SKIN_PALETTE.forEach((s) => expect(skinSet.has(s)).toBe(true));

      // Must cover all 6 neon tints
      expect(tintSet.size).toBe(TINT_PALETTE.length);
      TINT_PALETTE.forEach((t) => expect(tintSet.has(t)).toBe(true));

      // Must cover all 4 hair variants (0, 1, 2, 3)
      expect(hairSet.size).toBe(4);
      [0, 1, 2, 3].forEach((h) => expect(hairSet.has(h)).toBe(true));

      // Must cover all 3 glasses variants (0, 1, 2)
      expect(glassesSet.size).toBe(3);
      [0, 1, 2].forEach((g) => expect(glassesSet.has(g)).toBe(true));

      // Must cover all 4 accessory variants (0, 1, 2, 3)
      expect(accSet.size).toBe(4);
      [0, 1, 2, 3].forEach((a) => expect(accSet.has(a)).toBe(true));
    });
  });

  describe('3. Fallback, Malformed Seeds & Edge Case Stress Testing', () => {
    it('gracefully falls back to vice-shores-default on null, undefined, empty, and whitespace strings', () => {
      const defaultFeatures = getProceduralFeatures('vice-shores-default');

      const fallbacks = [
        getProceduralFeatures(null),
        getProceduralFeatures(undefined),
        getProceduralFeatures(''),
        getProceduralFeatures('   '),
        getProceduralFeatures('\t\n\r  \n'),
      ];

      fallbacks.forEach((f) => {
        expect(f.seedNum).toBe(defaultFeatures.seedNum);
        expect(f.tint).toBe(defaultFeatures.tint);
        expect(f.skin).toBe(defaultFeatures.skin);
        expect(f.collarTint).toBe(defaultFeatures.collarTint);
        expect(f.hairTint).toBe(defaultFeatures.hairTint);
        expect(f.hairIndex).toBe(defaultFeatures.hairIndex);
        expect(f.glassesIndex).toBe(defaultFeatures.glassesIndex);
        expect(f.accIndex).toBe(defaultFeatures.accIndex);
      });
    });

    it('safely parses extreme and adversarial character seeds without crashing', () => {
      const adversarialSeeds = [
        '🌴☀️🚗🍹Neon_Dreams_1986_#@!$%^&*()_+~`-=[]{}|;:",.<>?/',
        'ヴァイス・ショアーズ・ネオン', // Japanese CJK
        'Вице Шорес Неон 1986', // Cyrillic
        'شاطئ الرذيلة 1986', // Arabic
        '<script>alert("xss")</script><svg onload="exploit()"/>', // HTML injection
        "'; DROP TABLE characters;--", // SQL injection
        '\0\u0000\u0001\uFFFF\uD83D\uDE00', // Unicode control & surrogate chars
        'a'.repeat(25000), // Massive 25KB string
      ];

      adversarialSeeds.forEach((advSeed) => {
        const start = Date.now();
        const f = getProceduralFeatures(advSeed);
        const elapsed = Date.now() - start;

        expect(elapsed).toBeLessThan(100); // Must compute in under 100ms
        expect(typeof f.seedNum).toBe('number');
        expect(f.seedNum).toBeGreaterThanOrEqual(0);
        expect(SKIN_PALETTE).toContain(f.skin);
        expect(TINT_PALETTE).toContain(f.tint);
        expect(TINT_PALETTE).toContain(f.collarTint);
        expect(TINT_PALETTE).toContain(f.hairTint);
        expect(TINT_PALETTE).toContain(f.glassesTint);
        expect(f.hairIndex).toBeGreaterThanOrEqual(0);
        expect(f.hairIndex).toBeLessThan(4);
        expect(f.glassesIndex).toBeGreaterThanOrEqual(0);
        expect(f.glassesIndex).toBeLessThan(3);
        expect(f.accIndex).toBeGreaterThanOrEqual(0);
        expect(f.accIndex).toBeLessThan(4);

        // Verify component rendering doesn't throw
        expect(() => render(<PortraitSvg seed={advSeed} />)).not.toThrow();
      });
    });
  });

  describe('4. SVG Structural Conformance & Feature Mapping', () => {
    it('correctly binds procedural features to SVG sub-elements in the component tree', () => {
      const testSeed = 'lexi-99';
      const features = getProceduralFeatures(testSeed);
      const { getByTestId } = render(
        <PortraitSvg seed={testSeed} testID="portrait-test-root" />
      );

      const root = getByTestId('portrait-test-root');
      expect(root).toBeTruthy();

      const bgTint = getByTestId('portrait-bg-tint');
      expect(bgTint.props.fill).toEqual({ payload: processColor(features.tint), type: 0 });

      const collar = getByTestId('portrait-collar');
      expect(collar.props.fill).toEqual({ payload: processColor(features.collarTint), type: 0 });

      const face = getByTestId('portrait-face');
      expect(face.props.fill).toEqual({ payload: processColor(features.skin), type: 0 });

      // Verify hair component matches hairIndex
      expect(getByTestId(`portrait-hair-${features.hairIndex}`)).toBeTruthy();

      // Verify glasses component matches glassesIndex (if > 0)
      if (features.glassesIndex > 0) {
        expect(getByTestId(`portrait-glasses-${features.glassesIndex}`)).toBeTruthy();
      }

      // Verify accessory component matches accIndex (if > 0)
      if (features.accIndex > 0) {
        expect(getByTestId(`portrait-acc-${features.accIndex}`)).toBeTruthy();
      }

      const scanline = getByTestId('portrait-scanline-overlay');
      expect(scanline).toBeTruthy();
    });
  });
});
