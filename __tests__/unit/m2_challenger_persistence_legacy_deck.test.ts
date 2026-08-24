import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGameStore } from '../../src/store/gameStore';
import {
  calculateLegacy,
  createInitialGameState,
  createNextGenerationState,
  getEligibleCards,
  clampStat,
  INITIAL_STATS,
} from '../../src/store/gameEngine';
import { INITIAL_DECK } from '../../src/constants/deck';
import { GameCard, GameState, HistoryEntry } from '../../src/types/game';

describe('Adversarial Challenger 2 - Persistence, Legacy Modifiers & Deck Recycling', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useGameStore.getState().resetGame();
  });

  // =========================================================================
  // SUITE 1: STORE PERSISTENCE & ASYNCSTORAGE MULTI-TURN ROUNDTRIP
  // =========================================================================
  describe('1. Store Persistence & AsyncStorage Roundtrip', () => {
    test('Simulate multi-turn choices, verify exact persistence of partner statuses, stats, flags, moneyLaundered, and 50-entry history bound', async () => {
      const store = useGameStore.getState();
      store.initGame();

      // Simulate 15 turns of gameplay keeping stats in safe range to prevent premature double-fatality
      for (let i = 0; i < 15; i++) {
        useGameStore.setState({
          stats: { dinero: 50, policia: 50, estres: 50, respeto: 50 },
        });
        const currentCard = useGameStore.getState().currentCard;
        if (!currentCard || useGameStore.getState().gameOver) break;
        const direction = i % 2 === 0 ? 'left' : 'right';
        useGameStore.getState().makeChoice(direction);
      }

      const prePersistState = useGameStore.getState();
      expect(prePersistState.turn).toBe(16);
      expect(prePersistState.history.length).toBe(15);

      // Verify raw AsyncStorage contents
      const rawStored = await AsyncStorage.getItem('vice_shores_game_storage');
      expect(rawStored).toBeTruthy();

      const parsed = JSON.parse(rawStored!);
      const storedState = parsed.state;

      // Verify exact parity of critical fields
      expect(storedState.turn).toBe(prePersistState.turn);
      expect(storedState.generation).toBe(prePersistState.generation);
      expect(storedState.activePartner).toBe(prePersistState.activePartner);
      expect(storedState.partnerA).toEqual(prePersistState.partnerA);
      expect(storedState.partnerB).toEqual(prePersistState.partnerB);
      expect(storedState.stats).toEqual(prePersistState.stats);
      expect(storedState.flags).toEqual(prePersistState.flags);
      expect(storedState.moneyLaundered).toBe(prePersistState.moneyLaundered);
      expect(storedState.gameOver).toBe(prePersistState.gameOver);
      expect(storedState.isEmpireHubOpen).toBe(false); // Should not persist open modal

      // Verify history structure and entries match
      expect(storedState.history.length).toBe(15);
      expect(storedState.history[0].cardId).toBe(prePersistState.history[0].cardId);
      expect(storedState.history[0].choiceText).toBe(prePersistState.history[0].choiceText);
      expect(storedState.history[0].direction).toBe(prePersistState.history[0].direction);
      expect(storedState.history[0].partnerId).toBe(prePersistState.history[0].partnerId);
      expect(typeof storedState.history[0].timestamp).toBe('number');
    });

    test('History log enforces strict 50-entry cap during extreme 100-choice simulation', async () => {
      const store = useGameStore.getState();
      store.initGame();

      // Artificially keep stats safe around 50 to prevent fatality during long test
      for (let i = 0; i < 70; i++) {
        useGameStore.setState({
          stats: { dinero: 50, policia: 50, estres: 50, respeto: 50 },
        });
        useGameStore.getState().makeChoice(i % 2 === 0 ? 'left' : 'right');
      }

      const state = useGameStore.getState();
      expect(state.history.length).toBe(50);
      expect(state.turn).toBe(71);

      // Verify storage reflects exactly 50 entries
      const rawStored = await AsyncStorage.getItem('vice_shores_game_storage');
      const parsed = JSON.parse(rawStored!);
      expect(parsed.state.history.length).toBe(50);
      expect(parsed.state.turn).toBe(71);
    });

    test('Rehydration preserves jailed/dead status and activeEnding upon Game Over', async () => {
      // Simulate Game Over state with dead partnerA and jailed partnerB
      useGameStore.setState({
        partnerA: {
          id: 'partnerA',
          name: 'Nico',
          role: 'El Estratega',
          seed: 'nico-01',
          status: 'dead',
          deathCause: 'Bancarrota',
        },
        partnerB: {
          id: 'partnerB',
          name: 'Camila',
          role: 'La Ejecutora',
          seed: 'camila-01',
          status: 'jailed',
          deathCause: 'Sentencia de Vida',
        },
        activePartner: 'partnerB',
        gameOver: true,
        activeEnding: {
          id: 'policia_100',
          title: 'Sentencia de Vida',
          description: 'SWAT rodeó tu mansión.',
          stat: 'policia',
          extreme: 'high',
        },
        legacyReport: {
          dDinero: 24,
          dPolicia: 15,
          dEstres: 10,
          dRespeto: 15,
          rows: [['Test', 10]],
          generation: 1,
          yearsInPower: 18,
          moneyLaundered: 150000,
          causeOfDeath: 'Sentencia de Vida',
        },
      });

      const rawStored = await AsyncStorage.getItem('vice_shores_game_storage');
      const parsed = JSON.parse(rawStored!);
      const state = parsed.state;

      expect(state.gameOver).toBe(true);
      expect(state.partnerA.status).toBe('dead');
      expect(state.partnerB.status).toBe('jailed');
      expect(state.activeEnding?.id).toBe('policia_100');
      expect(state.legacyReport?.moneyLaundered).toBe(150000);
      expect(state.legacyReport?.yearsInPower).toBe(18);
    });
  });

  // =========================================================================
  // SUITE 2: GENERATION N+1 LEGACY INHERITANCE MODIFIERS
  // =========================================================================
  describe('2. Generation N+1 Legacy Inheritance Modifiers', () => {
    test('Modifiers: hotel_lavado (+24 dinero), bebida_legal (+15 dinero) cumulate to +39 dinero in LegacyReport', () => {
      const mockState: GameState = {
        ...createInitialGameState(),
        stats: { dinero: 50, policia: 30, estres: 35, respeto: 40 },
        flags: {
          hotel_lavado: true,
          bebida_legal: true,
        },
      };

      const legacy = calculateLegacy(mockState);
      expect(legacy.dDinero).toBe(39); // 24 + 15

      const nextGenState = createNextGenerationState(mockState);
      expect(nextGenState.stats.dinero).toBe(89); // 50 + 39
      expect(nextGenState.flags.hotel_lavado).toBe(true);
      expect(nextGenState.flags.bebida_legal).toBe(true);
    });

    test('Modifiers: miedo_calle grants +15 respeto and +10 estres penalty', () => {
      const mockState: GameState = {
        ...createInitialGameState(),
        stats: { dinero: 50, policia: 30, estres: 35, respeto: 40 },
        flags: {
          miedo_calle: true,
        },
      };

      const legacy = calculateLegacy(mockState);
      expect(legacy.dRespeto).toBe(15); // (40-40)*0.5 + 15
      expect(legacy.dEstres).toBe(10);

      const nextGenState = createNextGenerationState(mockState);
      expect(nextGenState.stats.respeto).toBe(55); // 40 + 15
      expect(nextGenState.stats.estres).toBe(45); // 35 + 10
      expect(nextGenState.flags.miedo_calle).toBe(true);
    });

    test('Modifiers: policia_100 ending adds +15 policia heat penalty', () => {
      const mockState: GameState = {
        ...createInitialGameState(),
        stats: { dinero: 50, policia: 100, estres: 35, respeto: 40 },
        activeEnding: {
          id: 'policia_100',
          title: 'Busted',
          description: 'Sentencia de Vida',
          stat: 'policia',
          extreme: 'high',
        },
      };

      const legacy = calculateLegacy(mockState);
      // (100 - 30) * 0.45 = 31.5 -> 32 + 15 (policia_100) = 47
      expect(legacy.dPolicia).toBe(47);

      const nextGenState = createNextGenerationState(mockState);
      expect(nextGenState.stats.policia).toBe(77); // 30 + 47
    });

    test('Modifiers: estres_100 ending adds +10 estres paranoia penalty', () => {
      const mockState: GameState = {
        ...createInitialGameState(),
        stats: { dinero: 50, policia: 30, estres: 100, respeto: 40 },
        activeEnding: {
          id: 'estres_100',
          title: 'Wasted',
          description: 'Paranoia absoluta',
          stat: 'estres',
          extreme: 'high',
        },
      };

      const legacy = calculateLegacy(mockState);
      expect(legacy.dEstres).toBe(10);

      const nextGenState = createNextGenerationState(mockState);
      expect(nextGenState.stats.estres).toBe(45); // 35 + 10
    });

    test('Modifiers: default penalties applied when no asset flags are unlocked and dinero <= 68 (-13 dinero)', () => {
      const mockState: GameState = {
        ...createInitialGameState(),
        stats: { dinero: 40, policia: 30, estres: 35, respeto: 40 },
        flags: {},
      };

      const legacy = calculateLegacy(mockState);
      expect(legacy.dDinero).toBe(-13);

      const nextGenState = createNextGenerationState(mockState);
      expect(nextGenState.stats.dinero).toBe(37); // 50 - 13
    });

    test('Next Generation state correctly resets turn to 1, sets generation to N+1, resets partner statuses to alive, and preserves moneyLaundered', () => {
      const prevState: GameState = {
        ...createInitialGameState(),
        generation: 3,
        turn: 42,
        moneyLaundered: 850000,
        partnerA: {
          id: 'partnerA',
          name: 'Nico Gen 3',
          role: 'El Estratega',
          seed: 'partnerA-gen3',
          status: 'dead',
        },
        partnerB: {
          id: 'partnerB',
          name: 'Camila Gen 3',
          role: 'La Ejecutora',
          seed: 'partnerB-gen3',
          status: 'jailed',
        },
        gameOver: true,
      };

      const nextGen = createNextGenerationState(prevState);
      expect(nextGen.generation).toBe(4);
      expect(nextGen.turn).toBe(1);
      expect(nextGen.partnerA.status).toBe('alive');
      expect(nextGen.partnerB.status).toBe('alive');
      expect(nextGen.partnerA.name).toBe('Nico Gen 4');
      expect(nextGen.partnerB.name).toBe('Camila Gen 4');
      expect(nextGen.moneyLaundered).toBe(850000);
      expect(nextGen.history).toEqual([]);
      expect(nextGen.gameOver).toBe(false);
      expect(nextGen.currentCard).toBeDefined();
    });
  });

  // =========================================================================
  // SUITE 3: DECK RECYCLING & CONSECUTIVE DRAWS PAST 30 CARDS
  // =========================================================================
  describe('3. Deck Recycling & Consecutive Draws Past 30 Cards', () => {
    test('Drawing 60 consecutive cards never returns null/undefined card or causes infinite loops', () => {
      let state = createInitialGameState();
      const drawnCardIds: string[] = [];

      for (let turn = 1; turn <= 60; turn++) {
        const eligible = getEligibleCards(
          INITIAL_DECK,
          state.activePartner,
          state.flags,
          state.seenCardIds
        );

        expect(eligible.length).toBeGreaterThan(0);
        const nextCard = eligible[Math.floor(Math.random() * eligible.length)];
        expect(nextCard).toBeDefined();
        expect(nextCard.id).toBeDefined();
        expect(nextCard.l).toBeDefined();
        expect(nextCard.r).toBeDefined();

        drawnCardIds.push(nextCard.id);
        state = {
          ...state,
          turn: turn + 1,
          currentCard: nextCard,
          seenCardIds: [...state.seenCardIds, nextCard.id],
        };
      }

      expect(drawnCardIds.length).toBe(60);
    });

    test('When unplayed card pool drops below 3, getEligibleCards recycles full pool for active partner', () => {
      // Simulate Partner A having seen 23 out of 25 eligible cards
      const partnerABasePool = getEligibleCards(INITIAL_DECK, 'partnerA', {}, []);

      const almostAllSeen = partnerABasePool.slice(0, partnerABasePool.length - 2).map((c) => c.id);
      expect(partnerABasePool.length - almostAllSeen.length).toBe(2); // exactly 2 unplayed cards left

      const pool = getEligibleCards(INITIAL_DECK, 'partnerA', {}, almostAllSeen);
      // Since unplayed (2) < 3, it should recycle and return the full base pool
      expect(pool.length).toBe(partnerABasePool.length);
    });

    test('Perspective filtering is strictly maintained during deck recycling', () => {
      // Create seenCardIds containing every single card
      const allDeckIds = INITIAL_DECK.map((c) => c.id);

      // For partnerA, recycled pool MUST NEVER contain partnerB_only cards
      const partnerARecycled = getEligibleCards(INITIAL_DECK, 'partnerA', {}, allDeckIds);
      const invalidBForA = partnerARecycled.filter((c) => c.target === 'partnerB_only');
      expect(invalidBForA.length).toBe(0);

      // For partnerB, recycled pool MUST NEVER contain partnerA_only cards
      const partnerBRecycled = getEligibleCards(INITIAL_DECK, 'partnerB', {}, allDeckIds);
      const invalidAForB = partnerBRecycled.filter((c) => c.target === 'partnerA_only');
      expect(invalidAForB.length).toBe(0);
    });

    test('Stress test: 200 consecutive automated makeChoice executions in store without crashing', () => {
      const store = useGameStore.getState();
      store.initGame();

      let choiceCount = 0;
      for (let i = 0; i < 200; i++) {
        // Keep stats in safe range [30, 70] to stress test deck drawing mechanics across hundreds of turns
        useGameStore.setState({
          stats: { dinero: 50, policia: 50, estres: 50, respeto: 50 },
        });

        const currentCard = useGameStore.getState().currentCard;
        expect(currentCard).not.toBeNull();
        expect(currentCard?.id).toBeDefined();

        useGameStore.getState().makeChoice(i % 2 === 0 ? 'left' : 'right');
        choiceCount++;
      }

      const finalState = useGameStore.getState();
      expect(choiceCount).toBe(200);
      expect(finalState.turn).toBe(201);
      expect(finalState.currentCard).toBeDefined();
      expect(finalState.history.length).toBe(50); // Bounded at 50
    });
  });
});
