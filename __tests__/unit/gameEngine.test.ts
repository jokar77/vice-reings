import {
  applyChoiceDeltas,
  calculateLegacy,
  checkStatFatalities,
  clampStat,
  createInitialGameState,
  createNextGenerationState,
  handlePartnerDemise,
  INITIAL_STATS,
} from '../../src/store/gameEngine';
import { EmpireStats, GameState } from '../../src/types/game';

describe('Game Engine Core Rules', () => {
  describe('clampStat', () => {
    it('clamps values strictly within 0 and 100', () => {
      expect(clampStat(50)).toBe(50);
      expect(clampStat(-20)).toBe(0);
      expect(clampStat(150)).toBe(100);
      expect(clampStat(0)).toBe(0);
      expect(clampStat(100)).toBe(100);
    });

    it('rounds non-integer values', () => {
      expect(clampStat(45.6)).toBe(46);
      expect(clampStat(45.2)).toBe(45);
    });
  });

  describe('applyChoiceDeltas', () => {
    const baseStats: EmpireStats = {
      dinero: 50,
      policia: 30,
      estres: 35,
      respeto: 40,
    };

    it('applies positive and negative stat deltas', () => {
      const updated = applyChoiceDeltas(baseStats, {
        dinero: 15,
        policia: -10,
        estres: 5,
        respeto: -5,
      });

      expect(updated).toEqual({
        dinero: 65,
        policia: 20,
        estres: 40,
        respeto: 35,
      });
    });

    it('strictly clamps result to 0 and 100 on overflowing changes', () => {
      const updated = applyChoiceDeltas(baseStats, {
        dinero: 80, // 50 + 80 -> 100
        policia: -50, // 30 - 50 -> 0
        estres: 100, // 35 + 100 -> 100
        respeto: -80, // 40 - 80 -> 0
      });

      expect(updated.dinero).toBe(100);
      expect(updated.policia).toBe(0);
      expect(updated.estres).toBe(100);
      expect(updated.respeto).toBe(0);
    });
  });

  describe('checkStatFatalities', () => {
    it('detects policia >= 100', () => {
      const result = checkStatFatalities({ dinero: 50, policia: 100, estres: 35, respeto: 40 });
      expect(result).toEqual({ stat: 'policia', extreme: 'high', endingId: 'policia_100' });
    });

    it('detects dinero <= 0', () => {
      const result = checkStatFatalities({ dinero: 0, policia: 30, estres: 35, respeto: 40 });
      expect(result).toEqual({ stat: 'dinero', extreme: 'low', endingId: 'dinero_0' });
    });

    it('detects estres >= 100', () => {
      const result = checkStatFatalities({ dinero: 50, policia: 30, estres: 100, respeto: 40 });
      expect(result).toEqual({ stat: 'estres', extreme: 'high', endingId: 'estres_100' });
    });

    it('detects respeto <= 0', () => {
      const result = checkStatFatalities({ dinero: 50, policia: 30, estres: 35, respeto: 0 });
      expect(result).toEqual({ stat: 'respeto', extreme: 'low', endingId: 'respeto_0' });
    });

    it('returns null when all stats are safe (1..99)', () => {
      const result = checkStatFatalities(INITIAL_STATS);
      expect(result).toBeNull();
    });
  });

  describe('handlePartnerDemise & Dual Protagonist Life/Death', () => {
    let mockState: GameState;

    beforeEach(() => {
      mockState = createInitialGameState();
    });

    it('auto-switches to partnerB when active partnerA falls and partnerB is alive', () => {
      mockState.activePartner = 'partnerA';
      mockState.partnerA.status = 'alive';
      mockState.partnerB.status = 'alive';
      mockState.stats.estres = 100;

      const result = handlePartnerDemise(mockState, 'estres', 'high');

      expect(result.updatedPartnerA.status).toBe('dead');
      expect(result.updatedPartnerB.status).toBe('alive');
      expect(result.newActivePartner).toBe('partnerB');
      expect(result.isGameOver).toBe(false);
      expect(result.bufferedStats).toBeDefined();
      expect(result.bufferedStats?.estres).toBe(75);
      expect(result.transitionCard).toBeDefined();
      expect(result.transitionCard?.isTransitionCard).toBe(true);
      expect(result.transitionCard?.t).toContain('Nico ha caído');
    });

    it('sets status to jailed when fatal cause is high police heat', () => {
      mockState.activePartner = 'partnerA';
      mockState.partnerA.status = 'alive';
      mockState.partnerB.status = 'alive';
      mockState.stats.policia = 100;

      const result = handlePartnerDemise(mockState, 'policia', 'high');

      expect(result.updatedPartnerA.status).toBe('jailed');
      expect(result.newActivePartner).toBe('partnerB');
      expect(result.isGameOver).toBe(false);
      expect(result.bufferedStats?.policia).toBe(75);
      expect(result.transitionCard?.t).toContain('arrestado');
    });

    it('auto-switches to partnerA when active partnerB falls and partnerA is alive', () => {
      mockState.activePartner = 'partnerB';
      mockState.partnerA.status = 'alive';
      mockState.partnerB.status = 'alive';
      mockState.stats.dinero = 0;

      const result = handlePartnerDemise(mockState, 'dinero', 'low');

      expect(result.updatedPartnerB.status).toBe('dead');
      expect(result.updatedPartnerA.status).toBe('alive');
      expect(result.newActivePartner).toBe('partnerA');
      expect(result.isGameOver).toBe(false);
      expect(result.bufferedStats?.dinero).toBe(25);
      expect(result.transitionCard).toBeDefined();
    });

    it('triggers game over strictly when both partners fall', () => {
      // PartnerA is already dead
      mockState.partnerA.status = 'dead';
      mockState.partnerA.deathCause = 'Wasted';
      mockState.partnerB.status = 'alive';
      mockState.activePartner = 'partnerB';

      // Now PartnerB also falls
      const result = handlePartnerDemise(mockState, 'policia', 'high');

      expect(result.updatedPartnerA.status).toBe('dead');
      expect(result.updatedPartnerB.status).toBe('jailed');
      expect(result.isGameOver).toBe(true);
      expect(result.ending).toBeDefined();
      expect(result.ending?.id).toBe('policia_100');
    });
  });

  describe('Legacy & Succession Engine', () => {
    it('calculates legacy report accurately with positive traits', () => {
      const state = createInitialGameState();
      state.stats = { dinero: 75, policia: 40, estres: 40, respeto: 60 };
      state.flags = {
        hotel_lavado: true,
        miedo_calle: true,
        bebida_legal: true,
      };
      state.turn = 12;
      state.moneyLaundered = 50000;

      const legacy = calculateLegacy(state);

      // Respect: (60 - 40) * 0.5 = 10 + 15 (miedo_calle) = 25
      expect(legacy.dRespeto).toBe(25);
      // Police: (40 - 30) * 0.45 = 4.5 -> 5
      expect(legacy.dPolicia).toBe(5);
      // Dinero: hotel_lavado (24) + bebida_legal (15) = 39
      expect(legacy.dDinero).toBe(39);
      // Stress: miedo_calle (10) = 10
      expect(legacy.dEstres).toBe(10);
      expect(legacy.yearsInPower).toBe(12);
      expect(legacy.moneyLaundered).toBe(50000);
    });

    it('creates Next Generation state with inherited modifiers and alive partners', () => {
      const state = createInitialGameState();
      state.generation = 1;
      state.partnerA.status = 'dead';
      state.partnerB.status = 'dead';
      state.stats = { dinero: 75, policia: 40, estres: 40, respeto: 60 };
      state.flags = { hotel_lavado: true };

      const nextGenState = createNextGenerationState(state);

      expect(nextGenState.generation).toBe(2);
      expect(nextGenState.partnerA.status).toBe('alive');
      expect(nextGenState.partnerB.status).toBe('alive');
      expect(nextGenState.gameOver).toBe(false);
      expect(nextGenState.turn).toBe(1);
      expect(nextGenState.flags.hotel_lavado).toBe(true);
      expect(nextGenState.stats.dinero).toBe(74); // 50 + 24
      expect(nextGenState.currentCard).toBeDefined();
    });
  });
});
