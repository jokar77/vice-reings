import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import App from '../../App';
import { GameOverModal } from '@/components/GameOverModal';
import { useGameStore } from '@/store/gameStore';
import { ENDINGS, getEnding } from '@/constants/endings';
import { INITIAL_DECK } from '@/constants/deck';
import { EndingCause, GameState, LegacyReport } from '@/types/game';
import { calculateLegacy, createNextGenerationState } from '@/store/gameEngine';

describe('Milestone 4 - Challenger 2: GameOverModal, New Generation & App Lifecycle', () => {
  beforeEach(() => {
    act(() => {
      useGameStore.getState().resetGame();
    });
  });

  describe('1. Empirical Verification: GameOverModal Fatal Narratives (All 8 Endings)', () => {
    const allEndings: EndingCause[] = Object.values(ENDINGS);

    it.each(allEndings)('renders fatal narrative correctly for %s ($id)', (ending) => {
      const { getByTestId, unmount } = render(
        <GameOverModal isOpen={true} ending={ending} />
      );

      const titleEl = getByTestId('game-over-title');
      const descEl = getByTestId('game-over-description');

      expect(titleEl).toHaveTextContent(ending.title.toUpperCase());
      expect(descEl).toHaveTextContent(ending.description);

      unmount();
    });

    it('gracefully renders fallback narrative when ending is null', () => {
      const { getByTestId } = render(
        <GameOverModal isOpen={true} ending={null} />
      );

      expect(getByTestId('game-over-title')).toHaveTextContent('FIN DEL IMPERIO');
      expect(getByTestId('game-over-description')).toHaveTextContent(
        'Ambos líderes han caído. El imperio criminal de Vice Shores ha colapsado bajo la presión de las calles.'
      );
    });
  });

  describe('2. Empirical Verification: Legacy Report, Lifetime Metrics & Signage', () => {
    it('renders lifetime metrics and legacy bonus rows with correct formatting and signs', () => {
      const customLegacy: LegacyReport = {
        generation: 3,
        yearsInPower: 42,
        moneyLaundered: 1750000,
        causeOfDeath: 'Busted',
        dDinero: 24,
        dPolicia: 18,
        dEstres: -5,
        dRespeto: 12,
        rows: [
          ['Hotel Boutique (Lavado Activo)', 24],
          ['Redadas constantes del FIB', 18],
          ['Tregua diplomática', -5],
          ['Miedo instaurado en las calles', 12],
        ],
      };

      const { getByTestId, getByText } = render(
        <GameOverModal
          isOpen={true}
          ending={ENDINGS.policia_100}
          legacyReport={customLegacy}
        />
      );

      // Verify lifetime metrics
      expect(getByText('Gen 3')).toBeTruthy();
      expect(getByText('42')).toBeTruthy();
      expect(getByText('$1,750,000')).toBeTruthy();

      // Verify target generation badge in header
      expect(getByText('Para Gen 4')).toBeTruthy();

      // Verify stat modifier cards
      expect(getByTestId('legacy-stat-dinero')).toHaveTextContent('+24');
      expect(getByTestId('legacy-stat-policia')).toHaveTextContent('+18');
      expect(getByTestId('legacy-stat-estres')).toHaveTextContent('-5');
      expect(getByTestId('legacy-stat-respeto')).toHaveTextContent('+12');

      // Verify trait rows
      expect(getByTestId('legacy-row-0')).toHaveTextContent('Hotel Boutique (Lavado Activo)');
      expect(getByTestId('legacy-row-0')).toHaveTextContent('+24');

      expect(getByTestId('legacy-row-1')).toHaveTextContent('Redadas constantes del FIB');
      expect(getByTestId('legacy-row-1')).toHaveTextContent('+18');

      expect(getByTestId('legacy-row-2')).toHaveTextContent('Tregua diplomática');
      expect(getByTestId('legacy-row-2')).toHaveTextContent('-5');

      expect(getByTestId('legacy-row-3')).toHaveTextContent('Miedo instaurado en las calles');
      expect(getByTestId('legacy-row-3')).toHaveTextContent('+12');

      // Verify subtext in continue CTA
      expect(getByText('Iniciar Generación 4 con Nico y Camila')).toBeTruthy();
    });
  });

  describe('3. Empirical Verification: New Generation State Transition & Partner Revival', () => {
    it('tapping "Continuar el Imperio" resets state with legacy modifiers, revives both partners, and increments generation', () => {
      // Setup Game Over state in store
      act(() => {
        useGameStore.setState({
          generation: 1,
          turn: 15,
          moneyLaundered: 350000,
          partnerA: {
            id: 'partnerA',
            name: 'Nico',
            role: 'El Estratega',
            seed: 'partnerA-gen1',
            status: 'dead',
            deathCause: 'Busted',
          },
          partnerB: {
            id: 'partnerB',
            name: 'Camila',
            role: 'La Ejecutora',
            seed: 'partnerB-gen1',
            status: 'jailed',
            deathCause: 'Busted',
          },
          stats: { dinero: 80, policia: 100, estres: 50, respeto: 70 },
          flags: { hotel_lavado: true, miedo_calle: true, unpersisted_temp: true },
          gameOver: true,
          activeEnding: ENDINGS.policia_100,
          legacyReport: calculateLegacy({
            ...useGameStore.getState(),
            generation: 1,
            turn: 15,
            moneyLaundered: 350000,
            stats: { dinero: 80, policia: 100, estres: 50, respeto: 70 },
            flags: { hotel_lavado: true, miedo_calle: true, unpersisted_temp: true },
            activeEnding: ENDINGS.policia_100,
          }),
        });
      });

      const { getByTestId } = render(<GameOverModal />);

      // Verify button is present
      const continueBtn = getByTestId('btn-continue-generation');
      expect(continueBtn).toBeTruthy();

      // Press continue
      act(() => {
        fireEvent.press(continueBtn);
      });

      const updatedStore = useGameStore.getState();

      // 1. GameOver must be false and activeEnding null
      expect(updatedStore.gameOver).toBe(false);
      expect(updatedStore.activeEnding).toBeNull();

      // 2. Generation incremented from 1 to 2
      expect(updatedStore.generation).toBe(2);
      expect(updatedStore.turn).toBe(1);

      // 3. Money laundered cumulative metric preserved
      expect(updatedStore.moneyLaundered).toBe(350000);

      // 4. Both partners REVIVED to 'alive'
      expect(updatedStore.partnerA.status).toBe('alive');
      expect(updatedStore.partnerB.status).toBe('alive');
      expect(updatedStore.activePartner).toBe('partnerA');

      // 5. In generation 2, names are Nico & Camila
      expect(updatedStore.partnerA.name).toBe('Nico');
      expect(updatedStore.partnerB.name).toBe('Camila');

      // 6. Inherited flags preserved while temporary flags stripped
      expect(updatedStore.flags.hotel_lavado).toBe(true);
      expect(updatedStore.flags.miedo_calle).toBe(true);
      expect(updatedStore.flags.unpersisted_temp).toBeUndefined();

      // 7. Modifiers properly applied to initial stats:
      // Base: dinero 50, policia 30, estres 35, respeto 40
      // With hotel_lavado (+24), policia_100 (+15 + policia heat legacy), miedo_calle (+15 respeto, +10 estres)
      expect(updatedStore.stats.dinero).toBeGreaterThanOrEqual(50);
      expect(updatedStore.stats.respeto).toBeGreaterThanOrEqual(40);
      expect(updatedStore.stats.policia).toBeGreaterThanOrEqual(30);

      // 8. Card pool initialized
      expect(updatedStore.currentCard).not.toBeNull();
      expect(updatedStore.seenCardIds.length).toBeGreaterThan(0);
    });

    it('scales partner names beyond Generation 2 (Gen 3 -> "Nico Gen 3", "Camila Gen 3")', () => {
      act(() => {
        useGameStore.setState({
          generation: 2,
          gameOver: true,
          activeEnding: ENDINGS.dinero_0,
          partnerA: {
            id: 'partnerA',
            name: 'Nico',
            role: 'El Estratega',
            seed: 'partnerA-gen2',
            status: 'dead',
          },
          partnerB: {
            id: 'partnerB',
            name: 'Camila',
            role: 'La Ejecutora',
            seed: 'partnerB-gen2',
            status: 'dead',
          },
        });
      });

      const { getByTestId } = render(<GameOverModal />);
      const continueBtn = getByTestId('btn-continue-generation');

      act(() => {
        fireEvent.press(continueBtn);
      });

      const updatedStore = useGameStore.getState();
      expect(updatedStore.generation).toBe(3);
      expect(updatedStore.partnerA.name).toBe('Nico Gen 3');
      expect(updatedStore.partnerB.name).toBe('Camila Gen 3');
      expect(updatedStore.partnerA.status).toBe('alive');
      expect(updatedStore.partnerB.status).toBe('alive');
    });
  });

  describe('4. Empirical Verification: Multi-Generation Cascade Simulation', () => {
    it('simulates 5 consecutive generational game overs and verifies continuous inheritance stability', () => {
      let state: GameState = useGameStore.getState();

      for (let gen = 1; gen <= 5; gen++) {
        expect(state.generation).toBe(gen);
        expect(state.partnerA.status).toBe('alive');
        expect(state.partnerB.status).toBe('alive');

        // Simulate fatalities in this generation
        const fatalEnding = gen % 2 === 0 ? ENDINGS.policia_100 : ENDINGS.estres_100;
        const previousState: GameState = {
          ...state,
          partnerA: { ...state.partnerA, status: 'dead' as const },
          partnerB: { ...state.partnerB, status: 'dead' as const },
          activeEnding: fatalEnding,
          gameOver: true,
          turn: gen * 10,
          moneyLaundered: gen * 100000,
        };

        const nextGenState = createNextGenerationState(previousState);

        // Verify stats are clamped in [0, 100]
        expect(nextGenState.stats.dinero).toBeGreaterThanOrEqual(0);
        expect(nextGenState.stats.dinero).toBeLessThanOrEqual(100);
        expect(nextGenState.stats.policia).toBeGreaterThanOrEqual(0);
        expect(nextGenState.stats.policia).toBeLessThanOrEqual(100);
        expect(nextGenState.stats.estres).toBeGreaterThanOrEqual(0);
        expect(nextGenState.stats.estres).toBeLessThanOrEqual(100);
        expect(nextGenState.stats.respeto).toBeGreaterThanOrEqual(0);
        expect(nextGenState.stats.respeto).toBeLessThanOrEqual(100);

        // Verify partner revival
        expect(nextGenState.partnerA.status).toBe('alive');
        expect(nextGenState.partnerB.status).toBe('alive');
        expect(nextGenState.gameOver).toBe(false);
        expect(nextGenState.generation).toBe(gen + 1);

        state = nextGenState;
      }
    });
  });

  describe('5. Empirical Verification: App Root Lifecycle and End-to-End Screen Flow', () => {
    it('seamlessly transitions from playing -> dual demise -> game over modal -> new generation revival', () => {
      const { getByTestId, queryByTestId } = render(<App />);

      // Step 1: Verify Initial App Screen is active and Game Over modal is closed
      expect(getByTestId('app-root-container')).toBeTruthy();
      expect(getByTestId('hud-stats-bar')).toBeTruthy();
      expect(getByTestId('active-partner-name')).toHaveTextContent('Nico');
      expect(queryByTestId('game-over-title')).toBeNull();

      // Step 2: Trigger first partner demise (Partner A falls -> Camila takes over)
      // Set policia to 95 and apply choice that pushes policia +10
      act(() => {
        useGameStore.setState({
          stats: { dinero: 50, policia: 95, estres: 35, respeto: 40 },
          activePartner: 'partnerA',
          currentCard: {
            id: 'test_card_1',
            w: 'ruso',
            t: 'Test trigger fatal heat',
            l: { t: 'Op A', fx: { policia: 10 } },
            r: { t: 'Op B', fx: { policia: 10 } },
          },
        });
      });

      // Swipe to trigger Partner A demise
      act(() => {
        useGameStore.getState().makeChoice('left');
      });

      const storeAfterA = useGameStore.getState();
      expect(storeAfterA.partnerA.status).toBe('jailed');
      expect(storeAfterA.partnerB.status).toBe('alive');
      expect(storeAfterA.activePartner).toBe('partnerB');
      expect(storeAfterA.gameOver).toBe(false);
      expect(queryByTestId('game-over-title')).toBeNull();
      expect(getByTestId('active-partner-name')).toHaveTextContent('Camila');

      // Step 3: Trigger second partner demise (Partner B falls -> Entire Generation Game Over)
      act(() => {
        useGameStore.setState({
          stats: { dinero: 50, policia: 95, estres: 35, respeto: 40 },
          currentCard: {
            id: 'test_card_2',
            w: 'lexi',
            t: 'Test fatal heat 2',
            l: { t: 'Op A', fx: { policia: 10 } },
            r: { t: 'Op B', fx: { policia: 10 } },
          },
        });
      });

      // Swipe to trigger Partner B demise
      act(() => {
        useGameStore.getState().makeChoice('left');
      });

      const storeAfterB = useGameStore.getState();
      expect(storeAfterB.partnerA.status).toBe('jailed');
      expect(storeAfterB.partnerB.status).toBe('jailed');
      expect(storeAfterB.gameOver).toBe(true);
      expect(storeAfterB.activeEnding).not.toBeNull();

      // Step 4: Game Over modal is now visible inside App
      expect(getByTestId('game-over-title')).toHaveTextContent('BUSTED');
      expect(getByTestId('btn-continue-generation')).toBeTruthy();

      // Step 5: Tap "Continuar el Imperio" inside App
      act(() => {
        fireEvent.press(getByTestId('btn-continue-generation'));
      });

      // Step 6: App returns to normal play in Generation 2
      const resurrectedStore = useGameStore.getState();
      expect(resurrectedStore.gameOver).toBe(false);
      expect(resurrectedStore.generation).toBe(2);
      expect(resurrectedStore.partnerA.status).toBe('alive');
      expect(resurrectedStore.partnerB.status).toBe('alive');
      expect(resurrectedStore.activePartner).toBe('partnerA');
      expect(queryByTestId('game-over-title')).toBeNull();
      expect(getByTestId('active-partner-name')).toHaveTextContent('Nico');
    });

    it('allows opening Empire Hub from App header after starting new generation', () => {
      const { getByTestId, queryByTestId } = render(<App />);

      // Open Empire Hub
      const gearBtn = getByTestId('btn-open-empire-hub');
      fireEvent.press(gearBtn);

      expect(getByTestId('empire-hub-close-btn')).toBeTruthy();
      expect(getByTestId('metric-generation')).toHaveTextContent('Gen 1');

      // Close Empire Hub
      fireEvent.press(getByTestId('empire-hub-close-btn'));
      expect(queryByTestId('empire-hub-close-btn')).toBeNull();
    });
  });
});
