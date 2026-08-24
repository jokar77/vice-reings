import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGameStore } from '../../src/store/gameStore';
import {
  createInitialGameState,
  createNextGenerationState,
  calculateLegacy,
  checkStatFatalities,
  handlePartnerDemise,
  getEligibleCards,
  clampStat,
  applyChoiceDeltas,
  INITIAL_STATS,
} from '../../src/store/gameEngine';
import { INITIAL_DECK } from '../../src/constants/deck';
import { INITIAL_PARTNER_A, INITIAL_PARTNER_B, getCharacter, CHARACTERS } from '../../src/constants/characters';
import { getProceduralFeatures } from '../../src/components/PortraitSvg';
import { hashSeed, createMulberry32 } from '../../src/utils/prng';
import { GameCard, GameState, EmpireStats } from '../../src/types/game';

describe('Tier 5: Adversarial Stress & Hardening Test Suite', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useGameStore.setState(createInitialGameState());
  });

  // =========================================================================
  // ADV-1: Rapid Card Choice Spamming (1,000 Continuous Turns & Fuzzing)
  // =========================================================================
  describe('ADV-1: Rapid Card Choice Spamming (1,000 Continuous Turns)', () => {
    it('ADV-1.1: should execute 1,000 continuous turns with random choices and multi-generation recovery without crash or NaN', () => {
      const totalTurns = 1000;
      let totalGenerationsObserved = 1;

      for (let turn = 0; turn < totalTurns; turn++) {
        const state = useGameStore.getState();

        if (state.gameOver) {
          totalGenerationsObserved++;
          useGameStore.getState().startNewGeneration();
          const newGenState = useGameStore.getState();
          expect(newGenState.gameOver).toBe(false);
          expect(newGenState.currentCard).not.toBeNull();
        } else {
          const direction = turn % 3 === 0 ? 'left' : 'right';
          useGameStore.getState().makeChoice(direction);
        }

        const currentState = useGameStore.getState();
        // Strict stat invariant validation
        expect(Number.isFinite(currentState.stats.dinero)).toBe(true);
        expect(Number.isFinite(currentState.stats.policia)).toBe(true);
        expect(Number.isFinite(currentState.stats.estres)).toBe(true);
        expect(Number.isFinite(currentState.stats.respeto)).toBe(true);

        expect(currentState.stats.dinero).toBeGreaterThanOrEqual(0);
        expect(currentState.stats.dinero).toBeLessThanOrEqual(100);
        expect(currentState.stats.policia).toBeGreaterThanOrEqual(0);
        expect(currentState.stats.policia).toBeLessThanOrEqual(100);
        expect(currentState.stats.estres).toBeGreaterThanOrEqual(0);
        expect(currentState.stats.estres).toBeLessThanOrEqual(100);
        expect(currentState.stats.respeto).toBeGreaterThanOrEqual(0);
        expect(currentState.stats.respeto).toBeLessThanOrEqual(100);

        expect(currentState.moneyLaundered).toBeGreaterThanOrEqual(0);
        expect(Number.isInteger(currentState.moneyLaundered)).toBe(true);
      }

      const finalState = useGameStore.getState();
      expect(totalGenerationsObserved).toBeGreaterThanOrEqual(1);
      expect(finalState.history.length).toBeLessThanOrEqual(50);
    });

    it('ADV-1.2: should maintain strict 50-entry history bound during 1,000 continuous turns of sustained survival', () => {
      for (let turn = 0; turn < 1000; turn++) {
        // Feed cards with small harmless deltas to keep stats balanced within [30, 70]
        const safeCard: GameCard = {
          id: `safe_card_${turn % 20}`,
          w: 'manny',
          t: `Harmless loop turn ${turn}`,
          l: { t: 'Option L', fx: { dinero: turn % 2 === 0 ? 1 : -1, estres: turn % 2 === 0 ? -1 : 1 } },
          r: { t: 'Option R', fx: { policia: turn % 2 === 0 ? -1 : 1, respeto: turn % 2 === 0 ? 1 : -1 } },
        };

        useGameStore.setState({
          currentCard: safeCard,
          stats: { dinero: 50, policia: 50, estres: 50, respeto: 50 },
          gameOver: false,
        });

        useGameStore.getState().makeChoice(turn % 2 === 0 ? 'left' : 'right');

        const state = useGameStore.getState();
        expect(state.history.length).toBeLessThanOrEqual(50);
      }

      const finalHistory = useGameStore.getState().history;
      expect(finalHistory.length).toBe(50);
      // Verify newest entry is first
      expect(finalHistory[0].text).toContain('Harmless loop turn 999');
    });

    it('ADV-1.3: should monotonically increment turn numbers across 1,000 non-fatal choice cycles', () => {
      let expectedTurn = 1;
      expect(useGameStore.getState().turn).toBe(expectedTurn);

      for (let i = 0; i < 1000; i++) {
        const dummyCard: GameCard = {
          id: `dummy_${i}`,
          w: 'cody',
          t: `Tick ${i}`,
          l: { t: 'Next', fx: {} },
          r: { t: 'Next', fx: {} },
        };
        useGameStore.setState({
          currentCard: dummyCard,
          stats: { dinero: 50, policia: 50, estres: 50, respeto: 50 },
          gameOver: false,
        });

        useGameStore.getState().makeChoice('left');
        expectedTurn++;
        expect(useGameStore.getState().turn).toBe(expectedTurn);
      }

      expect(useGameStore.getState().turn).toBe(1001);
    });

    it('ADV-1.4: should complete 1,000 rapid card choices in under 1 second', () => {
      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        const rapidCard = INITIAL_DECK[i % INITIAL_DECK.length];
        useGameStore.setState({
          currentCard: rapidCard,
          stats: { dinero: 50, policia: 50, estres: 50, respeto: 50 },
          gameOver: false,
        });
        useGameStore.getState().makeChoice(i % 2 === 0 ? 'left' : 'right');
      }

      const durationMs = Date.now() - startTime;
      expect(durationMs).toBeLessThan(1000);
    });

    it('ADV-1.5: should withstand randomized fuzzing of manual switches and choices for 1,000 steps', () => {
      for (let step = 0; step < 1000; step++) {
        const actionType = step % 5;
        if (actionType === 0) {
          useGameStore.getState().switchPartnerManually();
        } else if (actionType === 1) {
          useGameStore.getState().openEmpireHub();
          useGameStore.getState().closeEmpireHub();
        } else {
          const state = useGameStore.getState();
          if (state.gameOver) {
            useGameStore.getState().startNewGeneration();
          } else {
            useGameStore.getState().makeChoice(step % 2 === 0 ? 'left' : 'right');
          }
        }
      }

      const finalState = useGameStore.getState();
      expect(finalState.partnerA).toBeDefined();
      expect(finalState.partnerB).toBeDefined();
      expect(['alive', 'dead', 'jailed']).toContain(finalState.partnerA.status);
      expect(['alive', 'dead', 'jailed']).toContain(finalState.partnerB.status);
    });
  });

  // =========================================================================
  // ADV-2: High-Order Multi-Generation Legacy Stacking (10 Generations)
  // =========================================================================
  describe('ADV-2: High-Order Multi-Generation Legacy Stacking (10 Consecutive Generations)', () => {
    it('ADV-2.1: should complete 10 full generational successions reaching Generation 10', () => {
      for (let gen = 1; gen < 10; gen++) {
        const currentGenState = useGameStore.getState();
        expect(currentGenState.generation).toBe(gen);

        // Simulate game over for current generation
        useGameStore.setState({
          gameOver: true,
          activeEnding: {
            id: 'policia_100',
            title: 'Busted',
            description: 'Redada final',
            stat: 'policia',
            extreme: 'high',
          },
          partnerA: { ...currentGenState.partnerA, status: 'jailed' },
          partnerB: { ...currentGenState.partnerB, status: 'jailed' },
        });

        useGameStore.getState().startNewGeneration();
      }

      const gen10State = useGameStore.getState();
      expect(gen10State.generation).toBe(10);
      expect(gen10State.turn).toBe(1);
      expect(gen10State.gameOver).toBe(false);
      expect(gen10State.partnerA.status).toBe('alive');
      expect(gen10State.partnerB.status).toBe('alive');
    });

    it('ADV-2.2: should properly format partner names across all 10 generations', () => {
      let state = createInitialGameState();
      expect(state.partnerA.name).toBe('Nico');
      expect(state.partnerB.name).toBe('Camila');

      // Gen 2
      state = createNextGenerationState(state);
      expect(state.generation).toBe(2);
      expect(state.partnerA.name).toBe('Nico');
      expect(state.partnerB.name).toBe('Camila');

      // Gen 3 to 10
      for (let g = 3; g <= 10; g++) {
        state = createNextGenerationState(state);
        expect(state.generation).toBe(g);
        expect(state.partnerA.name).toBe(`Nico Gen ${g}`);
        expect(state.partnerB.name).toBe(`Camila Gen ${g}`);
      }
    });

    it('ADV-2.3: should generate valid procedural SVG features for all 10 generation seeds', () => {
      let state = createInitialGameState();

      for (let g = 1; g <= 10; g++) {
        const featA = getProceduralFeatures(state.partnerA.seed);
        const featB = getProceduralFeatures(state.partnerB.seed);

        expect(featA).toBeDefined();
        expect(featA.skin).toMatch(/^#/);
        expect(featA.tint).toMatch(/^#/);
        expect(featA.hairIndex).toBeGreaterThanOrEqual(0);
        expect(featA.hairIndex).toBeLessThan(4);

        expect(featB).toBeDefined();
        expect(featB.skin).toMatch(/^#/);
        expect(featB.tint).toMatch(/^#/);
        expect(featB.hairIndex).toBeGreaterThanOrEqual(0);
        expect(featB.hairIndex).toBeLessThan(4);

        if (g < 10) {
          state = createNextGenerationState(state);
        }
      }
    });

    it('ADV-2.4: should preserve legacy infrastructure flags across all 10 generations', () => {
      let state: GameState = {
        ...createInitialGameState(),
        flags: { hotel_lavado: true, bebida_legal: true, miedo_calle: true },
      };

      for (let g = 2; g <= 10; g++) {
        state = createNextGenerationState(state);
        expect(state.flags.hotel_lavado).toBe(true);
        expect(state.flags.bebida_legal).toBe(true);
        expect(state.flags.miedo_calle).toBe(true);
      }
    });

    it('ADV-2.5: should accumulate lifetime money laundered monotonically across 10 generations', () => {
      let state: GameState = {
        ...createInitialGameState(),
        moneyLaundered: 100000,
      };

      for (let g = 2; g <= 10; g++) {
        state = {
          ...state,
          moneyLaundered: state.moneyLaundered + 50000 * g,
        };
        state = createNextGenerationState(state);
        expect(state.moneyLaundered).toBeGreaterThanOrEqual(100000);
      }

      expect(state.moneyLaundered).toBe(100000 + 50000 * (2 + 3 + 4 + 5 + 6 + 7 + 8 + 9 + 10));
    });

    it('ADV-2.6: should clamp stats safely in [0, 100] even with extreme compounding legacy modifiers over 10 generations', () => {
      let state: GameState = {
        ...createInitialGameState(),
        stats: { dinero: 100, policia: 100, estres: 100, respeto: 100 },
        flags: { hotel_lavado: true, bebida_legal: true, miedo_calle: true },
        activeEnding: {
          id: 'policia_100',
          title: 'Busted',
          description: 'Max heat',
          stat: 'policia',
          extreme: 'high',
        },
      };

      for (let g = 2; g <= 10; g++) {
        state = createNextGenerationState(state);
        expect(state.stats.dinero).toBeLessThanOrEqual(100);
        expect(state.stats.dinero).toBeGreaterThanOrEqual(0);
        expect(state.stats.policia).toBeLessThanOrEqual(100);
        expect(state.stats.policia).toBeGreaterThanOrEqual(0);
        expect(state.stats.estres).toBeLessThanOrEqual(100);
        expect(state.stats.estres).toBeGreaterThanOrEqual(0);
        expect(state.stats.respeto).toBeLessThanOrEqual(100);
        expect(state.stats.respeto).toBeGreaterThanOrEqual(0);
      }
    });

    it('ADV-2.7: should correctly calculate legacy reports for all 8 possible ending types over multi-generation chain', () => {
      const endingIds = [
        'dinero_0',
        'dinero_100',
        'policia_0',
        'policia_100',
        'estres_0',
        'estres_100',
        'respeto_0',
        'respeto_100',
      ];

      endingIds.forEach((endId, idx) => {
        const dummyState: GameState = {
          ...createInitialGameState(),
          generation: idx + 1,
          activeEnding: {
            id: endId,
            title: `Ending ${endId}`,
            description: 'Test death',
            stat: endId.split('_')[0] as any,
            extreme: endId.split('_')[1] === '100' ? 'high' : 'low',
          },
        };

        const report = calculateLegacy(dummyState);
        expect(report.generation).toBe(idx + 1);
        expect(report.causeOfDeath).toBe(`Ending ${endId}`);
        expect(report.rows).toBeInstanceOf(Array);
      });
    });
  });

  // =========================================================================
  // ADV-3: Edge Case Flag Condition Combinations & Missing Flag Resiliency
  // =========================================================================
  describe('ADV-3: Edge Case Flag Condition Combinations & Resiliency', () => {
    it('ADV-3.1: should return all unlocked cards when all possible condition flags are enabled simultaneously', () => {
      const allFlags: Record<string, boolean> = {
        vance_mad: true,
        guerra_ruso: true,
        hotel_lavado: true,
        bebida_legal: true,
        miedo_calle: true,
        extra_arbitrary_flag: true,
      };

      const eligibleA = getEligibleCards(INITIAL_DECK, 'partnerA', allFlags, []);
      const eligibleB = getEligibleCards(INITIAL_DECK, 'partnerB', allFlags, []);

      // With all flags active, card_14_ruso_paz and card_16_isa_testimonio should both be available
      expect(eligibleA.some((c) => c.id === 'card_14_ruso_paz')).toBe(true);
      expect(eligibleA.some((c) => c.id === 'card_16_isa_testimonio')).toBe(true);
      expect(eligibleB.some((c) => c.id === 'card_14_ruso_paz')).toBe(true);
      expect(eligibleB.some((c) => c.id === 'card_16_isa_testimonio')).toBe(true);
    });

    it('ADV-3.2: should handle cards requiring non-existent or unregistered flags gracefully without throwing', () => {
      const customDeck: GameCard[] = [
        {
          id: 'unregistered_flag_card',
          w: 'manny',
          t: 'Ghost flag card',
          l: { t: 'L', fx: {} },
          r: { t: 'R', fx: {} },
          if: 'completely_unknown_flag_9999',
        },
        ...INITIAL_DECK,
      ];

      const eligible = getEligibleCards(customDeck, 'partnerA', {}, []);
      expect(eligible.some((c) => c.id === 'unregistered_flag_card')).toBe(false);

      const eligibleWithFlag = getEligibleCards(
        customDeck,
        'partnerA',
        { completely_unknown_flag_9999: true },
        []
      );
      expect(eligibleWithFlag.some((c) => c.id === 'unregistered_flag_card')).toBe(true);
    });

    it('ADV-3.3: should handle falsy, null, and undefined flag dictionary values safely', () => {
      const corruptFlags = {
        vance_mad: false,
        guerra_ruso: null as any,
        hotel_lavado: undefined as any,
        miedo_calle: 0 as any,
        bebida_legal: '' as any,
      };

      const eligibleA = getEligibleCards(INITIAL_DECK, 'partnerA', corruptFlags, []);
      // Cards requiring true flags should NOT be included
      expect(eligibleA.some((c) => c.id === 'card_14_ruso_paz')).toBe(false);
      expect(eligibleA.some((c) => c.id === 'card_16_isa_testimonio')).toBe(false);
      expect(eligibleA.length).toBeGreaterThanOrEqual(3);
    });

    it('ADV-3.4: should dynamically set multiple flags from a single card choice without dropping existing flags', () => {
      const multiFlagCard: GameCard = {
        id: 'multi_flag_card',
        w: 'lexi',
        t: 'Mega deal unlocking everything',
        l: {
          t: 'Unlock',
          fx: {
            set: ['vance_mad', 'guerra_ruso'],
            legado: ['hotel_lavado', 'miedo_calle'],
          },
        },
        r: { t: 'Pass', fx: {} },
      };

      useGameStore.setState({
        currentCard: multiFlagCard,
        flags: { existing_custom_flag: true },
      });

      useGameStore.getState().makeChoice('left');

      const flags = useGameStore.getState().flags;
      expect(flags.existing_custom_flag).toBe(true);
      expect(flags.vance_mad).toBe(true);
      expect(flags.guerra_ruso).toBe(true);
      expect(flags.hotel_lavado).toBe(true);
      expect(flags.miedo_calle).toBe(true);
    });

    it('ADV-3.5: should fallback to full deck when custom deck has zero matching cards for active partner', () => {
      const partnerBOnlyDeck: GameCard[] = [
        {
          id: 'card_b_only',
          w: 'broker',
          t: 'Exclusive B',
          l: { t: 'L', fx: {} },
          r: { t: 'R', fx: {} },
          target: 'partnerB_only',
        },
      ];

      // Partner A has 0 matching cards in partnerBOnlyDeck
      const result = getEligibleCards(partnerBOnlyDeck, 'partnerA', {}, []);
      expect(result).toEqual(partnerBOnlyDeck);
    });

    it('ADV-3.6: should survive serialization and rehydration with 50+ custom flags', async () => {
      const massiveFlags: Record<string, boolean> = {};
      for (let i = 0; i < 50; i++) {
        massiveFlags[`flag_custom_${i}`] = i % 2 === 0;
      }

      useGameStore.setState({ flags: massiveFlags });
      await useGameStore.persist.rehydrate();

      const storedFlags = useGameStore.getState().flags;
      expect(Object.keys(storedFlags).length).toBe(50);
      expect(storedFlags.flag_custom_0).toBe(true);
      expect(storedFlags.flag_custom_1).toBe(false);
    });
  });

  // =========================================================================
  // ADV-4: Numerical Extremes, Boundary Fuzzing & Resilience
  // =========================================================================
  describe('ADV-4: Numerical Extremes, Boundary Fuzzing & Resilience', () => {
    it('ADV-4.1: should clamp fractional and sub-integer stat deltas cleanly to integers in [0, 100]', () => {
      const stats: EmpireStats = { dinero: 50, policia: 50, estres: 50, respeto: 50 };
      const updated = applyChoiceDeltas(stats, {
        dinero: 5.4,
        policia: -5.6,
        estres: 0.00001,
        respeto: -0.00001,
      });

      expect(Number.isInteger(updated.dinero)).toBe(true);
      expect(Number.isInteger(updated.policia)).toBe(true);
      expect(Number.isInteger(updated.estres)).toBe(true);
      expect(Number.isInteger(updated.respeto)).toBe(true);

      expect(updated.dinero).toBe(55);
      expect(updated.policia).toBe(44);
      expect(updated.estres).toBe(50);
      expect(updated.respeto).toBe(50);
    });

    it('ADV-4.2: should safely clamp gigantic delta values (+1,000,000 and -1,000,000)', () => {
      const stats: EmpireStats = { dinero: 50, policia: 50, estres: 50, respeto: 50 };
      const updated = applyChoiceDeltas(stats, {
        dinero: 1000000,
        policia: -1000000,
        estres: 999999999,
        respeto: -999999999,
      });

      expect(updated.dinero).toBe(100);
      expect(updated.policia).toBe(0);
      expect(updated.estres).toBe(100);
      expect(updated.respeto).toBe(0);
    });

    it('ADV-4.3: should handle card choices with missing fx properties or empty objects', () => {
      const emptyFxCard: GameCard = {
        id: 'empty_fx_card',
        w: 'tommy',
        t: 'Card without stats',
        l: { t: 'Left', fx: {} },
        r: { t: 'Right', fx: { set: [] } },
      };

      useGameStore.setState({ currentCard: emptyFxCard });
      useGameStore.getState().makeChoice('left');
      expect(useGameStore.getState().stats).toEqual(INITIAL_STATS);

      useGameStore.setState({ currentCard: emptyFxCard });
      useGameStore.getState().makeChoice('right');
      expect(useGameStore.getState().stats).toEqual(INITIAL_STATS);
    });

    it('ADV-4.4: should handle 500 rapid consecutive manual perspective switches without state desync', () => {
      for (let i = 0; i < 500; i++) {
        useGameStore.getState().switchPartnerManually();
        const active = useGameStore.getState().activePartner;
        expect(['partnerA', 'partnerB']).toContain(active);
        expect(useGameStore.getState().currentCard).not.toBeNull();
      }
      expect(useGameStore.getState().activePartner).toBe('partnerA');
    });

    it('ADV-4.5: should withstand extreme seed inputs in procedural portrait generator', () => {
      const exoticSeeds = [
        '🔥💀 Vice City Synthwave 1986 🚗🌴',
        '\\n\\r\\t\\"\'/><script>alert(1)</script>',
        'A'.repeat(5000),
        '   \t   \n  ',
        '0',
        '-1',
        'undefined',
        'null',
      ];

      exoticSeeds.forEach((seed) => {
        const feat = getProceduralFeatures(seed);
        expect(feat).toBeDefined();
        expect(feat.skin).toBeDefined();
        expect(feat.tint).toBeDefined();
        expect(feat.seedNum).toBeGreaterThanOrEqual(0);
      });
    });
  });
});
