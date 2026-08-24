import {
  applyChoiceDeltas,
  calculateLegacy,
  checkStatFatalities,
  clampStat,
  createInitialGameState,
  createNextGenerationState,
  getEligibleCards,
  handlePartnerDemise,
  INITIAL_STATS,
} from '../../src/store/gameEngine';
import { useGameStore } from '../../src/store/gameStore';
import { INITIAL_DECK } from '../../src/constants/deck';
import { GameCard, GameState, StatModifiers } from '../../src/types/game';

describe('Empirical Challenger M2 - Dual Protagonist Engine & Perspective Switching', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  describe('1. Stat Delta Application & Numerical Clamping Extreme Stress Tests', () => {
    test('clampStat strictly clamps negative infinity, huge negative numbers, and negative decimals to 0', () => {
      expect(clampStat(-Infinity)).toBe(0);
      expect(clampStat(-99999999)).toBe(0);
      expect(clampStat(-1)).toBe(0);
      expect(clampStat(-0.0001)).toBe(0);
      expect(clampStat(-0.9999)).toBe(0);
      expect(clampStat(0)).toBe(0);
    });

    test('clampStat strictly clamps positive infinity, huge positive numbers, and numbers > 100 to 100', () => {
      expect(clampStat(Infinity)).toBe(100);
      expect(clampStat(99999999)).toBe(100);
      expect(clampStat(101)).toBe(100);
      expect(clampStat(100.0001)).toBe(100);
      expect(clampStat(100)).toBe(100);
    });

    test('clampStat correctly rounds floating point values inside [0, 100]', () => {
      expect(clampStat(50.4)).toBe(50);
      expect(clampStat(50.5)).toBe(51);
      expect(clampStat(50.6)).toBe(51);
      expect(clampStat(0.4)).toBe(0);
      expect(clampStat(99.6)).toBe(100);
    });

    test('applyChoiceDeltas strictly clamps all 4 stats with extreme positive and negative deltas', () => {
      const initial = { dinero: 50, policia: 30, estres: 35, respeto: 40 };
      const extremeDelta: StatModifiers = {
        dinero: 999999,
        policia: -999999,
        estres: 500,
        respeto: -500,
      };

      const result = applyChoiceDeltas(initial, extremeDelta);
      expect(result).toEqual({
        dinero: 100,
        policia: 0,
        estres: 100,
        respeto: 0,
      });
    });

    test('applyChoiceDeltas preserves untouched stats when delta is partial or empty', () => {
      const initial = { dinero: 50, policia: 30, estres: 35, respeto: 40 };
      const partialDelta: StatModifiers = { dinero: 10 };
      const result = applyChoiceDeltas(initial, partialDelta);
      expect(result).toEqual({
        dinero: 60,
        policia: 30,
        estres: 35,
        respeto: 40,
      });

      const emptyDelta: StatModifiers = {};
      const resultEmpty = applyChoiceDeltas(initial, emptyDelta);
      expect(resultEmpty).toEqual(initial);
    });
  });

  describe('2. Fatality Checks (8 Fatal Endings)', () => {
    test('checkStatFatalities correctly identifies each boundary extreme (0 and 100)', () => {
      expect(checkStatFatalities({ dinero: 50, policia: 100, estres: 50, respeto: 50 }))
        .toEqual({ stat: 'policia', extreme: 'high', endingId: 'policia_100' });

      expect(checkStatFatalities({ dinero: 0, policia: 50, estres: 50, respeto: 50 }))
        .toEqual({ stat: 'dinero', extreme: 'low', endingId: 'dinero_0' });

      expect(checkStatFatalities({ dinero: 50, policia: 50, estres: 100, respeto: 50 }))
        .toEqual({ stat: 'estres', extreme: 'high', endingId: 'estres_100' });

      expect(checkStatFatalities({ dinero: 50, policia: 50, estres: 50, respeto: 0 }))
        .toEqual({ stat: 'respeto', extreme: 'low', endingId: 'respeto_0' });

      expect(checkStatFatalities({ dinero: 50, policia: 0, estres: 50, respeto: 50 }))
        .toEqual({ stat: 'policia', extreme: 'low', endingId: 'policia_0' });

      expect(checkStatFatalities({ dinero: 100, policia: 50, estres: 50, respeto: 50 }))
        .toEqual({ stat: 'dinero', extreme: 'high', endingId: 'dinero_100' });

      expect(checkStatFatalities({ dinero: 50, policia: 50, estres: 0, respeto: 50 }))
        .toEqual({ stat: 'estres', extreme: 'low', endingId: 'estres_0' });

      expect(checkStatFatalities({ dinero: 50, policia: 50, estres: 50, respeto: 100 }))
        .toEqual({ stat: 'respeto', extreme: 'high', endingId: 'respeto_100' });
    });

    test('checkStatFatalities returns null for values strictly within [1, 99]', () => {
      expect(checkStatFatalities({ dinero: 1, policia: 99, estres: 1, respeto: 99 })).toBeNull();
      expect(checkStatFatalities(INITIAL_STATS)).toBeNull();
    });
  });

  describe('3. Dynamic Deck Filtering & Perspective Isolation', () => {
    test('strictly excludes partnerB_only cards when activePartner is partnerA', () => {
      const eligible = getEligibleCards(INITIAL_DECK, 'partnerA', {}, []);
      const partnerBCards = eligible.filter((c) => c.target === 'partnerB_only');
      expect(partnerBCards.length).toBe(0);

      // Verify specific partnerB cards are excluded
      const card9 = eligible.find((c) => c.id === 'card_9_broker_hotel');
      const card20 = eligible.find((c) => c.id === 'card_20_broker_alcalde');
      const card30 = eligible.find((c) => c.id === 'card_30_broker_desplome');
      expect(card9).toBeUndefined();
      expect(card20).toBeUndefined();
      expect(card30).toBeUndefined();

      // Verify partnerA cards are included
      const card5 = eligible.find((c) => c.id === 'card_5_trey_vagos');
      expect(card5).toBeDefined();
    });

    test('strictly excludes partnerA_only cards when activePartner is partnerB', () => {
      const eligible = getEligibleCards(INITIAL_DECK, 'partnerB', {}, []);
      const partnerACards = eligible.filter((c) => c.target === 'partnerA_only');
      expect(partnerACards.length).toBe(0);

      // Verify specific partnerA cards are excluded
      const card5 = eligible.find((c) => c.id === 'card_5_trey_vagos');
      const card10 = eligible.find((c) => c.id === 'card_10_camila_escapada');
      const card13 = eligible.find((c) => c.id === 'card_13_trey_callejon');
      const card19 = eligible.find((c) => c.id === 'card_19_camila_futuro');
      const card29 = eligible.find((c) => c.id === 'card_29_camila_pistola');
      expect(card5).toBeUndefined();
      expect(card10).toBeUndefined();
      expect(card13).toBeUndefined();
      expect(card19).toBeUndefined();
      expect(card29).toBeUndefined();

      // Verify partnerB cards are included
      const card9 = eligible.find((c) => c.id === 'card_9_broker_hotel');
      expect(card9).toBeDefined();
    });

    test('respects conditional flag prerequisites', () => {
      // Without 'guerra_ruso' and 'vance_mad'
      const withoutFlags = getEligibleCards(INITIAL_DECK, 'partnerA', {}, []);
      expect(withoutFlags.find((c) => c.id === 'card_14_ruso_paz')).toBeUndefined();
      expect(withoutFlags.find((c) => c.id === 'card_16_isa_testimonio')).toBeUndefined();

      // With 'guerra_ruso' and 'vance_mad'
      const withFlags = getEligibleCards(
        INITIAL_DECK,
        'partnerA',
        { guerra_ruso: true, vance_mad: true },
        []
      );
      expect(withFlags.find((c) => c.id === 'card_14_ruso_paz')).toBeDefined();
      expect(withFlags.find((c) => c.id === 'card_16_isa_testimonio')).toBeDefined();
    });

    test('automatically recycles card pool when unplayed cards drop below 3', () => {
      const allIds = INITIAL_DECK.map((c) => c.id);
      // Mark all except 2 cards as seen
      const seenAllExcept2 = allIds.slice(0, allIds.length - 2);
      const recycled = getEligibleCards(INITIAL_DECK, 'partnerA', {}, seenAllExcept2);
      // Recycling triggers, returning full base pool for partnerA
      expect(recycled.length).toBeGreaterThan(5);
    });

    test('handles empty custom deck gracefully without crashing', () => {
      const emptyResult = getEligibleCards([], 'partnerA', {}, []);
      expect(emptyResult).toEqual([]);
    });
  });

  describe('4. Demise Transition & Dual Protagonist Life Cycle Engine', () => {
    const baseState: GameState = {
      partnerA: {
        id: 'partnerA',
        name: 'Nico',
        role: 'El Estratega',
        seed: 'nico-seed',
        status: 'alive',
      },
      partnerB: {
        id: 'partnerB',
        name: 'Camila',
        role: 'La Ejecutora',
        seed: 'camila-seed',
        status: 'alive',
      },
      activePartner: 'partnerA',
      stats: { dinero: 0, policia: 30, estres: 35, respeto: 40 },
      flags: {},
      generation: 1,
      turn: 5,
      moneyLaundered: 10000,
      history: [],
      currentCard: null,
      seenCardIds: [],
      gameOver: false,
      activeEnding: null,
      legacyReport: null,
      isEmpireHubOpen: false,
    };

    test('Partner A demise (dead): transitions activePartner to Partner B with transition card, NO Game Over', () => {
      const result = handlePartnerDemise(baseState, 'dinero', 'low');

      expect(result.isGameOver).toBe(false);
      expect(result.newActivePartner).toBe('partnerB');
      expect(result.updatedPartnerA.status).toBe('dead');
      expect(result.updatedPartnerA.deathCause).toBeDefined();
      expect(result.updatedPartnerB.status).toBe('alive');
      expect(result.transitionCard).toBeDefined();
      expect(result.transitionCard?.isTransitionCard).toBe(true);
      expect(result.transitionCard?.t).toContain('Nico');
      expect(result.ending).toBeUndefined();
    });

    test('Partner A demise (jailed on policia 100): status set to jailed, switches to Partner B, NO Game Over', () => {
      const result = handlePartnerDemise(
        { ...baseState, stats: { ...baseState.stats, policia: 100 } },
        'policia',
        'high'
      );

      expect(result.isGameOver).toBe(false);
      expect(result.newActivePartner).toBe('partnerB');
      expect(result.updatedPartnerA.status).toBe('jailed');
      expect(result.updatedPartnerB.status).toBe('alive');
      expect(result.transitionCard).toBeDefined();
      expect(result.transitionCard?.t).toContain('arrestado');
    });

    test('Partner B subsequent demise: strictly transitions to Game Over when companion already fallen', () => {
      const stateWithDeadA: GameState = {
        ...baseState,
        partnerA: {
          ...baseState.partnerA,
          status: 'dead',
          deathCause: 'Bancarrota Absoluta',
        },
        activePartner: 'partnerB',
        stats: { dinero: 50, policia: 100, estres: 35, respeto: 40 },
      };

      const result = handlePartnerDemise(stateWithDeadA, 'policia', 'high');

      expect(result.isGameOver).toBe(true);
      expect(result.updatedPartnerB.status).toBe('jailed');
      expect(result.ending).toBeDefined();
      expect(result.ending?.id).toBe('policia_100');
      expect(result.transitionCard).toBeUndefined();
    });

    test('Symmetric Partner B demise first: transitions activePartner to Partner A with transition card, NO Game Over', () => {
      const stateActiveB: GameState = {
        ...baseState,
        activePartner: 'partnerB',
        stats: { dinero: 50, policia: 30, estres: 100, respeto: 40 },
      };

      const result = handlePartnerDemise(stateActiveB, 'estres', 'high');

      expect(result.isGameOver).toBe(false);
      expect(result.newActivePartner).toBe('partnerA');
      expect(result.updatedPartnerB.status).toBe('dead');
      expect(result.updatedPartnerA.status).toBe('alive');
      expect(result.transitionCard).toBeDefined();
      expect(result.transitionCard?.t).toContain('Camila');
    });

    test('Symmetric Partner A subsequent demise: strictly triggers Game Over when Partner B died first', () => {
      const stateWithDeadB: GameState = {
        ...baseState,
        partnerB: {
          ...baseState.partnerB,
          status: 'dead',
          deathCause: 'Ataque de Paranoia',
        },
        activePartner: 'partnerA',
        stats: { dinero: 50, policia: 30, estres: 35, respeto: 0 },
      };

      const result = handlePartnerDemise(stateWithDeadB, 'respeto', 'low');

      expect(result.isGameOver).toBe(true);
      expect(result.updatedPartnerA.status).toBe('dead');
      expect(result.ending).toBeDefined();
      expect(result.ending?.id).toBe('respeto_0');
    });
  });

  describe('5. Full Sequential Gameplay Execution via Zustand Store', () => {
    test('Full lifecycle: Partner A death -> Survival Switch -> Partner B death -> Strict Game Over -> Legacy Report', () => {
      const store = useGameStore.getState();
      store.initGame();

      // Force mock card causing Partner A death (dinero -100)
      useGameStore.setState({
        activePartner: 'partnerA',
        stats: { dinero: 20, policia: 30, estres: 35, respeto: 40 },
        currentCard: {
          id: 'fatal_card_a',
          w: 'vance',
          t: 'El banco confisca todo.',
          l: { t: 'Perder dinero', fx: { dinero: -100 } },
          r: { t: 'Perder dinero', fx: { dinero: -100 } },
          target: 'common',
        },
      });

      // Execute choice for Partner A
      useGameStore.getState().makeChoice('left');

      const afterDeathA = useGameStore.getState();
      expect(afterDeathA.partnerA.status).toBe('dead');
      expect(afterDeathA.partnerB.status).toBe('alive');
      expect(afterDeathA.activePartner).toBe('partnerB');
      expect(afterDeathA.gameOver).toBe(false);
      expect(afterDeathA.currentCard?.isTransitionCard).toBe(true);
      expect(afterDeathA.currentCard?.t).toContain('Nico ha caído');

      // Now Partner B plays the survival transition card
      useGameStore.getState().makeChoice('left');

      const afterTransition = useGameStore.getState();
      expect(afterTransition.activePartner).toBe('partnerB');
      expect(afterTransition.partnerA.status).toBe('dead');
      expect(afterTransition.partnerB.status).toBe('alive');
      expect(afterTransition.gameOver).toBe(false);

      // Now force fatal card for Partner B (policia +100)
      useGameStore.setState({
        currentCard: {
          id: 'fatal_card_b',
          w: 'vance',
          t: 'El SWAT tumba la puerta.',
          l: { t: 'Rendirse', fx: { policia: 100 } },
          r: { t: 'Rendirse', fx: { policia: 100 } },
          target: 'common',
        },
      });

      useGameStore.getState().makeChoice('left');

      const afterDeathB = useGameStore.getState();
      expect(afterDeathB.partnerB.status).toBe('jailed');
      expect(afterDeathB.partnerA.status).toBe('dead');
      expect(afterDeathB.gameOver).toBe(true);
      expect(afterDeathB.activeEnding?.id).toBe('policia_100');
      expect(afterDeathB.legacyReport).toBeDefined();
      expect(afterDeathB.legacyReport?.causeOfDeath).toBe(afterDeathB.activeEnding?.title);
      expect(afterDeathB.currentCard).toBeNull();

      // Subsequent makeChoice calls must be blocked
      const turnBefore = afterDeathB.turn;
      useGameStore.getState().makeChoice('left');
      expect(useGameStore.getState().turn).toBe(turnBefore);
      expect(useGameStore.getState().gameOver).toBe(true);
    });

    test('manual partner switch is disabled when one partner is dead or when game over', () => {
      useGameStore.getState().initGame();

      // Mark Partner A dead
      useGameStore.setState({
        partnerA: {
          id: 'partnerA',
          name: 'Nico',
          role: 'El Estratega',
          seed: 'nico',
          status: 'dead',
        },
        partnerB: {
          id: 'partnerB',
          name: 'Camila',
          role: 'La Ejecutora',
          seed: 'camila',
          status: 'alive',
        },
        activePartner: 'partnerB',
        gameOver: false,
      });

      // Attempt manual switch to dead Partner A
      useGameStore.getState().switchPartnerManually();

      // Must remain partnerB
      expect(useGameStore.getState().activePartner).toBe('partnerB');
    });

    test('startNewGeneration successfully revives heirs and increments generation', () => {
      useGameStore.setState({
        generation: 1,
        turn: 15,
        gameOver: true,
        flags: { hotel_lavado: true, miedo_calle: true },
        stats: { dinero: 70, policia: 40, estres: 50, respeto: 80 },
        activeEnding: {
          id: 'policia_100',
          title: 'Cadena Perpetua',
          description: 'El FIB te atrapó.',
          stat: 'policia',
          extreme: 'high',
        },
      });

      useGameStore.getState().startNewGeneration();

      const newGenState = useGameStore.getState();
      expect(newGenState.generation).toBe(2);
      expect(newGenState.turn).toBe(1);
      expect(newGenState.gameOver).toBe(false);
      expect(newGenState.partnerA.status).toBe('alive');
      expect(newGenState.partnerB.status).toBe('alive');
      expect(newGenState.activePartner).toBe('partnerA');
      expect(newGenState.flags.hotel_lavado).toBe(true);
      expect(newGenState.flags.miedo_calle).toBe(true);
      expect(newGenState.currentCard).toBeDefined();
    });
  });
});
