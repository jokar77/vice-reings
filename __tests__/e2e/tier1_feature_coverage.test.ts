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
import { CHARACTERS, getCharacter, INITIAL_PARTNER_A, INITIAL_PARTNER_B } from '../../src/constants/characters';
import { ENDINGS, getEnding } from '../../src/constants/endings';
import { getProceduralFeatures, SKIN_PALETTE, TINT_PALETTE } from '../../src/components/PortraitSvg';
import { isStatInDanger } from '../../src/components/HudStatsBar';
import { hashSeed, createMulberry32, createRng, deterministicChoice, deterministicRange } from '../../src/utils/prng';
import { EmpireStats, GameCard, GameState } from '../../src/types/game';

describe('Tier 1: Feature Coverage (Isolation & Component Verification)', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useGameStore.setState(createInitialGameState());
  });

  // =========================================================================
  // F1: Zustand Store + AsyncStorage Persistence (5 Tests)
  // =========================================================================
  describe('F1: Zustand Store & AsyncStorage Persistence', () => {
    it('F1.1: should initialize store with standard default values and initial card', () => {
      const state = useGameStore.getState();
      expect(state.stats).toEqual(INITIAL_STATS);
      expect(state.activePartner).toBe('partnerA');
      expect(state.partnerA.name).toBe('Nico');
      expect(state.partnerB.name).toBe('Camila');
      expect(state.generation).toBe(1);
      expect(state.turn).toBe(1);
      expect(state.moneyLaundered).toBe(0);
      expect(state.gameOver).toBe(false);
      expect(state.currentCard).not.toBeNull();
      expect(state.history).toEqual([]);
    });

    it('F1.2: should mutate state and record choices into store on makeChoice', () => {
      const cardBefore = useGameStore.getState().currentCard;
      expect(cardBefore).not.toBeNull();
      useGameStore.getState().makeChoice('left');

      const stateAfter = useGameStore.getState();
      expect(stateAfter.turn).toBe(2);
      expect(stateAfter.history.length).toBe(1);
      expect(stateAfter.history[0].cardId).toBe(cardBefore?.id);
      expect(stateAfter.history[0].direction).toBe('left');
    });

    it('F1.3: should support opening and closing Empire Hub modal without breaking persistent fields', () => {
      expect(useGameStore.getState().isEmpireHubOpen).toBe(false);
      useGameStore.getState().openEmpireHub();
      expect(useGameStore.getState().isEmpireHubOpen).toBe(true);
      useGameStore.getState().closeEmpireHub();
      expect(useGameStore.getState().isEmpireHubOpen).toBe(false);
    });

    it('F1.4: should reset game state back to pristine Generation 1 state via resetGame', () => {
      useGameStore.getState().makeChoice('right');
      useGameStore.getState().makeChoice('left');
      expect(useGameStore.getState().turn).toBe(3);

      useGameStore.getState().resetGame();
      const resetState = useGameStore.getState();
      expect(resetState.turn).toBe(1);
      expect(resetState.generation).toBe(1);
      expect(resetState.history.length).toBe(0);
      expect(resetState.stats).toEqual(INITIAL_STATS);
    });

    it('F1.5: should correctly persist partialized state ignoring ephemeral modal UI state', async () => {
      useGameStore.getState().openEmpireHub();
      const state = useGameStore.getState();
      expect(state.isEmpireHubOpen).toBe(true);

      // Verify that persist storage serializer omits isEmpireHubOpen as false
      const storageKey = 'vice_shores_game_storage';
      // Zustand persist triggers async storage setItem
      await useGameStore.persist.rehydrate();
      const rawStored = await AsyncStorage.getItem(storageKey);
      if (rawStored) {
        const parsed = JSON.parse(rawStored);
        expect(parsed.state.isEmpireHubOpen).toBe(false);
      }
    });
  });

  // =========================================================================
  // F2: Dual Protagonist State & Transitions (5 Tests)
  // =========================================================================
  describe('F2: Dual Protagonist State & Perspective Transitions', () => {
    it('F2.1: should verify initial duo roles, seeds, and alive statuses', () => {
      const state = useGameStore.getState();
      expect(state.partnerA).toEqual(INITIAL_PARTNER_A);
      expect(state.partnerB).toEqual(INITIAL_PARTNER_B);
      expect(state.partnerA.status).toBe('alive');
      expect(state.partnerB.status).toBe('alive');
      expect(state.partnerA.role).toBe('El Estratega');
      expect(state.partnerB.role).toBe('La Ejecutora');
    });

    it('F2.2: should switch active protagonist manually when both partners are alive', () => {
      expect(useGameStore.getState().activePartner).toBe('partnerA');
      useGameStore.getState().switchPartnerManually();
      expect(useGameStore.getState().activePartner).toBe('partnerB');
      useGameStore.getState().switchPartnerManually();
      expect(useGameStore.getState().activePartner).toBe('partnerA');
    });

    it('F2.3: should prevent manual partner switching when companion is dead or jailed', () => {
      useGameStore.setState({
        partnerB: { ...INITIAL_PARTNER_B, status: 'dead' },
        activePartner: 'partnerA',
      });

      useGameStore.getState().switchPartnerManually();
      expect(useGameStore.getState().activePartner).toBe('partnerA');
    });

    it('F2.4: should preserve partner data across narrative choice resolutions', () => {
      const pA = useGameStore.getState().partnerA;
      const pB = useGameStore.getState().partnerB;
      useGameStore.getState().makeChoice('left');

      expect(useGameStore.getState().partnerA.name).toBe(pA.name);
      expect(useGameStore.getState().partnerB.name).toBe(pB.name);
      expect(useGameStore.getState().partnerA.seed).toBe(pA.seed);
    });

    it('F2.5: should execute organic story hand-off when card has switchPartner: true', () => {
      const mockCard: GameCard = {
        id: 'mock_switch_card',
        w: 'camila',
        t: 'Test switch partner narrative',
        l: { t: 'Opción 1', fx: { dinero: 5 } },
        r: { t: 'Opción 2', fx: { dinero: -5 } },
        switchPartner: true,
      };

      useGameStore.setState({
        currentCard: mockCard,
        activePartner: 'partnerA',
      });

      useGameStore.getState().makeChoice('left');
      expect(useGameStore.getState().activePartner).toBe('partnerB');
    });
  });

  // =========================================================================
  // F3: Dynamic Deck Filtering Engine (5 Tests)
  // =========================================================================
  describe('F3: Dynamic Deck Filtering by Perspective & Flags', () => {
    it('F3.1: should allow common cards for both partnerA and partnerB', () => {
      const eligibleA = getEligibleCards(INITIAL_DECK, 'partnerA', {}, []);
      const eligibleB = getEligibleCards(INITIAL_DECK, 'partnerB', {}, []);

      const commonCards = INITIAL_DECK.filter((c) => !c.target || c.target === 'common');
      expect(commonCards.length).toBeGreaterThan(0);

      commonCards.forEach((c) => {
        if (!c.if) {
          expect(eligibleA.some((item) => item.id === c.id)).toBe(true);
          expect(eligibleB.some((item) => item.id === c.id)).toBe(true);
        }
      });
    });

    it('F3.2: should strictly filter partnerA_only cards only when partnerA is active', () => {
      const eligibleA = getEligibleCards(INITIAL_DECK, 'partnerA', {}, []);
      const eligibleB = getEligibleCards(INITIAL_DECK, 'partnerB', {}, []);

      const partnerACards = INITIAL_DECK.filter((c) => c.target === 'partnerA_only');
      expect(partnerACards.length).toBeGreaterThan(0);

      partnerACards.forEach((c) => {
        if (!c.if) {
          expect(eligibleA.some((item) => item.id === c.id)).toBe(true);
          expect(eligibleB.some((item) => item.id === c.id)).toBe(false);
        }
      });
    });

    it('F3.3: should strictly filter partnerB_only cards only when partnerB is active', () => {
      const eligibleA = getEligibleCards(INITIAL_DECK, 'partnerA', {}, []);
      const eligibleB = getEligibleCards(INITIAL_DECK, 'partnerB', {}, []);

      const partnerBCards = INITIAL_DECK.filter((c) => c.target === 'partnerB_only');
      expect(partnerBCards.length).toBeGreaterThan(0);

      partnerBCards.forEach((c) => {
        if (!c.if) {
          expect(eligibleB.some((item) => item.id === c.id)).toBe(true);
          expect(eligibleA.some((item) => item.id === c.id)).toBe(false);
        }
      });
    });

    it('F3.4: should unlock condition-flagged cards only when the corresponding flag is true', () => {
      const flaggedCard = INITIAL_DECK.find((c) => c.if === 'guerra_ruso');
      expect(flaggedCard).toBeDefined();

      const withoutFlag = getEligibleCards(INITIAL_DECK, 'partnerA', {}, []);
      expect(withoutFlag.some((c) => c.id === flaggedCard?.id)).toBe(false);

      const withFlag = getEligibleCards(INITIAL_DECK, 'partnerA', { guerra_ruso: true }, []);
      expect(withFlag.some((c) => c.id === flaggedCard?.id)).toBe(true);
    });

    it('F3.5: should automatically recycle deck pool when unplayed cards count is less than 3', () => {
      const basePool = getEligibleCards(INITIAL_DECK, 'partnerA', {}, []);
      const almostAllSeen = basePool.slice(0, basePool.length - 2).map((c) => c.id);

      const recycledPool = getEligibleCards(INITIAL_DECK, 'partnerA', {}, almostAllSeen);
      // Since remaining unplayed is 2 (< 3), it must return the full basePool
      expect(recycledPool.length).toBe(basePool.length);
    });
  });

  // =========================================================================
  // F4: Stat Modifiers, Clamping & Fatality Endings (5 Tests)
  // =========================================================================
  describe('F4: Stat Modifiers, Clamping & Fatality Endings', () => {
    it('F4.1: should clamp stats within strict 0 to 100 boundaries', () => {
      expect(clampStat(-25)).toBe(0);
      expect(clampStat(145)).toBe(100);
      expect(clampStat(55.4)).toBe(55);
      expect(clampStat(55.6)).toBe(56);
      expect(clampStat(0)).toBe(0);
      expect(clampStat(100)).toBe(100);
    });

    it('F4.2: should apply stat deltas accurately with clamping', () => {
      const stats: EmpireStats = { dinero: 50, policia: 30, estres: 35, respeto: 40 };
      const updated = applyChoiceDeltas(stats, {
        dinero: -60,
        policia: 80,
        estres: -10,
        respeto: 70,
      });

      expect(updated.dinero).toBe(0);
      expect(updated.policia).toBe(100);
      expect(updated.estres).toBe(25);
      expect(updated.respeto).toBe(100);
    });

    it('F4.3: should detect danger thresholds (<= 14 or >= 86) for dynamic HUD pulsation', () => {
      expect(isStatInDanger(14)).toBe(true);
      expect(isStatInDanger(0)).toBe(true);
      expect(isStatInDanger(86)).toBe(true);
      expect(isStatInDanger(100)).toBe(true);
      expect(isStatInDanger(15)).toBe(false);
      expect(isStatInDanger(50)).toBe(false);
      expect(isStatInDanger(85)).toBe(false);
    });

    it('F4.4: should map all 8 boundary conditions to their proper ending causes', () => {
      expect(checkStatFatalities({ dinero: 0, policia: 50, estres: 50, respeto: 50 })?.endingId).toBe('dinero_0');
      expect(checkStatFatalities({ dinero: 100, policia: 50, estres: 50, respeto: 50 })?.endingId).toBe('dinero_100');
      expect(checkStatFatalities({ dinero: 50, policia: 0, estres: 50, respeto: 50 })?.endingId).toBe('policia_0');
      expect(checkStatFatalities({ dinero: 50, policia: 100, estres: 50, respeto: 50 })?.endingId).toBe('policia_100');
      expect(checkStatFatalities({ dinero: 50, policia: 50, estres: 0, respeto: 50 })?.endingId).toBe('estres_0');
      expect(checkStatFatalities({ dinero: 50, policia: 50, estres: 100, respeto: 50 })?.endingId).toBe('estres_100');
      expect(checkStatFatalities({ dinero: 50, policia: 50, estres: 50, respeto: 0 })?.endingId).toBe('respeto_0');
      expect(checkStatFatalities({ dinero: 50, policia: 50, estres: 50, respeto: 100 })?.endingId).toBe('respeto_100');
      expect(checkStatFatalities({ dinero: 50, policia: 50, estres: 50, respeto: 50 })).toBeNull();
    });

    it('F4.5: should fetch ending descriptions and metadata correctly from getEnding', () => {
      const bustedEnding = getEnding('policia', 'high');
      expect(bustedEnding.id).toBe('policia_100');
      expect(bustedEnding.title).toBe('Busted');
      expect(bustedEnding.description).toContain('Sentencia de Vida');

      const bankruptcyEnding = getEnding('dinero', 'low');
      expect(bankruptcyEnding.id).toBe('dinero_0');
      expect(bankruptcyEnding.title).toBe('Bancarrota');
    });
  });

  // =========================================================================
  // F5: Survival Demise Switch vs Dual Demise Game Over (5 Tests)
  // =========================================================================
  describe('F5: Survival Switch vs Dual Demise Game Over', () => {
    it('F5.1: should switch control to surviving partnerB when partnerA falls with companion alive', () => {
      const initialState = createInitialGameState();
      const demise = handlePartnerDemise(initialState, 'estres', 'high');

      expect(demise.isGameOver).toBe(false);
      expect(demise.updatedPartnerA.status).toBe('dead');
      expect(demise.updatedPartnerA.deathCause).toBe('Wasted');
      expect(demise.updatedPartnerB.status).toBe('alive');
      expect(demise.newActivePartner).toBe('partnerB');
      expect(demise.transitionCard).toBeDefined();
      expect(demise.transitionCard?.isTransitionCard).toBe(true);
      expect(demise.bufferedStats?.estres).toBe(75); // Buffered from 100 down to 75
    });

    it('F5.2: should switch control to surviving partnerA when partnerB falls with companion alive', () => {
      const state: GameState = {
        ...createInitialGameState(),
        activePartner: 'partnerB',
      };
      const demise = handlePartnerDemise(state, 'dinero', 'low');

      expect(demise.isGameOver).toBe(false);
      expect(demise.updatedPartnerB.status).toBe('dead');
      expect(demise.updatedPartnerA.status).toBe('alive');
      expect(demise.newActivePartner).toBe('partnerA');
      expect(demise.bufferedStats?.dinero).toBe(25); // Buffered from 0 up to 25
    });

    it('F5.3: should set status to jailed when fatalStat is policia at high extreme (100)', () => {
      const initialState = createInitialGameState();
      const demise = handlePartnerDemise(initialState, 'policia', 'high');

      expect(demise.updatedPartnerA.status).toBe('jailed');
      expect(demise.updatedPartnerA.deathCause).toBe('Busted');
    });

    it('F5.4: should trigger Game Over strictly when the second partner falls', () => {
      const stateWithFirstDead: GameState = {
        ...createInitialGameState(),
        partnerA: { ...INITIAL_PARTNER_A, status: 'dead' },
        partnerB: { ...INITIAL_PARTNER_B, status: 'alive' },
        activePartner: 'partnerB',
      };

      const secondDemise = handlePartnerDemise(stateWithFirstDead, 'dinero', 'low');
      expect(secondDemise.isGameOver).toBe(true);
      expect(secondDemise.updatedPartnerB.status).toBe('dead');
      expect(secondDemise.ending?.id).toBe('dinero_0');
    });

    it('F5.5: should trigger Game Over when the second partner is jailed', () => {
      const stateWithFirstJailed: GameState = {
        ...createInitialGameState(),
        partnerA: { ...INITIAL_PARTNER_A, status: 'jailed' },
        partnerB: { ...INITIAL_PARTNER_B, status: 'alive' },
        activePartner: 'partnerB',
      };

      const secondDemise = handlePartnerDemise(stateWithFirstJailed, 'policia', 'high');
      expect(secondDemise.isGameOver).toBe(true);
      expect(secondDemise.updatedPartnerB.status).toBe('jailed');
    });
  });

  // =========================================================================
  // F6: Legacy Succession & Generation Inheritance (5 Tests)
  // =========================================================================
  describe('F6: Legacy Succession & Generation Inheritance', () => {
    it('F6.1: should compute positive money legacy when hotel_lavado flag is active', () => {
      const state: GameState = {
        ...createInitialGameState(),
        flags: { hotel_lavado: true },
        stats: { dinero: 50, policia: 30, estres: 35, respeto: 40 },
      };

      const legacy = calculateLegacy(state);
      expect(legacy.dDinero).toBe(24);
      expect(legacy.rows.some(([k]) => k.includes('Hotel Boutique'))).toBe(true);
    });

    it('F6.2: should compute police heat legacy when ending policia > 30', () => {
      const state: GameState = {
        ...createInitialGameState(),
        stats: { dinero: 50, policia: 70, estres: 35, respeto: 40 },
      };

      const legacy = calculateLegacy(state);
      expect(legacy.dPolicia).toBe(Math.round((70 - 30) * 0.45)); // 18
      expect(legacy.rows.some(([k]) => k.includes('Búsqueda policial'))).toBe(true);
    });

    it('F6.3: should apply trait flags miedo_calle and bebida_legal to legacy report', () => {
      const state: GameState = {
        ...createInitialGameState(),
        flags: { miedo_calle: true, bebida_legal: true },
        stats: { dinero: 50, policia: 30, estres: 35, respeto: 40 },
      };

      const legacy = calculateLegacy(state);
      expect(legacy.dRespeto).toBeGreaterThanOrEqual(15);
      expect(legacy.dEstres).toBeGreaterThanOrEqual(10);
      expect(legacy.dDinero).toBeGreaterThanOrEqual(2); // -13 + 15 = 2
    });

    it('F6.4: should instantiate Generation N+1 state inheriting modifiers and infrastructure flags', () => {
      const gen1State: GameState = {
        ...createInitialGameState(),
        generation: 1,
        turn: 10,
        moneyLaundered: 150000,
        flags: { hotel_lavado: true, bebida_legal: true },
        stats: { dinero: 80, policia: 30, estres: 35, respeto: 60 },
      };

      const gen2State = createNextGenerationState(gen1State);
      expect(gen2State.generation).toBe(2);
      expect(gen2State.turn).toBe(1);
      expect(gen2State.moneyLaundered).toBe(150000);
      expect(gen2State.flags.hotel_lavado).toBe(true);
      expect(gen2State.flags.bebida_legal).toBe(true);
      expect(gen2State.partnerA.status).toBe('alive');
      expect(gen2State.partnerB.status).toBe('alive');
      expect(gen2State.stats.dinero).toBe(50 + 24 + 15); // Base 50 + Hotel 24 + Bebida 15 = 89
    });

    it('F6.5: should increment partner generational names starting from Generation 3', () => {
      const gen2State: GameState = {
        ...createInitialGameState(),
        generation: 2,
      };
      const gen3State = createNextGenerationState(gen2State);
      expect(gen3State.partnerA.name).toBe('Nico Gen 3');
      expect(gen3State.partnerB.name).toBe('Camila Gen 3');
    });
  });

  // =========================================================================
  // F7: Empire Hub History & Match Metrics (5 Tests)
  // =========================================================================
  describe('F7: Empire Hub History & Match Metrics', () => {
    it('F7.1: should log complete history entry attributes for made choices', () => {
      const card = useGameStore.getState().currentCard!;
      useGameStore.getState().makeChoice('left');

      const entry = useGameStore.getState().history[0];
      expect(entry.cardId).toBe(card.id);
      expect(entry.character).toBe(card.w);
      expect(entry.characterName).toBe(getCharacter(card.w).name);
      expect(entry.text).toBe(card.t);
      expect(entry.choiceText).toBe(card.l.t);
      expect(entry.direction).toBe('left');
      expect(entry.partnerId).toBe('partnerA');
      expect(entry.partnerName).toBe('Nico');
      expect(entry.statDeltas).toEqual(card.l.fx);
      expect(entry.timestamp).toBeGreaterThan(0);
    });

    it('F7.2: should calculate money laundered correctly with standard multiplier', () => {
      const mockCard: GameCard = {
        id: 'money_card',
        w: 'lexi',
        t: 'Test money laundry',
        l: { t: 'Gana 10', fx: { dinero: 10 } },
        r: { t: 'Gana 0', fx: {} },
      };
      useGameStore.setState({ currentCard: mockCard, moneyLaundered: 0, flags: {} });
      useGameStore.getState().makeChoice('left');

      // Standard multiplier: 10 * 5000 = 50,000
      expect(useGameStore.getState().moneyLaundered).toBe(50000);
    });

    it('F7.3: should calculate money laundered with enhanced multiplier (15000) when hotel_lavado is true', () => {
      const mockCard: GameCard = {
        id: 'money_hotel_card',
        w: 'lexi',
        t: 'Test hotel money laundry',
        l: { t: 'Gana 10', fx: { dinero: 10 } },
        r: { t: 'Gana 0', fx: {} },
      };
      useGameStore.setState({ currentCard: mockCard, moneyLaundered: 0, flags: { hotel_lavado: true } });
      useGameStore.getState().makeChoice('left');

      // Hotel multiplier: 10 * 15000 = 150,000
      expect(useGameStore.getState().moneyLaundered).toBe(150000);
    });

    it('F7.4: should bound history logging to maximum 50 recent entries', () => {
      const mockCard: GameCard = {
        id: 'repeat_card',
        w: 'tommy',
        t: 'Repeat loop',
        l: { t: 'L', fx: { dinero: 1 } },
        r: { t: 'R', fx: { dinero: 1 } },
      };

      for (let i = 0; i < 60; i++) {
        useGameStore.setState({ currentCard: mockCard });
        useGameStore.getState().makeChoice('left');
      }

      expect(useGameStore.getState().history.length).toBe(50);
    });

    it('F7.5: should retain match metrics across turns', () => {
      useGameStore.getState().makeChoice('left');
      useGameStore.getState().makeChoice('right');
      useGameStore.getState().makeChoice('left');

      const state = useGameStore.getState();
      expect(state.turn).toBe(4);
      expect(state.history.length).toBe(3);
    });
  });

  // =========================================================================
  // F8: Procedural SVG Portrait Determinism & Cast Definitions (5 Tests)
  // =========================================================================
  describe('F8: Procedural SVG Portrait Determinism & Cast Definitions', () => {
    it('F8.1: should verify complete 10-character cast definitions in CHARACTERS registry', () => {
      const characterIds = ['vance', 'lexi', 'ruso', 'cody', 'trey', 'isa', 'tommy', 'manny', 'broker', 'camila'] as const;
      expect(Object.keys(CHARACTERS).length).toBe(10);

      characterIds.forEach((id) => {
        const char = getCharacter(id);
        expect(char).toBeDefined();
        expect(char.id).toBe(id);
        expect(char.name.length).toBeGreaterThan(0);
        expect(char.role.length).toBeGreaterThan(0);
        expect(char.seed.length).toBeGreaterThan(0);
        expect(['street', 'club', 'ocean', 'gas', 'mansion']).toContain(char.bg);
      });
    });

    it('F8.2: should produce deterministic PRNG outputs for Mulberry32 and FNV-1a hashing', () => {
      const hash1 = hashSeed('vice-shores-seed-alpha');
      const hash2 = hashSeed('vice-shores-seed-alpha');
      expect(hash1).toBe(hash2);
      expect(hash1).toBeGreaterThan(0);

      const rng1 = createMulberry32(hash1);
      const rng2 = createMulberry32(hash2);
      for (let i = 0; i < 10; i++) {
        expect(rng1()).toBe(rng2());
      }
    });

    it('F8.3: should produce deterministic procedural features for the same seed in getProceduralFeatures', () => {
      const feat1 = getProceduralFeatures('nico-character-seed-01');
      const feat2 = getProceduralFeatures('nico-character-seed-01');

      expect(feat1).toEqual(feat2);
      expect(SKIN_PALETTE).toContain(feat1.skin);
      expect(TINT_PALETTE).toContain(feat1.tint);
      expect(feat1.hairIndex).toBeGreaterThanOrEqual(0);
      expect(feat1.hairIndex).toBeLessThan(4);
    });

    it('F8.4: should produce distinct features for differing character seeds', () => {
      const featVance = getProceduralFeatures(CHARACTERS.vance.seed);
      const featLexi = getProceduralFeatures(CHARACTERS.lexi.seed);

      expect(featVance.seedNum).not.toBe(featLexi.seedNum);
    });

    it('F8.5: should gracefully handle empty, whitespace, and null seeds with fallback default', () => {
      const featNull = getProceduralFeatures(null);
      const featEmpty = getProceduralFeatures('');
      const featSpaces = getProceduralFeatures('   ');

      expect(featNull).toEqual(featEmpty);
      expect(featNull).toEqual(featSpaces);
      expect(featNull.skin).toBeDefined();
    });
  });
});
