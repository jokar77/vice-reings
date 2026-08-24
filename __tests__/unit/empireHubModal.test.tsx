import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { EmpireHubModal } from '@/components/EmpireHubModal';
import { useGameStore } from '@/store/gameStore';
import { HistoryEntry } from '@/types/game';
import { INITIAL_PARTNER_A, INITIAL_PARTNER_B } from '@/constants/characters';

describe('EmpireHubModal - Dashboard, History & Match Metrics', () => {
  beforeEach(() => {
    useGameStore.setState({
      isEmpireHubOpen: false,
      turn: 5,
      generation: 1,
      moneyLaundered: 45000,
      partnerA: INITIAL_PARTNER_A,
      partnerB: INITIAL_PARTNER_B,
      history: [],
    });
  });

  describe('1. Visibility and Open/Close Flow', () => {
    it('is not visible by default when isEmpireHubOpen is false', () => {
      const { queryByTestId } = render(<EmpireHubModal />);
      expect(queryByTestId('empire-hub-backdrop')).toBeNull();
      expect(queryByTestId('empire-hub-close-btn')).toBeNull();
    });

    it('is visible when isOpen prop is true', () => {
      const { getByTestId } = render(<EmpireHubModal isOpen={true} />);
      expect(getByTestId('empire-hub-backdrop')).toBeTruthy();
      expect(getByTestId('empire-hub-close-btn')).toBeTruthy();
      expect(getByTestId('empire-hub-scroll-view')).toBeTruthy();
    });

    it('triggers onClose when close button is pressed', () => {
      const onCloseMock = jest.fn();
      const { getByTestId } = render(
        <EmpireHubModal isOpen={true} onClose={onCloseMock} />
      );

      const closeBtn = getByTestId('empire-hub-close-btn');
      fireEvent.press(closeBtn);

      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });

    it('triggers onClose when bottom close button is pressed', () => {
      const onCloseMock = jest.fn();
      const { getByTestId } = render(
        <EmpireHubModal isOpen={true} onClose={onCloseMock} />
      );

      const closeBottomBtn = getByTestId('empire-hub-close-bottom-btn');
      fireEvent.press(closeBottomBtn);

      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });

    it('triggers onClose when backdrop is tapped', () => {
      const onCloseMock = jest.fn();
      const { getByTestId } = render(
        <EmpireHubModal isOpen={true} onClose={onCloseMock} />
      );

      const backdrop = getByTestId('empire-hub-backdrop');
      fireEvent.press(backdrop);

      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('2. Match Metrics Rendering', () => {
    it('formats and displays match metrics correctly', () => {
      const { getByTestId } = render(
        <EmpireHubModal
          isOpen={true}
          turn={12}
          moneyLaundered={150000}
          generation={2}
          partnerA={{ ...INITIAL_PARTNER_A, status: 'alive' }}
          partnerB={{ ...INITIAL_PARTNER_B, status: 'jailed' }}
        />
      );

      expect(getByTestId('metric-years')).toHaveTextContent('12');
      expect(getByTestId('metric-money')).toHaveTextContent('$150,000');
      expect(getByTestId('metric-generation')).toHaveTextContent('Gen 2');
      expect(getByTestId('partner-status-a')).toHaveTextContent('Nico');
      expect(getByTestId('partner-status-a')).toHaveTextContent('ACTIVO');
      expect(getByTestId('partner-status-b')).toHaveTextContent('Camila');
      expect(getByTestId('partner-status-b')).toHaveTextContent('ENCARCELADA');
    });
  });

  describe('3. History List Rendering', () => {
    it('shows empty message when history is empty', () => {
      const { getByTestId, getByText } = render(
        <EmpireHubModal isOpen={true} history={[]} />
      );

      expect(getByTestId('history-empty-view')).toBeTruthy();
      expect(getByText(/No hay decisiones registradas/i)).toBeTruthy();
    });

    it('renders recent decision items with speaker, choice, and deltas', () => {
      const sampleHistory: HistoryEntry[] = [
        {
          id: 'hist-1',
          cardId: 'card-101',
          character: 'lexi',
          characterName: 'Lexi',
          text: '¿Quieres invertir en el club?',
          choiceText: 'Invertir $10k',
          direction: 'left',
          partnerId: 'partnerA',
          partnerName: 'Nico',
          statDeltas: { dinero: 20, policia: 10, estres: -5, respeto: 15 },
          timestamp: 1000,
        },
      ];

      const { getByTestId } = render(
        <EmpireHubModal isOpen={true} history={sampleHistory} />
      );

      expect(getByTestId('history-item-hist-1')).toBeTruthy();
      expect(getByTestId('history-speaker-hist-1')).toHaveTextContent('Lexi');
      expect(getByTestId('history-choice-hist-1')).toHaveTextContent('Invertir $10k');
      expect(getByTestId('history-deltas-hist-1')).toHaveTextContent('Dinero: +20');
      expect(getByTestId('history-deltas-hist-1')).toHaveTextContent('Búsqueda: +10');
      expect(getByTestId('history-deltas-hist-1')).toHaveTextContent('Estrés: -5');
      expect(getByTestId('history-deltas-hist-1')).toHaveTextContent('Reputación: +15');
    });
  });

  describe('4. Reset Action', () => {
    it('triggers onReset when clicking reset button', () => {
      const onResetMock = jest.fn();
      const onCloseMock = jest.fn();
      const { getByTestId } = render(
        <EmpireHubModal
          isOpen={true}
          onReset={onResetMock}
          onClose={onCloseMock}
        />
      );

      const resetBtn = getByTestId('empire-hub-reset-btn');
      fireEvent.press(resetBtn);

      expect(onResetMock).toHaveBeenCalledTimes(1);
      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });
  });
});
