import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import App from '../../App';
import { useGameStore } from '@/store/gameStore';
import { INITIAL_DECK } from '@/constants/deck';
import { BACKGROUND_COLORS } from '@/constants/theme';
import { ENDINGS } from '@/constants/endings';

describe('App Root - Screen Flow, Dynamic Backgrounds & Navigation', () => {
  beforeEach(() => {
    act(() => {
      useGameStore.getState().resetGame();
    });
  });

  describe('1. Full App Mounting & Hierarchy', () => {
    it('mounts all core screen components properly', () => {
      const { getByTestId } = render(<App />);

      expect(getByTestId('app-root-container')).toBeTruthy();
      expect(getByTestId('app-header')).toBeTruthy();
      expect(getByTestId('app-header-title')).toHaveTextContent('VICE SHORES');
      expect(getByTestId('btn-open-empire-hub')).toBeTruthy();
      expect(getByTestId('hud-stats-bar')).toBeTruthy();
      expect(getByTestId('partner-badge')).toBeTruthy();
      expect(getByTestId('card-swipe-arena')).toBeTruthy();
    });
  });

  describe('2. Gear Modal Empire Hub Integration', () => {
    it('opens the Empire Hub modal when pressing the gear button', () => {
      const { getByTestId, queryByTestId } = render(<App />);

      expect(queryByTestId('empire-hub-close-btn')).toBeNull();
      expect(useGameStore.getState().isEmpireHubOpen).toBe(false);

      const gearBtn = getByTestId('btn-open-empire-hub');
      fireEvent.press(gearBtn);

      expect(useGameStore.getState().isEmpireHubOpen).toBe(true);
      expect(getByTestId('empire-hub-close-btn')).toBeTruthy();
    });
  });

  describe('3. Dynamic Background Tints', () => {
    it('updates background color when active card character environment changes', () => {
      // Find a card from 'street' and a card from 'ocean' or 'club'
      const clubCard = INITIAL_DECK.find((c) => c.w === 'lexi') || INITIAL_DECK[0];
      const oceanCard = INITIAL_DECK.find((c) => c.w === 'ruso') || INITIAL_DECK[1];

      act(() => {
        useGameStore.setState({ currentCard: clubCard });
      });

      const { getByTestId, rerender } = render(<App />);
      const rootContainer = getByTestId('app-root-container');

      expect(rootContainer.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: BACKGROUND_COLORS.club }),
        ])
      );

      act(() => {
        useGameStore.setState({ currentCard: oceanCard });
      });

      rerender(<App />);

      expect(rootContainer.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: BACKGROUND_COLORS.ocean }),
        ])
      );
    });
  });

  describe('4. Game Over Modal Integration', () => {
    it('displays Game Over modal when gameOver is true in store', () => {
      const { queryByTestId, getByTestId } = render(<App />);

      expect(queryByTestId('game-over-title')).toBeNull();

      act(() => {
        useGameStore.setState({
          gameOver: true,
          activeEnding: ENDINGS.policia_100,
        });
      });

      expect(getByTestId('game-over-title')).toHaveTextContent('BUSTED');
      expect(getByTestId('btn-continue-generation')).toBeTruthy();
    });
  });
});
