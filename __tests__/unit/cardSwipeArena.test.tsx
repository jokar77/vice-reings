import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CardSwipeArena } from '@/components/CardSwipeArena';
import { GameCard } from '@/types/game';
import { useGameStore } from '@/store/gameStore';

const mockCard: GameCard = {
  id: 'card_test_vance',
  w: 'vance',
  t: '«Mis patrullas están confiscando un cargamento tuyo en el puerto. Paga el soborno.»',
  l: { t: 'Paga el soborno', fx: { dinero: -20, policia: -15 } },
  r: { t: 'Que se lo queden', fx: { dinero: 10, policia: 10 } },
  target: 'common',
};

const mockNextCard: GameCard = {
  id: 'card_test_lexi',
  w: 'lexi',
  t: '«Tengo un VIP en la sala privada...»',
  l: { t: 'Dáselo', fx: {} },
  r: { t: 'Échalo del club', fx: {} },
  target: 'common',
};

describe('CardSwipeArena - Reanimated & Gesture Card Stack UI', () => {
  describe('1. Active Card Elements Rendering', () => {
    it('renders speaker name, role, dialogue narrative, and choice options', () => {
      const { getByTestId, getAllByText } = render(
        <CardSwipeArena currentCard={mockCard} />
      );

      expect(getByTestId('card-swipe-arena')).toBeTruthy();
      expect(getByTestId('swipe-card-active')).toBeTruthy();
      expect(getByTestId('character-portrait')).toBeTruthy();

      // Speaker details
      expect(getByTestId('character-name')).toHaveTextContent('Teniente Vance');
      expect(getByTestId('character-role')).toHaveTextContent('Policía de Vice Shores');

      // Dialogue text
      expect(getByTestId('card-dialogue-text')).toHaveTextContent(mockCard.t);

      // Choice Badges & Fallback Buttons
      expect(getByTestId('choice-badge-left')).toBeTruthy();
      expect(getByTestId('choice-badge-right')).toBeTruthy();
      expect(getByTestId('btn-choice-left')).toBeTruthy();
      expect(getByTestId('btn-choice-right')).toBeTruthy();

      expect(getAllByText('Paga el soborno').length).toBeGreaterThanOrEqual(1);
      expect(getAllByText('Que se lo queden').length).toBeGreaterThanOrEqual(1);
    });

    it('renders stack preview card when nextCard is provided', () => {
      const { getByTestId } = render(
        <CardSwipeArena currentCard={mockCard} nextCard={mockNextCard} />
      );

      expect(getByTestId('swipe-card-preview')).toBeTruthy();
    });

    it('renders empty placeholder when currentCard is null', () => {
      const { getByTestId, getByText } = render(
        <CardSwipeArena currentCard={null} />
      );

      expect(getByTestId('card-swipe-arena')).toBeTruthy();
      expect(getByText('El imperio aguarda...')).toBeTruthy();
    });
  });

  describe('2. Choice Dispatching via Fallback Tap Buttons', () => {
    it('dispatches "left" choice when left button is pressed', () => {
      const onChoiceMock = jest.fn();
      const { getByTestId } = render(
        <CardSwipeArena currentCard={mockCard} onChoice={onChoiceMock} />
      );

      const btnLeft = getByTestId('btn-choice-left');
      fireEvent.press(btnLeft);

      expect(onChoiceMock).toHaveBeenCalledTimes(1);
      expect(onChoiceMock).toHaveBeenCalledWith('left');
    });

    it('dispatches "right" choice when right button is pressed', () => {
      const onChoiceMock = jest.fn();
      const { getByTestId } = render(
        <CardSwipeArena currentCard={mockCard} onChoice={onChoiceMock} />
      );

      const btnRight = getByTestId('btn-choice-right');
      fireEvent.press(btnRight);

      expect(onChoiceMock).toHaveBeenCalledTimes(1);
      expect(onChoiceMock).toHaveBeenCalledWith('right');
    });

    it('dispatches choice to Zustand store when onChoice prop is omitted', () => {
      const makeChoiceSpy = jest.fn();
      useGameStore.setState({
        currentCard: mockCard,
        makeChoice: makeChoiceSpy,
      });

      const { getByTestId } = render(<CardSwipeArena />);

      fireEvent.press(getByTestId('btn-choice-left'));
      expect(makeChoiceSpy).toHaveBeenCalledWith('left');

      fireEvent.press(getByTestId('btn-choice-right'));
      expect(makeChoiceSpy).toHaveBeenCalledWith('right');
    });
  });
});
