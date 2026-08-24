import React from 'react';
import { render } from '@testing-library/react-native';
import { HudStatsBar, isStatInDanger } from '@/components/HudStatsBar';
import { LOW_DANGER_THRESHOLD, HIGH_DANGER_THRESHOLD, COLORS } from '@/constants/theme';
import { useGameStore } from '@/store/gameStore';

describe('HudStatsBar - Top HUD & Stat Gauges', () => {
  beforeEach(() => {
    useGameStore.setState({
      stats: {
        dinero: 50,
        policia: 30,
        estres: 35,
        respeto: 40,
      },
    });
  });

  describe('1. Danger Threshold Helper (isStatInDanger)', () => {
    it('identifies danger at or below LOW_DANGER_THRESHOLD (14)', () => {
      expect(isStatInDanger(0)).toBe(true);
      expect(isStatInDanger(5)).toBe(true);
      expect(isStatInDanger(14)).toBe(true);
      expect(isStatInDanger(LOW_DANGER_THRESHOLD)).toBe(true);
    });

    it('identifies danger at or above HIGH_DANGER_THRESHOLD (86)', () => {
      expect(isStatInDanger(86)).toBe(true);
      expect(isStatInDanger(95)).toBe(true);
      expect(isStatInDanger(100)).toBe(true);
      expect(isStatInDanger(HIGH_DANGER_THRESHOLD)).toBe(true);
    });

    it('identifies safe territory between 15 and 85', () => {
      expect(isStatInDanger(15)).toBe(false);
      expect(isStatInDanger(50)).toBe(false);
      expect(isStatInDanger(85)).toBe(false);
    });
  });

  describe('2. Component Rendering with Store Stats', () => {
    it('renders all 4 stat gauges with their names and values from store', () => {
      const { getByTestId, getByText } = render(<HudStatsBar />);

      expect(getByTestId('hud-stats-bar')).toBeTruthy();
      expect(getByTestId('stat-gauge-dinero')).toBeTruthy();
      expect(getByTestId('stat-gauge-policia')).toBeTruthy();
      expect(getByTestId('stat-gauge-estres')).toBeTruthy();
      expect(getByTestId('stat-gauge-respeto')).toBeTruthy();

      expect(getByText('Dinero')).toBeTruthy();
      expect(getByText('Búsqueda')).toBeTruthy();
      expect(getByText('Estrés')).toBeTruthy();
      expect(getByText('Reputación')).toBeTruthy();

      expect(getByTestId('stat-val-dinero')).toHaveTextContent('50');
      expect(getByTestId('stat-val-policia')).toHaveTextContent('30');
      expect(getByTestId('stat-val-estres')).toHaveTextContent('35');
      expect(getByTestId('stat-val-respeto')).toHaveTextContent('40');
    });

    it('calculates width percentage accurately on progress bars', () => {
      const { getByTestId } = render(
        <HudStatsBar
          stats={{
            dinero: 75,
            policia: 20,
            estres: 60,
            respeto: 90,
          }}
        />
      );

      const barDinero = getByTestId('stat-bar-dinero');
      const barPolicia = getByTestId('stat-bar-policia');

      expect(barDinero.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            width: '75%',
          }),
        ])
      );

      expect(barPolicia.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            width: '20%',
          }),
        ])
      );
    });
  });

  describe('3. Danger State Triggers & Badges', () => {
    it('displays danger indicators when stats are at or beyond boundary thresholds', () => {
      const { getByTestId, queryByTestId } = render(
        <HudStatsBar
          stats={{
            dinero: 10, // Danger low (<=14)
            policia: 90, // Danger high (>=86)
            estres: 50, // Safe
            respeto: 40, // Safe
          }}
        />
      );

      expect(getByTestId('stat-danger-dinero')).toBeTruthy();
      expect(getByTestId('stat-danger-policia')).toBeTruthy();
      expect(queryByTestId('stat-danger-estres')).toBeNull();
      expect(queryByTestId('stat-danger-respeto')).toBeNull();
    });

    it('clamps stat values outside 0-100 range', () => {
      const { getByTestId } = render(
        <HudStatsBar
          stats={{
            dinero: -20,
            policia: 150,
            estres: 50,
            respeto: 50,
          }}
        />
      );

      expect(getByTestId('stat-val-dinero')).toHaveTextContent('0');
      expect(getByTestId('stat-val-policia')).toHaveTextContent('100');

      const barDinero = getByTestId('stat-bar-dinero');
      const barPolicia = getByTestId('stat-bar-policia');

      expect(barDinero.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            width: '0%',
          }),
        ])
      );

      expect(barPolicia.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            width: '100%',
          }),
        ])
      );
    });
  });
});
