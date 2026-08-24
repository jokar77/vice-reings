import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGameStore } from '../../src/store/gameStore';
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
import { INITIAL_DECK } from '../../src/constants/deck';
import { INITIAL_PARTNER_A, INITIAL_PARTNER_B } from '../../src/constants/characters';
import { GameCard, GameState, PartnerId, EmpireStats, StatKey } from '../../src/types/game';

describe('Milestone 5 Challenger 2: Extreme Persistence Resilience, Single-Partner Survival & Rapid Succession Harness', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useGameStore.setState(createInitialGameState());
  });

  // =========================================================================
  // SUITE 1: ABNORMAL & CORRUPTED ASYNCSTORAGE PAYLOAD RECOVERY
  // =========================================================================
  describe('1. Abnormal & Corrupted AsyncStorage Payload Recovery', () => {
    it('1.1: should recover gracefully when AsyncStorage contains truncated/malformed JSON', async () => {
      // Set truncated JSON string in AsyncStorage
      await AsyncStorage.setItem('vice_shores_game_storage', '{"state":{"turn":12,"stats":{"dinero":');

      // Attempt to initialize game
      expect(() => useGameStore.getState().initGame()).not.toThrow();

      const state = useGameStore.getState();
      expect(state).toBeDefined();
      expect(state.stats).toBeDefined();
      expect(typeof state.stats.dinero).toBe('number');
      expect(state.partnerA.status).toBe('alive');
    });

    it('1.2: should recover safely when stored payload has corrupted data types (null stats, string turn, object history)', async () => {
      const corruptedPayload = {
        state: {
          turn: 'not_a_number',
          generation: -99,
          stats: null,
          partnerA: null,
          partnerB: { invalid: true },
          history: 'corrupted_string_history',
          flags: 99999,
          seenCardIds: null,
        },
        version: 0,
      };

      await AsyncStorage.setItem('vice_shores_game_storage', JSON.stringify(corruptedPayload));

      // Reset / Init store recovery
      useGameStore.getState().resetGame();
      const state = useGameStore.getState();

      expect(state.generation).toBe(1);
      expect(state.turn).toBe(1);
      expect(state.stats).toEqual(INITIAL_STATS);
      expect(state.partnerA.status).toBe('alive');
      expect(state.partnerB.status).toBe('alive');
      expect(Array.isArray(state.history)).toBe(true);
      expect(Array.isArray(state.seenCardIds)).toBe(true);
    });

    it('1.3: should handle missing currentCard or null card by auto-populating an eligible starting card', async () => {
      useGameStore.setState({
        currentCard: null,
        gameOver: false,
      });

      expect(useGameStore.getState().currentCard).toBeNull();
      useGameStore.getState().initGame();

      const state = useGameStore.getState();
      expect(state.currentCard).not.toBeNull();
      expect(state.currentCard?.id).toBeDefined();
      expect(state.currentCard?.l).toBeDefined();
      expect(state.currentCard?.r).toBeDefined();
    });

    it('1.4: should not resurrect game or alter currentCard if gameOver is true during initGame', async () => {
      useGameStore.setState({
        gameOver: true,
        currentCard: null,
        turn: 25,
        generation: 2,
      });

      useGameStore.getState().initGame();

      const state = useGameStore.getState();
      expect(state.gameOver).toBe(true);
      expect(state.currentCard).toBeNull();
      expect(state.turn).toBe(25);
    });

    it('1.5: should withstand extreme number values (Infinity, -Infinity, massive overshoots) in stat calculations via clampStat', () => {
      expect(clampStat(Infinity)).toBe(100);
      expect(clampStat(-Infinity)).toBe(0);
      expect(clampStat(1e12)).toBe(100);
      expect(clampStat(-1e12)).toBe(0);

      const extremeDeltas = applyChoiceDeltas(INITIAL_STATS, {
        dinero: Infinity,
        policia: -Infinity,
        estres: 99999,
        respeto: -99999,
      });

      expect(extremeDeltas.dinero).toBe(100);
      expect(extremeDeltas.policia).toBe(0);
      expect(extremeDeltas.estres).toBe(100);
      expect(extremeDeltas.respeto).toBe(0);
    });

    it('1.6: should handle unusual flags object gracefully during eligible card evaluation', () => {
      const weirdFlags = {
        unrelated_flag: true,
        numeric_flag: (123 as unknown) as boolean,
        null_flag: (null as unknown) as boolean,
      };

      const eligible = getEligibleCards(INITIAL_DECK, 'partnerA', weirdFlags, []);
      expect(eligible.length).toBeGreaterThan(0);
      expect(eligible.every((c) => c.id && c.l && c.r)).toBe(true);
    });
  });

  // =========================================================================
  // SUITE 2: REHYDRATION & PERSISTENCE DURING ACTIVE SINGLE-PARTNER SURVIVAL MODE
  // =========================================================================
  describe('2. Single-Partner Survival Rehydration & Endurance', () => {
    it('2.1: should persist and rehydrate single-partner survival mode with Partner A dead and Partner B solo', async () => {
      // Set up Partner A dead (Wasted), Partner B alive and active
      useGameStore.setState({
        turn: 14,
        generation: 1,
        activePartner: 'partnerB',
        partnerA: {
          id: 'partnerA',
          name: 'Nico',
          role: 'El Estratega',
          seed: 'partnerA-nico',
          status: 'dead',
          deathCause: 'Paranoia Fatal',
        },
        partnerB: {
          id: 'partnerB',
          name: 'Camila',
          role: 'La Ejecutora',
          seed: 'partnerB-camila',
          status: 'alive',
        },
        stats: { dinero: 60, policia: 40, estres: 50, respeto: 75 },
        flags: { hotel_lavado: true },
        moneyLaundered: 180000,
        gameOver: false,
      });

      // Verify serialization in AsyncStorage
      const rawStored = await AsyncStorage.getItem('vice_shores_game_storage');
      expect(rawStored).toBeTruthy();
      const parsed = JSON.parse(rawStored!);
      const stored = parsed.state;

      expect(stored.activePartner).toBe('partnerB');
      expect(stored.partnerA.status).toBe('dead');
      expect(stored.partnerA.deathCause).toBe('Paranoia Fatal');
      expect(stored.partnerB.status).toBe('alive');
      expect(stored.gameOver).toBe(false);
      expect(stored.moneyLaundered).toBe(180000);

      // Verify that manual partner switch is strictly rejected when one partner is dead
      useGameStore.getState().switchPartnerManually();
      expect(useGameStore.getState().activePartner).toBe('partnerB'); // Must not switch back to dead partnerA
    });

    it('2.2: should maintain strict deck perspective filtering for surviving partner during solo run', () => {
      // Partner A dead -> Partner B playing solo
      const partnerBDeck = getEligibleCards(INITIAL_DECK, 'partnerB', {}, []);
      expect(partnerBDeck.every((c) => c.target !== 'partnerA_only')).toBe(true);

      // Even if partnerA_only cards exist in full deck, they are excluded for partnerB
      const invalidA = partnerBDeck.filter((c) => c.target === 'partnerA_only');
      expect(invalidA.length).toBe(0);
    });

    it('2.3: should trigger immediate Game Over when surviving partner dies, accurately recording both fatalities', () => {
      useGameStore.setState({
        turn: 20,
        generation: 1,
        activePartner: 'partnerB',
        partnerA: {
          id: 'partnerA',
          name: 'Nico',
          role: 'El Estratega',
          seed: 'partnerA-nico',
          status: 'dead',
          deathCause: 'Wasted',
        },
        partnerB: {
          id: 'partnerB',
          name: 'Camila',
          role: 'La Ejecutora',
          seed: 'partnerB-camila',
          status: 'alive',
        },
        stats: { dinero: 50, policia: 95, estres: 50, respeto: 50 },
        currentCard: {
          id: 'solo_fatal_police',
          w: 'vance',
          t: 'El FBI rodea el almacén de Camila.',
          l: { t: 'Disparar y resistir', fx: { policia: 20 } },
          r: { t: 'Intentar soborno', fx: { policia: 20 } },
          target: 'common',
        },
      });

      useGameStore.getState().makeChoice('left');

      const state = useGameStore.getState();
      expect(state.partnerA.status).toBe('dead');
      expect(state.partnerB.status).toBe('jailed');
      expect(state.gameOver).toBe(true);
      expect(state.activeEnding?.id).toBe('policia_100');
      expect(state.legacyReport).toBeDefined();
      expect(state.legacyReport?.yearsInPower).toBe(21);
    });

    it('2.4: should survive across 30 solo choices in survival mode without partner desync', () => {
      // Simulate Partner B solo survival for 30 choices
      useGameStore.setState({
        activePartner: 'partnerB',
        partnerA: {
          id: 'partnerA',
          name: 'Nico',
          role: 'El Estratega',
          seed: 'partnerA-nico',
          status: 'dead',
          deathCause: 'Bancarrota',
        },
        partnerB: {
          id: 'partnerB',
          name: 'Camila',
          role: 'La Ejecutora',
          seed: 'partnerB-camila',
          status: 'alive',
        },
        stats: { dinero: 50, policia: 50, estres: 50, respeto: 50 },
        gameOver: false,
      });

      for (let i = 0; i < 30; i++) {
        // Keep stats in safe range to test solo deck cycling
        useGameStore.setState({
          stats: { dinero: 50, policia: 50, estres: 50, respeto: 50 },
        });

        const card = useGameStore.getState().currentCard;
        expect(card).toBeDefined();
        useGameStore.getState().makeChoice(i % 2 === 0 ? 'left' : 'right');

        // Verify active partner NEVER switches to dead partnerA
        expect(useGameStore.getState().activePartner).toBe('partnerB');
        expect(useGameStore.getState().partnerA.status).toBe('dead');
        expect(useGameStore.getState().partnerB.status).toBe('alive');
      }

      expect(useGameStore.getState().turn).toBe(31);
    });

    it('2.5: should persist and cleanly rehydrate on active transition card mid-demise', async () => {
      const transitionCard: GameCard = {
        id: 'transition_demise_test',
        w: 'camila',
        t: 'Nico ha caído. Camila asume el control total.',
        l: { t: 'Luchar', fx: { respeto: 10 } },
        r: { t: 'Venganza', fx: { dinero: -10, policia: 10 } },
        target: 'common',
        isTransitionCard: true,
      };

      useGameStore.setState({
        activePartner: 'partnerB',
        partnerA: {
          id: 'partnerA',
          name: 'Nico',
          role: 'El Estratega',
          seed: 'partnerA-nico',
          status: 'dead',
          deathCause: 'Wasted',
        },
        partnerB: {
          id: 'partnerB',
          name: 'Camila',
          role: 'La Ejecutora',
          seed: 'partnerB-camila',
          status: 'alive',
        },
        currentCard: transitionCard,
        stats: { dinero: 50, policia: 50, estres: 50, respeto: 50 },
        turn: 10,
        gameOver: false,
      });

      // Check persistence
      const rawStored = await AsyncStorage.getItem('vice_shores_game_storage');
      const parsed = JSON.parse(rawStored!);
      expect(parsed.state.currentCard.isTransitionCard).toBe(true);

      // Play through transition card
      useGameStore.getState().makeChoice('left');

      const nextState = useGameStore.getState();
      expect(nextState.turn).toBe(11);
      expect(nextState.currentCard?.isTransitionCard).toBeUndefined();
      expect(nextState.activePartner).toBe('partnerB');
    });
  });

  // =========================================================================
  // SUITE 3: RAPID GENERATION SUCCESSION & STORE RESILIENCE
  // =========================================================================
  describe('3. Rapid Generation Succession & Store Cleanliness Harness', () => {
    it('3.1: should cycle through 50 continuous generations without memory/state leaks or desync', () => {
      let state = createInitialGameState();

      for (let gen = 1; gen <= 50; gen++) {
        expect(state.generation).toBe(gen);
        expect(state.turn).toBe(1);
        expect(state.partnerA.status).toBe('alive');
        expect(state.partnerB.status).toBe('alive');
        expect(state.gameOver).toBe(false);
        expect(state.history.length).toBe(0); // Clean history on each new generation
        expect(state.seenCardIds.length).toBe(1); // Only initial starting card

        // Simulate 5 turns in this generation
        for (let t = 0; t < 5; t++) {
          const card = state.currentCard || INITIAL_DECK[0];
          const choice = card.l;
          const nextStats = applyChoiceDeltas(state.stats, choice.fx);
          state = {
            ...state,
            turn: state.turn + 1,
            stats: nextStats,
            seenCardIds: [...state.seenCardIds, card.id],
          };
        }

        // Simulate generation demise
        state = {
          ...state,
          partnerA: { ...state.partnerA, status: 'dead' },
          partnerB: { ...state.partnerB, status: 'dead' },
          gameOver: true,
          activeEnding: {
            id: 'estres_100',
            title: 'Wasted',
            description: 'Colapso total',
            stat: 'estres',
            extreme: 'high',
          },
        };

        // Transition to next generation
        state = createNextGenerationState(state);
      }

      expect(state.generation).toBe(51);
      expect(state.partnerA.name).toBe('Nico Gen 51');
      expect(state.partnerB.name).toBe('Camila Gen 51');
      expect(state.turn).toBe(1);
    });

    it('3.2: should maintain bounded stats [0, 100] across heavily compounded legacy modifiers', () => {
      let state: GameState = {
        ...createInitialGameState(),
        flags: {
          hotel_lavado: true,
          bebida_legal: true,
          miedo_calle: true,
        },
        stats: { dinero: 100, policia: 100, estres: 100, respeto: 100 },
        activeEnding: {
          id: 'policia_100',
          title: 'Sentencia Máxima',
          description: 'FIB raid',
          stat: 'policia',
          extreme: 'high',
        },
      };

      for (let i = 0; i < 20; i++) {
        const nextState = createNextGenerationState(state);

        expect(nextState.stats.dinero).toBeGreaterThanOrEqual(0);
        expect(nextState.stats.dinero).toBeLessThanOrEqual(100);
        expect(nextState.stats.policia).toBeGreaterThanOrEqual(0);
        expect(nextState.stats.policia).toBeLessThanOrEqual(100);
        expect(nextState.stats.estres).toBeGreaterThanOrEqual(0);
        expect(nextState.stats.estres).toBeLessThanOrEqual(100);
        expect(nextState.stats.respeto).toBeGreaterThanOrEqual(0);
        expect(nextState.stats.respeto).toBeLessThanOrEqual(100);

        state = nextState;
      }
    });

    it('3.3: should cleanly execute rapid resetGame() calls without residual state corruption', () => {
      // Mutate store state heavily
      useGameStore.setState({
        generation: 8,
        turn: 45,
        moneyLaundered: 950000,
        flags: { hotel_lavado: true, guerra_ruso: true, miedo_calle: true },
        partnerA: {
          id: 'partnerA',
          name: 'Nico Gen 8',
          role: 'El Estratega',
          seed: 'nico-8',
          status: 'dead',
        },
        partnerB: {
          id: 'partnerB',
          name: 'Camila Gen 8',
          role: 'La Ejecutora',
          seed: 'camila-8',
          status: 'jailed',
        },
        gameOver: true,
        history: Array(50).fill({
          id: 'dummy',
          cardId: 'card_1',
          character: 'nico',
          characterName: 'Nico',
          text: 'test',
          choiceText: 'choice',
          direction: 'left',
          partnerId: 'partnerA',
          partnerName: 'Nico',
          statDeltas: {},
          timestamp: 123456,
        }),
      });

      // Execute reset
      useGameStore.getState().resetGame();

      const freshState = useGameStore.getState();
      expect(freshState.generation).toBe(1);
      expect(freshState.turn).toBe(1);
      expect(freshState.moneyLaundered).toBe(0);
      expect(freshState.flags).toEqual({});
      expect(freshState.history).toEqual([]);
      expect(freshState.partnerA.name).toBe('Nico');
      expect(freshState.partnerA.status).toBe('alive');
      expect(freshState.partnerB.name).toBe('Camila');
      expect(freshState.partnerB.status).toBe('alive');
      expect(freshState.gameOver).toBe(false);
      expect(freshState.activeEnding).toBeNull();
      expect(freshState.legacyReport).toBeNull();
      expect(freshState.stats).toEqual(INITIAL_STATS);
    });

    it('3.4: should preserve accumulated moneyLaundered across consecutive generation successions', () => {
      let state = createInitialGameState();
      state.moneyLaundered = 50000;

      for (let g = 1; g <= 5; g++) {
        state.moneyLaundered += 25000;
        state.gameOver = true;
        state.activeEnding = {
          id: 'dinero_0',
          title: 'Bancarrota',
          description: 'Sin fondos',
          stat: 'dinero',
          extreme: 'low',
        };
        state = createNextGenerationState(state);
      }

      // 50k + (5 * 25k) = 175k
      expect(state.moneyLaundered).toBe(175000);
    });

    it('3.5: should correctly generate legacy reports across all 8 possible ending fatalities', () => {
      const endingCases: { stat: StatKey; extreme: 'low' | 'high'; id: string }[] = [
        { stat: 'policia', extreme: 'high', id: 'policia_100' },
        { stat: 'dinero', extreme: 'low', id: 'dinero_0' },
        { stat: 'estres', extreme: 'high', id: 'estres_100' },
        { stat: 'respeto', extreme: 'low', id: 'respeto_0' },
        { stat: 'policia', extreme: 'low', id: 'policia_0' },
        { stat: 'dinero', extreme: 'high', id: 'dinero_100' },
        { stat: 'estres', extreme: 'low', id: 'estres_0' },
        { stat: 'respeto', extreme: 'high', id: 'respeto_100' },
      ];

      endingCases.forEach(({ stat, extreme, id }) => {
        const mockState: GameState = {
          ...createInitialGameState(),
          stats: {
            dinero: stat === 'dinero' ? (extreme === 'high' ? 100 : 0) : 50,
            policia: stat === 'policia' ? (extreme === 'high' ? 100 : 0) : 30,
            estres: stat === 'estres' ? (extreme === 'high' ? 100 : 0) : 35,
            respeto: stat === 'respeto' ? (extreme === 'high' ? 100 : 0) : 40,
          },
          activeEnding: {
            id,
            title: `Ending ${id}`,
            description: `Demise from ${stat}`,
            stat,
            extreme,
          },
          gameOver: true,
        };

        const legacy = calculateLegacy(mockState);
        expect(legacy).toBeDefined();
        expect(legacy.rows.length).toBeGreaterThan(0);
        expect(typeof legacy.dDinero).toBe('number');
        expect(typeof legacy.dPolicia).toBe('number');
        expect(typeof legacy.dEstres).toBe('number');
        expect(typeof legacy.dRespeto).toBe('number');

        const nextGen = createNextGenerationState(mockState);
        expect(nextGen.stats.dinero).toBeGreaterThanOrEqual(0);
        expect(nextGen.stats.dinero).toBeLessThanOrEqual(100);
        expect(nextGen.stats.policia).toBeGreaterThanOrEqual(0);
        expect(nextGen.stats.policia).toBeLessThanOrEqual(100);
        expect(nextGen.stats.estres).toBeGreaterThanOrEqual(0);
        expect(nextGen.stats.estres).toBeLessThanOrEqual(100);
        expect(nextGen.stats.respeto).toBeGreaterThanOrEqual(0);
        expect(nextGen.stats.respeto).toBeLessThanOrEqual(100);
      });
    });

    it('3.6: should scale to Generation 500 without performance degradation or recursion errors', () => {
      let state = createInitialGameState();
      const start = Date.now();

      for (let g = 1; g <= 500; g++) {
        state.gameOver = true;
        state.activeEnding = {
          id: 'estres_100',
          title: 'Wasted',
          description: 'Agotamiento',
          stat: 'estres',
          extreme: 'high',
        };
        state = createNextGenerationState(state);
      }

      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(1000); // 500 generations computed in < 1000ms
      expect(state.generation).toBe(501);
      expect(state.partnerA.name).toBe('Nico Gen 501');
      expect(state.partnerB.name).toBe('Camila Gen 501');
    });
  });
});
