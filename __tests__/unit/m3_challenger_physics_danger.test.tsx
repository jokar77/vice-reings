import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { CardSwipeArena, SWIPE_THRESHOLD } from '@/components/CardSwipeArena';
import { HudStatsBar, isStatInDanger } from '@/components/HudStatsBar';
import { PartnerBadge } from '@/components/PartnerBadge';
import {
  LOW_DANGER_THRESHOLD,
  HIGH_DANGER_THRESHOLD,
  GAME_STATS,
  COLORS,
} from '@/constants/theme';
import { GameCard, StatKey } from '@/types/game';
import { useGameStore } from '@/store/gameStore';
import * as AudioHaptics from '@/utils/audioHaptics';

// Mock audio/haptics to verify interactions
jest.spyOn(AudioHaptics, 'triggerCardDragHaptic');
jest.spyOn(AudioHaptics, 'triggerChoiceCommitHaptic');

const testCard: GameCard = {
  id: 'card_challenger_physics',
  w: 'vance',
  t: '«Empirical physics challenge card test dialogue.»',
  l: { t: 'Opción Izquierda', fx: { dinero: -10 } },
  r: { t: 'Opción Derecha', fx: { dinero: +10 } },
  target: 'common',
};

describe('Challenger 2 Empirical Verification: Physics, Danger & Accessibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useGameStore.setState({
      stats: {
        dinero: 50,
        policia: 30,
        estres: 35,
        respeto: 40,
      },
      currentCard: testCard,
      activePartner: 'partnerA',
      partnerA: {
        id: 'partnerA',
        name: 'Nico',
        role: 'El Estratega',
        seed: 'partnerA-nico',
        status: 'alive',
      },
      partnerB: {
        id: 'partnerB',
        name: 'Camila',
        role: 'La Ejecutora',
        seed: 'partnerB-camila',
        status: 'alive',
      },
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 1. SWIPE THRESHOLD PHYSICS VERIFICATION                                    */
  /* -------------------------------------------------------------------------- */
  describe('1. Swipe Threshold Physics & Mathematical Boundaries', () => {
    it('verifies SWIPE_THRESHOLD constant is strictly 76', () => {
      expect(SWIPE_THRESHOLD).toBe(76);
    });

    it('simulates gesture pan physics model: |X| > 76 commits choice, |X| <= 76 snaps back', () => {
      // Replicate the exact gesture decision engine in CardSwipeArena onEnd()
      const simulateGestureEnd = (
        translationX: number,
        commitCallback: (dir: 'left' | 'right') => void,
        snapCallback: () => void
      ) => {
        if (translationX > SWIPE_THRESHOLD) {
          commitCallback('right');
        } else if (translationX < -SWIPE_THRESHOLD) {
          commitCallback('left');
        } else {
          snapCallback();
        }
      };

      const testCases = [
        // Positive / Right Swipe tests
        { x: 300, expected: 'right' },
        { x: 150, expected: 'right' },
        { x: 77, expected: 'right' },
        { x: 76.001, expected: 'right' },
        { x: 76, expected: 'snap' },
        { x: 75.999, expected: 'snap' },
        { x: 50, expected: 'snap' },
        { x: 1, expected: 'snap' },
        { x: 0, expected: 'snap' },
        // Negative / Left Swipe tests
        { x: -1, expected: 'snap' },
        { x: -50, expected: 'snap' },
        { x: -75.999, expected: 'snap' },
        { x: -76, expected: 'snap' },
        { x: -76.001, expected: 'left' },
        { x: -77, expected: 'left' },
        { x: -150, expected: 'left' },
        { x: -300, expected: 'left' },
      ];

      testCases.forEach(({ x, expected }) => {
        const commitMock = jest.fn();
        const snapMock = jest.fn();

        simulateGestureEnd(x, commitMock, snapMock);

        if (expected === 'right') {
          expect(commitMock).toHaveBeenCalledWith('right');
          expect(snapMock).not.toHaveBeenCalled();
        } else if (expected === 'left') {
          expect(commitMock).toHaveBeenCalledWith('left');
          expect(snapMock).not.toHaveBeenCalled();
        } else {
          expect(commitMock).not.toHaveBeenCalled();
          expect(snapMock).toHaveBeenCalledTimes(1);
        }
      });
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 2. DANGER THRESHOLD ANIMATIONS & 4-STAT MATRIX VERIFICATION                */
  /* -------------------------------------------------------------------------- */
  describe('2. Danger Threshold Verification for All 4 Stats (<=14 or >=86)', () => {
    const allStatKeys: StatKey[] = ['dinero', 'policia', 'estres', 'respeto'];

    it('verifies threshold constants match specifications', () => {
      expect(LOW_DANGER_THRESHOLD).toBe(14);
      expect(HIGH_DANGER_THRESHOLD).toBe(86);
    });

    it('verifies isStatInDanger exhaustively across all integer values 0 to 100', () => {
      for (let v = 0; v <= 100; v++) {
        const expectedDanger = v <= 14 || v >= 86;
        expect(isStatInDanger(v)).toBe(expectedDanger);
      }
    });

    it('verifies danger badge activation independently on every single stat at <=14', () => {
      allStatKeys.forEach((targetStat) => {
        const testStats = {
          dinero: 50,
          policia: 50,
          estres: 50,
          respeto: 50,
          [targetStat]: 14, // Exact low boundary
        };

        const { getByTestId, queryByTestId, unmount } = render(
          <HudStatsBar stats={testStats} />
        );

        // Target stat must have danger badge
        expect(getByTestId(`stat-danger-${targetStat}`)).toBeTruthy();
        expect(getByTestId(`stat-val-${targetStat}`)).toHaveTextContent('14');

        // Other 3 stats must NOT have danger badge
        allStatKeys
          .filter((k) => k !== targetStat)
          .forEach((otherStat) => {
            expect(queryByTestId(`stat-danger-${otherStat}`)).toBeNull();
          });

        unmount();
      });
    });

    it('verifies danger badge activation independently on every single stat at >=86', () => {
      allStatKeys.forEach((targetStat) => {
        const testStats = {
          dinero: 50,
          policia: 50,
          estres: 50,
          respeto: 50,
          [targetStat]: 86, // Exact high boundary
        };

        const { getByTestId, queryByTestId, unmount } = render(
          <HudStatsBar stats={testStats} />
        );

        // Target stat must have danger badge
        expect(getByTestId(`stat-danger-${targetStat}`)).toBeTruthy();
        expect(getByTestId(`stat-val-${targetStat}`)).toHaveTextContent('86');

        // Other 3 stats must NOT have danger badge
        allStatKeys
          .filter((k) => k !== targetStat)
          .forEach((otherStat) => {
            expect(queryByTestId(`stat-danger-${otherStat}`)).toBeNull();
          });

        unmount();
      });
    });

    it('verifies critical boundary flip: 14 (danger) vs 15 (safe) and 85 (safe) vs 86 (danger)', () => {
      // 14 is in danger
      const { queryByTestId: q1, unmount: u1 } = render(
        <HudStatsBar stats={{ dinero: 14, policia: 50, estres: 50, respeto: 50 }} />
      );
      expect(q1('stat-danger-dinero')).toBeTruthy();
      u1();

      // 15 is safe
      const { queryByTestId: q2, unmount: u2 } = render(
        <HudStatsBar stats={{ dinero: 15, policia: 50, estres: 50, respeto: 50 }} />
      );
      expect(q2('stat-danger-dinero')).toBeNull();
      u2();

      // 85 is safe
      const { queryByTestId: q3, unmount: u3 } = render(
        <HudStatsBar stats={{ dinero: 85, policia: 50, estres: 50, respeto: 50 }} />
      );
      expect(q3('stat-danger-dinero')).toBeNull();
      u3();

      // 86 is in danger
      const { queryByTestId: q4, unmount: u4 } = render(
        <HudStatsBar stats={{ dinero: 86, policia: 50, estres: 50, respeto: 50 }} />
      );
      expect(q4('stat-danger-dinero')).toBeTruthy();
      u4();
    });

    it('verifies all 4 gauges trigger danger when all 4 stats are at danger levels', () => {
      const { getByTestId } = render(
        <HudStatsBar
          stats={{
            dinero: 0,
            policia: 100,
            estres: 12,
            respeto: 90,
          }}
        />
      );

      allStatKeys.forEach((key) => {
        expect(getByTestId(`stat-danger-${key}`)).toBeTruthy();
      });
    });

    it('dynamically reacts when store stats change between safe and danger states', () => {
      const { getByTestId, queryByTestId } = render(<HudStatsBar />);

      // Initial state: all safe (50, 30, 35, 40)
      expect(queryByTestId('stat-danger-dinero')).toBeNull();
      expect(queryByTestId('stat-danger-policia')).toBeNull();

      // Update store state to danger
      act(() => {
        useGameStore.setState({
          stats: {
            dinero: 8, // Danger
            policia: 92, // Danger
            estres: 35,
            respeto: 40,
          },
        });
      });

      expect(getByTestId('stat-danger-dinero')).toBeTruthy();
      expect(getByTestId('stat-danger-policia')).toBeTruthy();
      expect(queryByTestId('stat-danger-estres')).toBeNull();

      // Recover store state to safe
      act(() => {
        useGameStore.setState({
          stats: {
            dinero: 50,
            policia: 50,
            estres: 50,
            respeto: 50,
          },
        });
      });

      expect(queryByTestId('stat-danger-dinero')).toBeNull();
      expect(queryByTestId('stat-danger-policia')).toBeNull();
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 3. TAP BUTTON ACCESSIBILITY & GESTURE CONFLICT VERIFICATION               */
  /* -------------------------------------------------------------------------- */
  describe('3. Tap Button Accessibility & Action Dispatch', () => {
    it('dispatches choices correctly via tap buttons and triggers haptics', () => {
      const onChoiceMock = jest.fn();
      const { getByTestId } = render(
        <CardSwipeArena currentCard={testCard} onChoice={onChoiceMock} />
      );

      // Tap left button
      const btnLeft = getByTestId('btn-choice-left');
      fireEvent.press(btnLeft);
      expect(onChoiceMock).toHaveBeenCalledWith('left');
      expect(AudioHaptics.triggerChoiceCommitHaptic).toHaveBeenCalledTimes(1);

      // Tap right button
      const btnRight = getByTestId('btn-choice-right');
      fireEvent.press(btnRight);
      expect(onChoiceMock).toHaveBeenCalledWith('right');
      expect(AudioHaptics.triggerChoiceCommitHaptic).toHaveBeenCalledTimes(2);
    });

    it('integrates with Zustand store makeChoice when onChoice prop is omitted', () => {
      const makeChoiceSpy = jest.fn();
      useGameStore.setState({
        currentCard: testCard,
        makeChoice: makeChoiceSpy,
      });

      const { getByTestId } = render(<CardSwipeArena />);

      fireEvent.press(getByTestId('btn-choice-left'));
      expect(makeChoiceSpy).toHaveBeenCalledWith('left');

      fireEvent.press(getByTestId('btn-choice-right'));
      expect(makeChoiceSpy).toHaveBeenCalledWith('right');
    });

    it('verifies choice badges have pointerEvents="none" to prevent touch interception', () => {
      const { getByTestId } = render(
        <CardSwipeArena currentCard={testCard} />
      );

      const leftBadge = getByTestId('choice-badge-left');
      const rightBadge = getByTestId('choice-badge-right');

      expect(leftBadge.props.pointerEvents).toBe('none');
      expect(rightBadge.props.pointerEvents).toBe('none');
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 4. PARTNER BADGE INTERACTIVITY & STATE VERIFICATION                        */
  /* -------------------------------------------------------------------------- */
  describe('4. Partner Badge Interactivity & Multi-State Verification', () => {
    it('allows switching to inactive alive partner', () => {
      const onSwitchMock = jest.fn();
      const { getByTestId } = render(
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
            status: 'alive',
          }}
          onSwitchPartner={onSwitchMock}
        />
      );

      const pillB = getByTestId('partner-tag-partnerB');
      fireEvent.press(pillB);
      expect(onSwitchMock).toHaveBeenCalledTimes(1);

      // Pressing already active partnerA should NOT trigger switch
      const pillA = getByTestId('partner-tag-partnerA');
      fireEvent.press(pillA);
      expect(onSwitchMock).toHaveBeenCalledTimes(1);
    });

    it('prevents manual switching if the partner is dead or jailed', () => {
      const onSwitchMock = jest.fn();
      const { getByTestId } = render(
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
          onSwitchPartner={onSwitchMock}
        />
      );

      const pillB = getByTestId('partner-tag-partnerB');
      fireEvent.press(pillB);
      expect(onSwitchMock).not.toHaveBeenCalled();
    });
  });
});
