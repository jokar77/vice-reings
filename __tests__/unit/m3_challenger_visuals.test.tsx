import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import {
  PortraitSvg,
  getProceduralFeatures,
  SKIN_PALETTE,
  TINT_PALETTE,
} from '@/components/PortraitSvg';
import { HudStatsBar, isStatInDanger } from '@/components/HudStatsBar';
import { PartnerBadge } from '@/components/PartnerBadge';
import { CardSwipeArena, SWIPE_THRESHOLD } from '@/components/CardSwipeArena';
import { CHARACTERS } from '@/constants/characters';
import { BACKGROUND_COLORS, LOW_DANGER_THRESHOLD, HIGH_DANGER_THRESHOLD } from '@/constants/theme';
import { GameCard } from '@/types/game';

describe('Milestone 3 Challenger & Edge Cases Suite', () => {
  describe('1. Procedural Vector Portrait Stress & Cast Coverage', () => {
    it('successfully generates valid procedural portraits for all 10 canonical characters', () => {
      Object.values(CHARACTERS).forEach((char) => {
        const features = getProceduralFeatures(char.seed);
        expect(SKIN_PALETTE).toContain(features.skin);
        expect(TINT_PALETTE).toContain(features.tint);

        const { getByTestId, unmount } = render(
          <PortraitSvg seed={char.seed} testID={`portrait-${char.id}`} />
        );
        expect(getByTestId(`portrait-${char.id}`)).toBeTruthy();
        unmount();
      });
    });

    it('handles unicode, emojis, and special character seeds deterministically', () => {
      const complexSeed = '🌴_vïcë_shöres_🎮_#999_ñ!';
      const f1 = getProceduralFeatures(complexSeed);
      const f2 = getProceduralFeatures(complexSeed);

      expect(f1.seedNum).toBe(f2.seedNum);
      expect(f1.tint).toBe(f2.tint);
      expect(f1.skin).toBe(f2.skin);
    });

    it('handles very long seed strings without performance regression or errors', () => {
      const megaSeed = 'a'.repeat(2000);
      const features = getProceduralFeatures(megaSeed);
      expect(features.seedNum).toBeDefined();
      expect(typeof features.seedNum).toBe('number');
      expect(features.seedNum).toBeGreaterThanOrEqual(0);
    });
  });

  describe('2. HUD Danger State Boundary Stress Tests', () => {
    it('verifies exact boundary values (14, 15, 85, 86)', () => {
      // 14 is in danger (<= LOW_DANGER_THRESHOLD)
      expect(isStatInDanger(14)).toBe(true);
      expect(isStatInDanger(LOW_DANGER_THRESHOLD)).toBe(true);

      // 15 is safe (> LOW_DANGER_THRESHOLD)
      expect(isStatInDanger(15)).toBe(false);

      // 85 is safe (< HIGH_DANGER_THRESHOLD)
      expect(isStatInDanger(85)).toBe(false);

      // 86 is in danger (>= HIGH_DANGER_THRESHOLD)
      expect(isStatInDanger(86)).toBe(true);
      expect(isStatInDanger(HIGH_DANGER_THRESHOLD)).toBe(true);
    });

    it('renders all 4 gauges in danger when all stats are at extremes', () => {
      const { getByTestId } = render(
        <HudStatsBar
          stats={{
            dinero: 5,
            policia: 95,
            estres: 90,
            respeto: 10,
          }}
        />
      );

      expect(getByTestId('stat-danger-dinero')).toBeTruthy();
      expect(getByTestId('stat-danger-policia')).toBeTruthy();
      expect(getByTestId('stat-danger-estres')).toBeTruthy();
      expect(getByTestId('stat-danger-respeto')).toBeTruthy();
    });

    it('renders zero danger badges when all stats are in safe equilibrium', () => {
      const { queryByTestId } = render(
        <HudStatsBar
          stats={{
            dinero: 50,
            policia: 50,
            estres: 50,
            respeto: 50,
          }}
        />
      );

      expect(queryByTestId('stat-danger-dinero')).toBeNull();
      expect(queryByTestId('stat-danger-policia')).toBeNull();
      expect(queryByTestId('stat-danger-estres')).toBeNull();
      expect(queryByTestId('stat-danger-respeto')).toBeNull();
    });
  });

  describe('3. Dynamic Synthwave Environments Palette Integrity', () => {
    it('has all 5 environmental themes configured with hex colors', () => {
      expect(BACKGROUND_COLORS.street).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(BACKGROUND_COLORS.club).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(BACKGROUND_COLORS.ocean).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(BACKGROUND_COLORS.gas).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(BACKGROUND_COLORS.mansion).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('all characters map to an existing environmental background key', () => {
      Object.values(CHARACTERS).forEach((char) => {
        expect(BACKGROUND_COLORS[char.bg]).toBeDefined();
      });
    });
  });

  describe('4. Partner Badge Complex States', () => {
    it('renders jailed partner status with correct badge label', () => {
      const { getByText } = render(
        <PartnerBadge
          activePartner="partnerA"
          partnerA={{
            id: 'partnerA',
            name: 'Nico',
            role: 'El Estratega',
            seed: 'partnerA-nico',
            status: 'alive',
          }}
          partnerB={{
            id: 'partnerB',
            name: 'Camila',
            role: 'La Ejecutora',
            seed: 'partnerB-camila',
            status: 'jailed',
          }}
        />
      );

      expect(getByText('[PRESO]')).toBeTruthy();
    });
  });

  describe('5. Card Swipe Arena Gestures & Constants', () => {
    it('exposes SWIPE_THRESHOLD equal to 76', () => {
      expect(SWIPE_THRESHOLD).toBe(76);
    });

    it('renders card dialogue and handles sequential choices', () => {
      const onChoiceMock = jest.fn();
      const testCard: GameCard = {
        id: 'card_challenger_test',
        w: 'cody',
        t: '«Criptobro alert: ¿Hacemos el rug pull?»',
        l: { t: 'Vende todo', fx: { dinero: 35 } },
        r: { t: 'HODL', fx: { dinero: -15 } },
      };

      const { getByTestId } = render(
        <CardSwipeArena currentCard={testCard} onChoice={onChoiceMock} />
      );

      expect(getByTestId('card-dialogue-text')).toHaveTextContent(
        '«Criptobro alert: ¿Hacemos el rug pull?»'
      );

      fireEvent.press(getByTestId('btn-choice-left'));
      expect(onChoiceMock).toHaveBeenCalledWith('left');

      fireEvent.press(getByTestId('btn-choice-right'));
      expect(onChoiceMock).toHaveBeenCalledWith('right');
      expect(onChoiceMock).toHaveBeenCalledTimes(2);
    });
  });
});
