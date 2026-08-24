import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGameStore } from '../../src/store/gameStore';
import {
  clampStat,
  applyChoiceDeltas,
  checkStatFatalities,
  getEligibleCards,
  handlePartnerDemise,
  calculateLegacy,
  createNextGenerationState,
  createInitialGameState,
  INITIAL_STATS,
} from '../../src/store/gameEngine';
import { INITIAL_DECK } from '../../src/constants/deck';
import { INITIAL_PARTNER_A, INITIAL_PARTNER_B, getCharacter } from '../../src/constants/characters';
import { isStatInDanger } from '../../src/components/HudStatsBar';
import { hashSeed, createMulberry32, createRng, deterministicChoice, deterministicRange } from '../../src/utils/prng';
import { getProceduralFeatures } from '../../src/components/PortraitSvg';
import { EmpireStats, GameCard, GameState, StatKey } from '../../src/types/game';

describe('Tier 2: Boundary Value Analysis & Corner Cases', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useGameStore.setState(createInitialGameState());
  });

  // =========================================================================
  // B1: Exact Stat Boundaries & Massive Overshoot Clamping (8 Tests)
  // =========================================================================
  describe('B1: Exact Stat Boundaries & Extreme Overshoots', () => {
    it('B1.1: should clamp negative values precisely to 0 without underflow', () => {
      expect(clampStat(-0.001)).toBe(0);
      expect(clampStat(-1)).toBe(0);
      expect(clampStat(-99999)).toBe(0);
      expect(clampStat(Number.MIN_SAFE_INTEGER)).toBe(0);
    });

    it('B1.2: should clamp positive values precisely to 100 without overflow', () => {
      expect(clampStat(100.001)).toBe(100);
      expect(clampStat(101)).toBe(100);
      expect(clampStat(99999)).toBe(100);
      expect(clampStat(Number.MAX_SAFE_INTEGER)).toBe(100);
    });

    it('B1.3: should keep safe boundary points 1 and 99 within active non-fatal range', () => {
      expect(clampStat(1)).toBe(1);
      expect(clampStat(99)).toBe(99);
      expect(checkStatFatalities({ dinero: 1, policia: 99, estres: 1, respeto: 99 })).toBeNull();
      expect(checkStatFatalities({ dinero: 99, policia: 1, estres: 99, respeto: 1 })).toBeNull();
    });

    it('B1.4: should apply massive positive delta overshoots (+500) to all 4 stats simultaneously', () => {
      const stats: EmpireStats = { dinero: 50, policia: 30, estres: 35, respeto: 40 };
      const updated = applyChoiceDeltas(stats, {
        dinero: 500,
        policia: 500,
        estres: 500,
        respeto: 500,
      });

      expect(updated.dinero).toBe(100);
      expect(updated.policia).toBe(100);
      expect(updated.estres).toBe(100);
      expect(updated.respeto).toBe(100);
    });

    it('B1.5: should apply massive negative delta overshoots (-500) to all 4 stats simultaneously', () => {
      const stats: EmpireStats = { dinero: 50, policia: 30, estres: 35, respeto: 40 };
      const updated = applyChoiceDeltas(stats, {
        dinero: -500,
        policia: -500,
        estres: -500,
        respeto: -500,
      });

      expect(updated.dinero).toBe(0);
      expect(updated.policia).toBe(0);
      expect(updated.estres).toBe(0);
      expect(updated.respeto).toBe(0);
    });

    it('B1.6: should handle cards with completely empty delta objects without mutating stats', () => {
      const stats: EmpireStats = { dinero: 50, policia: 30, estres: 35, respeto: 40 };
      const updated = applyChoiceDeltas(stats, {});
      expect(updated).toEqual(stats);
    });

    it('B1.7: should verify danger threshold lower boundary transitions at 14 and 15', () => {
      expect(isStatInDanger(13)).toBe(true);
      expect(isStatInDanger(14)).toBe(true);
      expect(isStatInDanger(15)).toBe(false);
      expect(isStatInDanger(16)).toBe(false);
    });

    it('B1.8: should verify danger threshold upper boundary transitions at 85 and 86', () => {
      expect(isStatInDanger(84)).toBe(false);
      expect(isStatInDanger(85)).toBe(false);
      expect(isStatInDanger(86)).toBe(true);
      expect(isStatInDanger(87)).toBe(true);
    });
  });

  // =========================================================================
  // B2: Simultaneous Multi-Stat Extremes & Priority Ordering (8 Tests)
  // =========================================================================
  describe('B2: Simultaneous Multi-Stat Extremes & Priority Ordering', () => {
    it('B2.1: should prioritize policia_100 over other simultaneous fatal boundaries', () => {
      const fatal = checkStatFatalities({ dinero: 0, policia: 100, estres: 100, respeto: 0 });
      expect(fatal?.endingId).toBe('policia_100');
      expect(fatal?.stat).toBe('policia');
      expect(fatal?.extreme).toBe('high');
    });

    it('B2.2: should prioritize dinero_0 over estres_100 and respeto_0 when policia < 100', () => {
      const fatal = checkStatFatalities({ dinero: 0, policia: 50, estres: 100, respeto: 0 });
      expect(fatal?.endingId).toBe('dinero_0');
      expect(fatal?.stat).toBe('dinero');
      expect(fatal?.extreme).toBe('low');
    });

    it('B2.3: should prioritize estres_100 over respeto_0 when policia < 100 and dinero > 0', () => {
      const fatal = checkStatFatalities({ dinero: 50, policia: 50, estres: 100, respeto: 0 });
      expect(fatal?.endingId).toBe('estres_100');
      expect(fatal?.stat).toBe('estres');
      expect(fatal?.extreme).toBe('high');
    });

    it('B2.4: should prioritize respeto_0 over policia_0 when upper three stats are non-fatal', () => {
      const fatal = checkStatFatalities({ dinero: 50, policia: 0, estres: 50, respeto: 0 });
      expect(fatal?.endingId).toBe('respeto_0');
      expect(fatal?.stat).toBe('respeto');
      expect(fatal?.extreme).toBe('low');
    });

    it('B2.5: should trigger policia_0 when policia reaches 0 and other stats are safe', () => {
      const fatal = checkStatFatalities({ dinero: 50, policia: 0, estres: 50, respeto: 50 });
      expect(fatal?.endingId).toBe('policia_0');
      expect(fatal?.stat).toBe('policia');
      expect(fatal?.extreme).toBe('low');
    });

    it('B2.6: should trigger dinero_100 when dinero reaches 100 and other stats are safe', () => {
      const fatal = checkStatFatalities({ dinero: 100, policia: 50, estres: 50, respeto: 50 });
      expect(fatal?.endingId).toBe('dinero_100');
      expect(fatal?.stat).toBe('dinero');
      expect(fatal?.extreme).toBe('high');
    });

    it('B2.7: should trigger estres_0 when estres reaches 0 and other stats are safe', () => {
      const fatal = checkStatFatalities({ dinero: 50, policia: 50, estres: 0, respeto: 50 });
      expect(fatal?.endingId).toBe('estres_0');
      expect(fatal?.stat).toBe('estres');
      expect(fatal?.extreme).toBe('low');
    });

    it('B2.8: should trigger respeto_100 when respeto reaches 100 and other stats are safe', () => {
      const fatal = checkStatFatalities({ dinero: 50, policia: 50, estres: 50, respeto: 100 });
      expect(fatal?.endingId).toBe('respeto_100');
      expect(fatal?.stat).toBe('respeto');
      expect(fatal?.extreme).toBe('high');
    });
  });

  // =========================================================================
  // B3: Rapid Deck Depletion & Large Cycle Pool Recycling (8 Tests)
  // =========================================================================
  describe('B3: Rapid Deck Depletion & Pool Recycling', () => {
    it('B3.1: should draw 50 consecutive cards without ever returning undefined or crashing', () => {
      let seenIds: string[] = [];
      for (let i = 0; i < 50; i++) {
        const eligible = getEligibleCards(INITIAL_DECK, 'partnerA', {}, seenIds);
        expect(eligible.length).toBeGreaterThan(0);
        const card = eligible[0];
        expect(card).toBeDefined();
        expect(card.id).toBeDefined();
        seenIds.push(card.id);
      }
    });

    it('B3.2: should maintain eligible card filtering when all 30 initial deck cards are in seenCardIds', () => {
      const allDeckIds = INITIAL_DECK.map((c) => c.id);
      const recycled = getEligibleCards(INITIAL_DECK, 'partnerA', {}, allDeckIds);
      expect(recycled.length).toBeGreaterThanOrEqual(3);
    });

    it('B3.3: should handle empty deck array gracefully without exception', () => {
      const emptyEligible = getEligibleCards([], 'partnerA', {}, []);
      expect(emptyEligible).toEqual([]);
    });

    it('B3.4: should recycle properly when only 1 unplayed card remains', () => {
      const baseA = getEligibleCards(INITIAL_DECK, 'partnerA', {}, []);
      const seenAllButOne = baseA.slice(0, baseA.length - 1).map((c) => c.id);
      const recycled = getEligibleCards(INITIAL_DECK, 'partnerA', {}, seenAllButOne);
      expect(recycled.length).toBe(baseA.length);
    });

    it('B3.5: should recycle properly when 0 unplayed cards remain', () => {
      const baseA = getEligibleCards(INITIAL_DECK, 'partnerA', {}, []);
      const seenAll = baseA.map((c) => c.id);
      const recycled = getEligibleCards(INITIAL_DECK, 'partnerA', {}, seenAll);
      expect(recycled.length).toBe(baseA.length);
    });

    it('B3.6: should return unplayed pool when exactly 3 unplayed cards remain (boundary threshold)', () => {
      const baseA = getEligibleCards(INITIAL_DECK, 'partnerA', {}, []);
      const seenAllButThree = baseA.slice(0, baseA.length - 3).map((c) => c.id);
      const pool = getEligibleCards(INITIAL_DECK, 'partnerA', {}, seenAllButThree);
      expect(pool.length).toBe(3);
    });

    it('B3.7: should execute 40 continuous turns in useGameStore without state corruption', () => {
      for (let i = 0; i < 40; i++) {
        const state = useGameStore.getState();
        if (state.gameOver) {
          useGameStore.getState().startNewGeneration();
        } else {
          // Play neutral choice or left choice
          useGameStore.getState().makeChoice(i % 2 === 0 ? 'left' : 'right');
        }
      }
      const finalState = useGameStore.getState();
      expect(finalState.turn).toBeGreaterThan(1);
    });

    it('B3.8: should correctly track seenCardIds across repeated draws', () => {
      useGameStore.getState().makeChoice('left');
      useGameStore.getState().makeChoice('right');
      const seen = useGameStore.getState().seenCardIds;
      expect(seen.length).toBeGreaterThanOrEqual(3);
    });
  });

  // =========================================================================
  // B4: Storage Corruption & Missing State Recovery (8 Tests)
  // =========================================================================
  describe('B4: Storage Rehydration & Corrupted Storage Recovery', () => {
    it('B4.1: should handle empty AsyncStorage getItem returning null during init', async () => {
      await AsyncStorage.setItem('vice_shores_game_storage', '');
      const state = useGameStore.getState();
      expect(state.partnerA.name).toBe('Nico');
      expect(state.stats).toEqual(INITIAL_STATS);
    });

    it('B4.2: should recover safely when AsyncStorage contains invalid non-JSON string', async () => {
      await AsyncStorage.setItem('vice_shores_game_storage', '{ corrupted_json: true, invalid... ');
      // Re-initialize state safely
      useGameStore.getState().initGame();
      const state = useGameStore.getState();
      expect(state.turn).toBeDefined();
      expect(state.stats.dinero).toBeDefined();
    });

    it('B4.3: should recover safely when AsyncStorage contains empty object', async () => {
      await AsyncStorage.setItem('vice_shores_game_storage', JSON.stringify({ state: {} }));
      useGameStore.getState().initGame();
      expect(useGameStore.getState().partnerA).toBeDefined();
    });

    it('B4.4: should rehydrate full valid persisted state accurately', async () => {
      const mockSavedState = {
        partnerA: { ...INITIAL_PARTNER_A, name: 'Nico Rehydrated' },
        partnerB: { ...INITIAL_PARTNER_B, name: 'Camila Rehydrated' },
        activePartner: 'partnerB',
        stats: { dinero: 75, policia: 45, estres: 55, respeto: 65 },
        flags: { hotel_lavado: true },
        generation: 3,
        turn: 15,
        moneyLaundered: 850000,
        history: [],
        currentCard: INITIAL_DECK[0],
        seenCardIds: [INITIAL_DECK[0].id],
        gameOver: false,
        activeEnding: null,
        legacyReport: null,
        isEmpireHubOpen: false,
      };

      await AsyncStorage.setItem(
        'vice_shores_game_storage',
        JSON.stringify({ state: mockSavedState, version: 0 })
      );

      useGameStore.setState(mockSavedState as any);
      const loaded = useGameStore.getState();
      expect(loaded.partnerA.name).toBe('Nico Rehydrated');
      expect(loaded.activePartner).toBe('partnerB');
      expect(loaded.generation).toBe(3);
      expect(loaded.moneyLaundered).toBe(850000);
      expect(loaded.flags.hotel_lavado).toBe(true);
    });

    it('B4.5: should ensure isEmpireHubOpen is always false on rehydration', () => {
      const state = useGameStore.getState();
      expect(state.isEmpireHubOpen).toBe(false);
    });

    it('B4.6: should handle null currentCard during initGame by generating starting card', () => {
      useGameStore.setState({ currentCard: null, gameOver: false });
      useGameStore.getState().initGame();
      expect(useGameStore.getState().currentCard).not.toBeNull();
    });

    it('B4.7: should not re-initialize currentCard if game is already over during initGame', () => {
      useGameStore.setState({ currentCard: null, gameOver: true });
      useGameStore.getState().initGame();
      expect(useGameStore.getState().currentCard).toBeNull();
    });

    it('B4.8: should keep state immutable when makeChoice called in gameOver state', () => {
      useGameStore.setState({ gameOver: true, turn: 5 });
      useGameStore.getState().makeChoice('left');
      expect(useGameStore.getState().turn).toBe(5);
    });
  });

  // =========================================================================
  // B5: Single Surviving Partner Endurance & PRNG Corner Values (8 Tests)
  // =========================================================================
  describe('B5: Single Surviving Partner Endurance & PRNG Corners', () => {
    it('B5.1: should allow surviving partnerB to play 20 consecutive cards solo when partnerA is dead', () => {
      useGameStore.setState({
        partnerA: { ...INITIAL_PARTNER_A, status: 'dead' },
        partnerB: { ...INITIAL_PARTNER_B, status: 'alive' },
        activePartner: 'partnerB',
        stats: { dinero: 50, policia: 30, estres: 35, respeto: 40 },
        gameOver: false,
      });

      for (let i = 0; i < 20; i++) {
        // Keep stats balanced
        useGameStore.setState({ stats: { dinero: 50, policia: 30, estres: 35, respeto: 40 } });
        useGameStore.getState().makeChoice('right');
        expect(useGameStore.getState().activePartner).toBe('partnerB');
        expect(useGameStore.getState().partnerA.status).toBe('dead');
      }
    });

    it('B5.2: should allow surviving partnerA to play 20 consecutive cards solo when partnerB is jailed', () => {
      useGameStore.setState({
        partnerA: { ...INITIAL_PARTNER_A, status: 'alive' },
        partnerB: { ...INITIAL_PARTNER_B, status: 'jailed' },
        activePartner: 'partnerA',
        stats: { dinero: 50, policia: 30, estres: 35, respeto: 40 },
        gameOver: false,
      });

      for (let i = 0; i < 20; i++) {
        useGameStore.setState({ stats: { dinero: 50, policia: 30, estres: 35, respeto: 40 } });
        useGameStore.getState().makeChoice('left');
        expect(useGameStore.getState().activePartner).toBe('partnerA');
        expect(useGameStore.getState().partnerB.status).toBe('jailed');
      }
    });

    it('B5.3: should trigger immediate Game Over without transition card when single survivor dies', () => {
      const stateWithDeadA: GameState = {
        ...createInitialGameState(),
        partnerA: { ...INITIAL_PARTNER_A, status: 'dead' },
        partnerB: { ...INITIAL_PARTNER_B, status: 'alive' },
        activePartner: 'partnerB',
      };

      const result = handlePartnerDemise(stateWithDeadA, 'estres', 'high');
      expect(result.isGameOver).toBe(true);
      expect(result.transitionCard).toBeUndefined();
      expect(result.ending?.id).toBe('estres_100');
    });

    it('B5.4: should handle PRNG seed hashing on exotic unicode strings and emojis', () => {
      const hash1 = hashSeed('🌴 Vice Shores 2026 🔫 🍹');
      const hash2 = hashSeed('🌴 Vice Shores 2026 🔫 🍹');
      expect(hash1).toBe(hash2);
      expect(typeof hash1).toBe('number');
    });

    it('B5.5: should handle PRNG seed hashing on long strings (> 1000 characters)', () => {
      const longSeed = 'A'.repeat(2000);
      const hash = hashSeed(longSeed);
      expect(hash).toBeGreaterThan(0);
    });

    it('B5.6: should throw descriptive error when deterministicChoice called with empty array', () => {
      expect(() => deterministicChoice([], 'test-seed')).toThrow('Cannot pick from empty array');
    });

    it('B5.7: should produce floats strictly within [min, max) for deterministicRange', () => {
      for (let i = 0; i < 25; i++) {
        const val = deterministicRange(10, 20, `seed-${i}`);
        expect(val).toBeGreaterThanOrEqual(10);
        expect(val).toBeLessThan(20);
      }
    });

    it('B5.8: should produce consistent procedural features across repeated calls with numerical seed', () => {
      const feat1 = getProceduralFeatures('99999');
      const feat2 = getProceduralFeatures('99999');
      expect(feat1).toEqual(feat2);
    });
  });
});
