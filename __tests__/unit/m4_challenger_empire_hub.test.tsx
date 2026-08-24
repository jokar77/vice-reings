import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { EmpireHubModal } from '@/components/EmpireHubModal';
import App from '../../App';
import { useGameStore } from '@/store/gameStore';
import { HistoryEntry, GameCard } from '@/types/game';
import { INITIAL_PARTNER_A, INITIAL_PARTNER_B } from '@/constants/characters';
import * as audioHaptics from '@/utils/audioHaptics';

describe('M4 Empirical Challenge: EmpireHubModal, Bounding & Screen Flow', () => {
  let hapticSpy: jest.SpyInstance;

  beforeEach(() => {
    hapticSpy = jest.spyOn(audioHaptics, 'triggerImpactLightHaptic').mockImplementation(() => Promise.resolve());
    act(() => {
      useGameStore.getState().resetGame();
    });
  });

  afterEach(() => {
    hapticSpy.mockRestore();
  });

  describe('1. History List Bounding (Stress Test: 100 choices -> exactly 50 entries)', () => {
    it('bounds history to exactly 50 entries when 100 choices are executed sequentially', () => {
      // Mock safe card that will not trigger instant boundary death
      const safeCard: GameCard = {
        id: 'card-safe-test',
        w: 'lexi',
        t: 'Testing narrative choice',
        l: { t: 'Option A', fx: { dinero: 5, estres: 0, policia: 0, respeto: 0 } },
        r: { t: 'Option B', fx: { dinero: -5, estres: 0, policia: 0, respeto: 0 } },
      };

      // Set baseline store state with safe stats to survive 100 turns starting at turn 1
      act(() => {
        useGameStore.setState({
          stats: { dinero: 50, policia: 50, estres: 50, respeto: 50 },
          turn: 1,
          moneyLaundered: 0,
          currentCard: safeCard,
          gameOver: false,
          history: [],
        });
      });

      // Execute 100 choices (turns 1 through 100)
      for (let i = 1; i <= 100; i++) {
        act(() => {
          // Keep currentCard constant so game doesn't run out of cards or end
          useGameStore.setState({
            currentCard: safeCard,
            gameOver: false,
            stats: { dinero: 50, policia: 50, estres: 50, respeto: 50 },
          });
          useGameStore.getState().makeChoice(i % 2 === 0 ? 'left' : 'right');
        });
      }

      const finalState = useGameStore.getState();
      expect(finalState.history.length).toBe(50);
      expect(finalState.turn).toBe(101);

      // Verify that newest items are preserved and older items are evicted (FIFO)
      // The newest entry (choice made during turn 100) should be at index 0
      expect(finalState.history[0].id).toContain('hist_100_');
      // The 50th newest entry (choice made during turn 51) should be at index 49
      expect(finalState.history[49].id).toContain('hist_51_');

      // Now render EmpireHubModal with the store state
      act(() => {
        useGameStore.getState().openEmpireHub();
      });

      const { getByTestId, getByText, queryByTestId } = render(<EmpireHubModal />);

      // Verify history count header shows 50 / 50
      expect(getByText('50 / 50')).toBeTruthy();

      // Verify exactly 50 history entries are rendered in the list (turns 51 to 100)
      for (let i = 0; i < 50; i++) {
        expect(getByTestId(`history-choice-${finalState.history[i].id}`)).toBeTruthy();
      }

      // Check that choice #1 to #50 were purged
      expect(queryByTestId('history-item-hist_1_')).toBeNull();
      expect(queryByTestId('history-item-hist_50_')).toBeNull();
    });

    it('renders empty state correctly when history is empty', () => {
      const { getByTestId, getByText } = render(
        <EmpireHubModal isOpen={true} history={[]} />
      );

      expect(getByTestId('history-empty-view')).toBeTruthy();
      expect(getByText('0 / 50')).toBeTruthy();
      expect(getByText(/No hay decisiones registradas/i)).toBeTruthy();
    });

    it('renders partial history list with correct counter badge for 5 entries', () => {
      const fiveEntries: HistoryEntry[] = Array.from({ length: 5 }, (_, i) => ({
        id: `custom-hist-${i}`,
        cardId: `card-${i}`,
        character: 'lexi',
        characterName: 'Valeria',
        text: `Narrative question ${i}`,
        choiceText: `Decision ${i}`,
        direction: i % 2 === 0 ? 'left' : 'right',
        partnerId: 'partnerA',
        partnerName: 'Nico',
        statDeltas: { dinero: 10, estres: 5 },
        timestamp: Date.now() - i * 1000,
      }));

      const { getByText, getByTestId } = render(
        <EmpireHubModal isOpen={true} history={fiveEntries} />
      );

      expect(getByText('5 / 50')).toBeTruthy();
      expect(getByTestId('history-item-custom-hist-0')).toBeTruthy();
      expect(getByTestId('history-item-custom-hist-4')).toBeTruthy();
    });
  });

  describe('2. Modal Open/Close Transitions and Backdrop Dismissal', () => {
    it('opens cleanly upon gear button press in full App and closes on backdrop tap', () => {
      const { getByTestId, queryByTestId } = render(<App />);

      // Initial state: modal closed
      expect(useGameStore.getState().isEmpireHubOpen).toBe(false);
      expect(queryByTestId('empire-hub-close-btn')).toBeNull();

      // Press gear button
      const gearBtn = getByTestId('btn-open-empire-hub');
      fireEvent.press(gearBtn);

      // Verify opened
      expect(useGameStore.getState().isEmpireHubOpen).toBe(true);
      expect(getByTestId('empire-hub-close-btn')).toBeTruthy();
      expect(hapticSpy).toHaveBeenCalled();

      // Tap backdrop
      const backdrop = getByTestId('empire-hub-backdrop');
      fireEvent.press(backdrop);

      // Verify closed
      expect(useGameStore.getState().isEmpireHubOpen).toBe(false);
      expect(queryByTestId('empire-hub-close-btn')).toBeNull();
    });

    it('closes cleanly upon top close button press with haptic trigger', () => {
      act(() => {
        useGameStore.getState().openEmpireHub();
      });

      const { getByTestId, queryByTestId } = render(<App />);
      expect(getByTestId('empire-hub-close-btn')).toBeTruthy();

      fireEvent.press(getByTestId('empire-hub-close-btn'));

      expect(useGameStore.getState().isEmpireHubOpen).toBe(false);
      expect(queryByTestId('empire-hub-close-btn')).toBeNull();
      expect(hapticSpy).toHaveBeenCalled();
    });

    it('closes cleanly upon bottom close button press with haptic trigger', () => {
      act(() => {
        useGameStore.getState().openEmpireHub();
      });

      const { getByTestId, queryByTestId } = render(<App />);
      expect(getByTestId('empire-hub-close-bottom-btn')).toBeTruthy();

      fireEvent.press(getByTestId('empire-hub-close-bottom-btn'));

      expect(useGameStore.getState().isEmpireHubOpen).toBe(false);
      expect(queryByTestId('empire-hub-close-bottom-btn')).toBeNull();
      expect(hapticSpy).toHaveBeenCalled();
    });

    it('resets game and closes modal on reset button click', () => {
      act(() => {
        useGameStore.setState({
          isEmpireHubOpen: true,
          turn: 35,
          moneyLaundered: 800000,
        });
      });

      const { getByTestId } = render(<EmpireHubModal />);
      const resetBtn = getByTestId('empire-hub-reset-btn');
      fireEvent.press(resetBtn);

      const state = useGameStore.getState();
      expect(state.isEmpireHubOpen).toBe(false);
      expect(state.turn).toBe(1);
      expect(state.moneyLaundered).toBe(0);
      expect(hapticSpy).toHaveBeenCalled();
    });
  });

  describe('3. Lifetime Statistics Formatting & Partner Status Badges', () => {
    it('formats 0 years, $0 laundered, and Gen 1 properly', () => {
      const { getByTestId } = render(
        <EmpireHubModal
          isOpen={true}
          turn={0}
          moneyLaundered={0}
          generation={1}
        />
      );

      expect(getByTestId('metric-years')).toHaveTextContent('0');
      expect(getByTestId('metric-money')).toHaveTextContent('$0');
      expect(getByTestId('metric-generation')).toHaveTextContent('Gen 1');
    });

    it('formats large values: 75 years, $1,550,000 laundered, Gen 4 with comma separators', () => {
      const { getByTestId } = render(
        <EmpireHubModal
          isOpen={true}
          turn={75}
          moneyLaundered={1550000}
          generation={4}
        />
      );

      expect(getByTestId('metric-years')).toHaveTextContent('75');
      expect(getByTestId('metric-money')).toHaveTextContent('$1,550,000');
      expect(getByTestId('metric-generation')).toHaveTextContent('Gen 4');
    });

    it('displays partner A & partner B status and gendered labels correctly for alive, jailed, and dead', () => {
      const { getByTestId, rerender } = render(
        <EmpireHubModal
          isOpen={true}
          partnerA={{ ...INITIAL_PARTNER_A, status: 'alive' }}
          partnerB={{ ...INITIAL_PARTNER_B, status: 'jailed' }}
        />
      );

      expect(getByTestId('partner-status-a')).toHaveTextContent('Nico');
      expect(getByTestId('partner-status-a')).toHaveTextContent('ACTIVO');
      expect(getByTestId('partner-status-b')).toHaveTextContent('Camila');
      expect(getByTestId('partner-status-b')).toHaveTextContent('ENCARCELADA');

      rerender(
        <EmpireHubModal
          isOpen={true}
          partnerA={{ ...INITIAL_PARTNER_A, status: 'dead' }}
          partnerB={{ ...INITIAL_PARTNER_B, status: 'alive' }}
        />
      );

      expect(getByTestId('partner-status-a')).toHaveTextContent('CAÍDO');
      expect(getByTestId('partner-status-b')).toHaveTextContent('ACTIVO');

      rerender(
        <EmpireHubModal
          isOpen={true}
          partnerA={{ ...INITIAL_PARTNER_A, status: 'jailed' }}
          partnerB={{ ...INITIAL_PARTNER_B, status: 'dead' }}
        />
      );

      expect(getByTestId('partner-status-a')).toHaveTextContent('ENCARCELADO');
      expect(getByTestId('partner-status-b')).toHaveTextContent('CAÍDA');
    });

    it('renders positive and negative stat delta badges with proper sign and labels', () => {
      const sampleItem: HistoryEntry = {
        id: 'delta-test-1',
        cardId: 'c1',
        character: 'ruso',
        characterName: 'Dmitri',
        text: 'El cargamento llegó al muelle.',
        choiceText: 'Aceptar el 50%',
        direction: 'right',
        partnerId: 'partnerB',
        partnerName: 'Camila',
        statDeltas: { dinero: 25, policia: -10, estres: 15, respeto: -5 },
        timestamp: 123456,
      };

      const { getByTestId } = render(
        <EmpireHubModal isOpen={true} history={[sampleItem]} />
      );

      const deltasContainer = getByTestId('history-deltas-delta-test-1');
      expect(deltasContainer).toHaveTextContent('Dinero: +25');
      expect(deltasContainer).toHaveTextContent('Búsqueda: -10');
      expect(deltasContainer).toHaveTextContent('Estrés: +15');
      expect(deltasContainer).toHaveTextContent('Reputación: -5');
    });
  });
});
