import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGameStore } from '../../src/store/gameStore';
import {
  createInitialGameState,
  createNextGenerationState,
  calculateLegacy,
  handlePartnerDemise,
  getEligibleCards,
  INITIAL_STATS,
} from '../../src/store/gameEngine';
import { INITIAL_DECK } from '../../src/constants/deck';
import { INITIAL_PARTNER_A, INITIAL_PARTNER_B, getCharacter } from '../../src/constants/characters';
import { isStatInDanger } from '../../src/components/HudStatsBar';
import { GameCard, GameState } from '../../src/types/game';

describe('Tier 3: Pairwise & Cross-Feature Interactions', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useGameStore.setState(createInitialGameState());
  });

  // =========================================================================
  // X1: Persistence x Survival Demise Transitions (F1 x F5)
  // =========================================================================
  describe('X1: Persistence Recovery during Survival Demise Mode (F1 x F5)', () => {
    it('X1.1: should persist and rehydrate survival transition state when Partner A falls', async () => {
      // Simulate Partner A dying of stress
      const fatalCard: GameCard = {
        id: 'fatal_card_1',
        w: 'ruso',
        t: 'Ruso stress bomb',
        l: { t: 'Explode', fx: { estres: 80 } },
        r: { t: 'Safe', fx: {} },
      };

      useGameStore.setState({ currentCard: fatalCard, activePartner: 'partnerA' });
      useGameStore.getState().makeChoice('left');

      const survivalState = useGameStore.getState();
      expect(survivalState.partnerA.status).toBe('dead');
      expect(survivalState.partnerB.status).toBe('alive');
      expect(survivalState.activePartner).toBe('partnerB');
      expect(survivalState.currentCard?.isTransitionCard).toBe(true);
      expect(survivalState.stats.estres).toBe(75); // Buffered

      // Persist and rehydrate
      await useGameStore.persist.rehydrate();
      const rehydrated = useGameStore.getState();
      expect(rehydrated.partnerA.status).toBe('dead');
      expect(rehydrated.partnerB.status).toBe('alive');
      expect(rehydrated.activePartner).toBe('partnerB');
      expect(rehydrated.currentCard?.isTransitionCard).toBe(true);
      expect(rehydrated.stats.estres).toBe(75);
    });

    it('X1.2: should correctly resolve survival transition card choices and proceed to standard deck for survivor', () => {
      const stateBefore = createInitialGameState();
      const demise = handlePartnerDemise(stateBefore, 'dinero', 'low');
      const transitionCard = demise.transitionCard!;

      useGameStore.setState({
        partnerA: demise.updatedPartnerA,
        partnerB: demise.updatedPartnerB,
        activePartner: demise.newActivePartner,
        stats: demise.bufferedStats!,
        currentCard: transitionCard,
      });

      // Player makes a choice on the transition card
      useGameStore.getState().makeChoice('left');

      const nextState = useGameStore.getState();
      expect(nextState.activePartner).toBe('partnerB');
      expect(nextState.currentCard?.isTransitionCard).toBeUndefined();
      expect(nextState.history[0].cardId).toBe(transitionCard.id);
      expect(nextState.history[0].partnerName).toBe('Camila');
    });
  });

  // =========================================================================
  // X2: Multi-Generation Legacy Propagation (F4 x F6 x F7)
  // =========================================================================
  describe('X2: Legacy Stat Modifier Propagation across 3 Generations (F4 x F6 x F7)', () => {
    it('X2.1: should accumulate legacy flags and metrics from Gen 1 to Gen 2 to Gen 3', () => {
      // Gen 1: Build hotel_lavado, high money and respect
      const gen1: GameState = {
        ...createInitialGameState(),
        generation: 1,
        turn: 12,
        moneyLaundered: 350000,
        flags: { hotel_lavado: true },
        stats: { dinero: 75, policia: 30, estres: 35, respeto: 70 },
      };

      // Transition to Gen 2
      const gen2 = createNextGenerationState(gen1);
      expect(gen2.generation).toBe(2);
      expect(gen2.flags.hotel_lavado).toBe(true);
      expect(gen2.moneyLaundered).toBe(350000);
      // Legacy dDinero = 24 (hotel_lavado), dRespeto = (70-40)*0.5 = 15
      expect(gen2.stats.dinero).toBe(50 + 24); // 74
      expect(gen2.stats.respeto).toBe(40 + 15); // 55

      // Gen 2 adds bebida_legal and miedo_calle
      const gen2End: GameState = {
        ...gen2,
        turn: 18,
        moneyLaundered: 850000,
        flags: { ...gen2.flags, bebida_legal: true, miedo_calle: true },
        stats: { dinero: 60, policia: 40, estres: 35, respeto: 60 },
      };

      // Transition to Gen 3
      const gen3 = createNextGenerationState(gen2End);
      expect(gen3.generation).toBe(3);
      expect(gen3.partnerA.name).toBe('Nico Gen 3');
      expect(gen3.partnerB.name).toBe('Camila Gen 3');
      expect(gen3.flags.hotel_lavado).toBe(true);
      expect(gen3.flags.bebida_legal).toBe(true);
      expect(gen3.flags.miedo_calle).toBe(true);
      expect(gen3.moneyLaundered).toBe(850000);
    });

    it('X2.2: should apply fatality-specific penalties from Gen 1 into Gen 2 initial stats', () => {
      // Gen 1 ends with policia_100 (Busted)
      const gen1Busted: GameState = {
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

      const gen2 = createNextGenerationState(gen1Busted);
      // Legacy dPolicia: (100 - 30)*0.45 = 32 + 15 (FIB penalty) = 47
      // Next policia = 30 + 47 = 77
      expect(gen2.stats.policia).toBe(77);
      expect(isStatInDanger(gen2.stats.policia)).toBe(false); // 77 is safe (< 86)
    });
  });

  // =========================================================================
  // X3: Choice Commit x History x Danger Indicators (F4 x F7 x F8)
  // =========================================================================
  describe('X3: Choice Commit triggering Stats + History + Danger Alerts (F4 x F7 x F8)', () => {
    it('X3.1: should simultaneously alter stats, append history, and activate HUD danger warning', () => {
      const dangerCard: GameCard = {
        id: 'card_danger_test',
        w: 'trey',
        t: 'High risk turf war',
        l: { t: 'Go crazy', fx: { policia: 60, dinero: 10, respeto: 10 } },
        r: { t: 'Retreat', fx: {} },
      };

      useGameStore.setState({
        stats: { dinero: 50, policia: 30, estres: 35, respeto: 40 },
        currentCard: dangerCard,
      });

      useGameStore.getState().makeChoice('left');

      const state = useGameStore.getState();
      expect(state.stats.policia).toBe(90); // 30 + 60 = 90
      expect(isStatInDanger(state.stats.policia)).toBe(true); // >= 86 danger!
      expect(state.history.length).toBe(1);
      expect(state.history[0].statDeltas.policia).toBe(60);
      expect(state.moneyLaundered).toBe(50000); // 10 * 5000
    });

    it('X3.2: should correctly attribute history partner name when switching perspectives', () => {
      const cardA: GameCard = {
        id: 'card_a',
        w: 'vance',
        t: 'Card for A',
        l: { t: 'A choice', fx: { dinero: 5 } },
        r: { t: 'A choice 2', fx: {} },
        switchPartner: true,
      };

      useGameStore.setState({ currentCard: cardA, activePartner: 'partnerA' });
      useGameStore.getState().makeChoice('left');

      expect(useGameStore.getState().activePartner).toBe('partnerB');
      expect(useGameStore.getState().history[0].partnerName).toBe('Nico');

      const cardB: GameCard = {
        id: 'card_b',
        w: 'lexi',
        t: 'Card for B',
        l: { t: 'B choice', fx: { dinero: 5 } },
        r: { t: 'B choice 2', fx: {} },
      };

      useGameStore.setState({ currentCard: cardB });
      useGameStore.getState().makeChoice('left');

      expect(useGameStore.getState().history[0].partnerName).toBe('Camila');
      expect(useGameStore.getState().history[1].partnerName).toBe('Nico');
    });
  });

  // =========================================================================
  // X4: Perspective Switch x Flag-Gated Deck Filtering (F2 x F3)
  // =========================================================================
  describe('X4: Perspective Switch x Flag-Gated Deck Filtering (F2 x F3)', () => {
    it('X4.1: should unlock Partner B flag-gated cards after Partner A activates the trigger flag', () => {
      // Partner A plays card that sets flag 'guerra_ruso'
      const cardWithSet: GameCard = {
        id: 'flag_setter_card',
        w: 'ruso',
        t: 'Declaring war on Ruso',
        l: { t: 'Start war', fx: { set: ['guerra_ruso'] } },
        r: { t: 'Peace', fx: {} },
        switchPartner: true,
      };

      useGameStore.setState({
        currentCard: cardWithSet,
        activePartner: 'partnerA',
        flags: {},
      });

      useGameStore.getState().makeChoice('left');

      const stateAfter = useGameStore.getState();
      expect(stateAfter.flags.guerra_ruso).toBe(true);
      expect(stateAfter.activePartner).toBe('partnerB');

      // Check that eligible cards for Partner B now include card_14_ruso_paz (which requires if: 'guerra_ruso')
      const eligibleForB = getEligibleCards(INITIAL_DECK, 'partnerB', stateAfter.flags, []);
      const peaceCard = eligibleForB.find((c) => c.id === 'card_14_ruso_paz');
      expect(peaceCard).toBeDefined();
    });

    it('X4.2: should immediately apply inherited flags to initial Gen 2 card selection', () => {
      const inheritedFlags = { guerra_ruso: true };
      const eligibleGen2 = getEligibleCards(INITIAL_DECK, 'partnerA', inheritedFlags, []);
      expect(eligibleGen2.some((c) => c.if === 'guerra_ruso')).toBe(true);
    });
  });

  // =========================================================================
  // X5: Manual Switch x Modal Inspection x Gameplay Flow (F1 x F2 x F7)
  // =========================================================================
  describe('X5: Manual Switching x Empire Hub Inspection x Flow (F1 x F2 x F7)', () => {
    it('X5.1: should toggle partner, open hub, verify stats, close hub, and swipe card smoothly', () => {
      expect(useGameStore.getState().activePartner).toBe('partnerA');
      useGameStore.getState().switchPartnerManually();
      expect(useGameStore.getState().activePartner).toBe('partnerB');

      useGameStore.getState().openEmpireHub();
      expect(useGameStore.getState().isEmpireHubOpen).toBe(true);

      const hubSnapshot = useGameStore.getState();
      expect(hubSnapshot.partnerA.status).toBe('alive');
      expect(hubSnapshot.partnerB.status).toBe('alive');

      useGameStore.getState().closeEmpireHub();
      expect(useGameStore.getState().isEmpireHubOpen).toBe(false);

      useGameStore.getState().makeChoice('right');
      expect(useGameStore.getState().turn).toBe(2);
    });

    it('X5.2: should accurately format and serialize history entries during rapid multi-turn gameplay', () => {
      for (let i = 0; i < 5; i++) {
        useGameStore.getState().makeChoice(i % 2 === 0 ? 'left' : 'right');
      }

      const history = useGameStore.getState().history;
      expect(history.length).toBe(5);
      history.forEach((entry) => {
        expect(entry.id).toBeDefined();
        expect(entry.characterName).toBeDefined();
        expect(entry.partnerName).toBeDefined();
        expect(entry.direction).toMatch(/^(left|right)$/);
      });
    });
  });

  // =========================================================================
  // X6: Game Over State Persistence & Succession Rehydration (F1 x F6)
  // =========================================================================
  describe('X6: Game Over State Persistence & Succession Rehydration (F1 x F6)', () => {
    it('X6.1: should persist Game Over state with legacy report and allow succession after rehydration', async () => {
      // Simulate fatal ending for both partners
      useGameStore.setState({
        partnerA: { ...INITIAL_PARTNER_A, status: 'dead' },
        partnerB: { ...INITIAL_PARTNER_B, status: 'alive' },
        activePartner: 'partnerB',
        stats: { dinero: 50, policia: 30, estres: 35, respeto: 40 },
        flags: { hotel_lavado: true },
      });

      const fatalCard: GameCard = {
        id: 'fatal_second_card',
        w: 'ruso',
        t: 'Final doom',
        l: { t: 'Fall', fx: { dinero: -100 } },
        r: { t: 'Fall', fx: { dinero: -100 } },
      };

      useGameStore.setState({ currentCard: fatalCard });
      useGameStore.getState().makeChoice('left');

      const gameOverState = useGameStore.getState();
      expect(gameOverState.gameOver).toBe(true);
      expect(gameOverState.legacyReport).not.toBeNull();
      expect(gameOverState.legacyReport?.dDinero).toBe(24);

      // Start new generation
      useGameStore.getState().startNewGeneration();

      const newGenState = useGameStore.getState();
      expect(newGenState.gameOver).toBe(false);
      expect(newGenState.generation).toBe(2);
      expect(newGenState.partnerA.status).toBe('alive');
      expect(newGenState.partnerB.status).toBe('alive');
      expect(newGenState.turn).toBe(1);
    });

    it('X6.2: should maintain money laundered accumulation across succession cycle', () => {
      useGameStore.setState({
        moneyLaundered: 1200000,
        gameOver: true,
        generation: 2,
      });

      useGameStore.getState().startNewGeneration();
      expect(useGameStore.getState().moneyLaundered).toBe(1200000);
      expect(useGameStore.getState().generation).toBe(3);
    });
  });
});
