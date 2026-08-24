import React from 'react';
import { render } from '@testing-library/react-native';
import {
  PortraitSvg,
  ProceduralPortrait,
  SKIN_PALETTE,
  TINT_PALETTE,
  getProceduralFeatures,
} from '@/components/PortraitSvg';

describe('PortraitSvg - Procedural Synthwave Vector Portrait Engine', () => {
  describe('1. Determinism and Seed Hashing', () => {
    it('produces identical procedural features for identical seeds', () => {
      const f1 = getProceduralFeatures('vance-01');
      const f2 = getProceduralFeatures('vance-01');

      expect(f1.seedNum).toBe(f2.seedNum);
      expect(f1.tint).toBe(f2.tint);
      expect(f1.skin).toBe(f2.skin);
      expect(f1.collarTint).toBe(f2.collarTint);
      expect(f1.hairTint).toBe(f2.hairTint);
      expect(f1.glassesTint).toBe(f2.glassesTint);
      expect(f1.hairIndex).toBe(f2.hairIndex);
      expect(f1.glassesIndex).toBe(f2.glassesIndex);
      expect(f1.accIndex).toBe(f2.accIndex);
    });

    it('produces different feature sets for different character seeds', () => {
      const fVance = getProceduralFeatures('vance-01');
      const fLexi = getProceduralFeatures('lexi-99');
      const fRuso = getProceduralFeatures('ruso-33');

      // The seed numbers must be distinct
      expect(fVance.seedNum).not.toBe(fLexi.seedNum);
      expect(fLexi.seedNum).not.toBe(fRuso.seedNum);
    });

    it('safely handles empty, null, or undefined seeds with consistent fallback', () => {
      const fEmpty = getProceduralFeatures('');
      const fNull = getProceduralFeatures(null);
      const fUndefined = getProceduralFeatures(undefined);
      const fWhitespace = getProceduralFeatures('   ');

      expect(fEmpty.seedNum).toBe(fNull.seedNum);
      expect(fNull.seedNum).toBe(fUndefined.seedNum);
      expect(fWhitespace.seedNum).toBe(fEmpty.seedNum);
    });
  });

  describe('2. Palette Conformance & Range Boundaries', () => {
    it('always selects valid skin tones from the 6-tone SKIN_PALETTE', () => {
      const seeds = ['alpha', 'beta', 'gamma', 'delta', 'vance', 'lexi', 'ruso', 'cody', 'trey', 'isa'];
      seeds.forEach((seed) => {
        const features = getProceduralFeatures(seed);
        expect(SKIN_PALETTE).toContain(features.skin);
      });
    });

    it('always selects valid neon tints from the 6-color TINT_PALETTE', () => {
      const seeds = ['alpha', 'beta', 'gamma', 'delta', 'vance', 'lexi', 'ruso', 'cody', 'trey', 'isa'];
      seeds.forEach((seed) => {
        const features = getProceduralFeatures(seed);
        expect(TINT_PALETTE).toContain(features.tint);
        expect(TINT_PALETTE).toContain(features.collarTint);
        expect(TINT_PALETTE).toContain(features.hairTint);
        expect(TINT_PALETTE).toContain(features.glassesTint);
      });
    });

    it('restricts variant indices to their valid bounding ranges', () => {
      const seeds = Array.from({ length: 50 }, (_, i) => `character-test-seed-${i}`);
      seeds.forEach((seed) => {
        const features = getProceduralFeatures(seed);
        expect(features.hairIndex).toBeGreaterThanOrEqual(0);
        expect(features.hairIndex).toBeLessThan(4);

        expect(features.glassesIndex).toBeGreaterThanOrEqual(0);
        expect(features.glassesIndex).toBeLessThan(3);

        expect(features.accIndex).toBeGreaterThanOrEqual(0);
        expect(features.accIndex).toBeLessThan(4);
      });
    });
  });

  describe('3. Component Rendering & Hierarchy', () => {
    it('renders PortraitSvg with default dimensions and custom testID', () => {
      const { getByTestId } = render(
        <PortraitSvg seed="lexi-99" testID="custom-portrait" />
      );

      const rootSvg = getByTestId('custom-portrait');
      expect(rootSvg).toBeTruthy();
      expect(getByTestId('portrait-bg-tint')).toBeTruthy();
      expect(getByTestId('portrait-shoulders')).toBeTruthy();
      expect(getByTestId('portrait-collar')).toBeTruthy();
      expect(getByTestId('portrait-face')).toBeTruthy();
      expect(getByTestId('portrait-mouth')).toBeTruthy();
      expect(getByTestId('portrait-scanline-overlay')).toBeTruthy();
    });

    it('renders ProceduralPortrait alias with custom width and height', () => {
      const { getByTestId } = render(
        <ProceduralPortrait seed="ruso-33" width={400} height={300} testID="procedural-alias" />
      );

      const root = getByTestId('procedural-alias');
      expect(root).toBeTruthy();
    });

    it('renders hair and accessory variants based on seed without crashing', () => {
      const { getByTestId, rerender } = render(<PortraitSvg seed="test-1" />);
      expect(getByTestId('portrait-svg')).toBeTruthy();

      rerender(<PortraitSvg seed="test-2" />);
      expect(getByTestId('portrait-svg')).toBeTruthy();

      rerender(<PortraitSvg seed="test-3" />);
      expect(getByTestId('portrait-svg')).toBeTruthy();

      rerender(<PortraitSvg seed="test-4" />);
      expect(getByTestId('portrait-svg')).toBeTruthy();
    });
  });
});
