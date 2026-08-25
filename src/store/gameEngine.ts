import {
  EmpireStats,
  EndingCause,
  GameCard,
  GameState,
  LegacyReport,
  PartnerId,
  PartnerState,
  StatKey,
  StatModifiers,
} from '../types/game';
import { getEnding } from '../constants/endings';
import { INITIAL_PARTNER_A, INITIAL_PARTNER_B } from '../constants/characters';
import { INITIAL_DECK } from '../constants/deck';
import { createMulberry32, hashSeed } from '../utils/prng';

export const INITIAL_STATS: EmpireStats = {
  dinero: 50,
  policia: 50,
  estres: 50,
  respeto: 50,
};

/**
 * Strict clamp helper keeping any stat in [0, 100].
 */
export const clampStat = (val: number): number => {
  return Math.max(0, Math.min(100, Math.round(val)));
};

/**
 * Apply choice stat deltas to the current stats with strict 0..100 clamping.
 */
export const applyChoiceDeltas = (
  stats: EmpireStats,
  fx: StatModifiers
): EmpireStats => {
  return {
    dinero: clampStat(stats.dinero + (fx.dinero ?? 0)),
    policia: clampStat(stats.policia + (fx.policia ?? 0)),
    estres: clampStat(stats.estres + (fx.estres ?? 0)),
    respeto: clampStat(stats.respeto + (fx.respeto ?? 0)),
  };
};

/**
 * Check if any stat reached an extreme boundary (<= 0 or >= 100).
 * Returns the first matching fatal trigger or null if all stats are safe.
 */
export const checkStatFatalities = (
  stats: EmpireStats
): { stat: StatKey; extreme: 'low' | 'high'; endingId: string } | null => {
  if (stats.policia >= 100) return { stat: 'policia', extreme: 'high', endingId: 'policia_100' };
  if (stats.dinero <= 0) return { stat: 'dinero', extreme: 'low', endingId: 'dinero_0' };
  if (stats.estres >= 100) return { stat: 'estres', extreme: 'high', endingId: 'estres_100' };
  if (stats.respeto <= 0) return { stat: 'respeto', extreme: 'low', endingId: 'respeto_0' };
  if (stats.policia <= 0) return { stat: 'policia', extreme: 'low', endingId: 'policia_0' };
  if (stats.dinero >= 100) return { stat: 'dinero', extreme: 'high', endingId: 'dinero_100' };
  if (stats.estres <= 0) return { stat: 'estres', extreme: 'low', endingId: 'estres_0' };
  if (stats.respeto >= 100) return { stat: 'respeto', extreme: 'high', endingId: 'respeto_100' };

  return null;
};

/**
 * Filter deck cards based on active partner perspective and unlocked condition flags.
 * If the unplayed card pool falls below 3, automatically recycles the pool.
 */
export const getEligibleCards = (
  deck: GameCard[],
  activePartner: PartnerId,
  flags: Record<string, boolean>,
  seenCardIds: string[]
): GameCard[] => {
  const allowedTarget = `${activePartner}_only`;
  const basePool = deck.filter((card) => {
    // 1. Target check: card must be common, match active partner, or have no target defined
    const matchesTarget =
      !card.target || card.target === 'common' || card.target === allowedTarget;
    if (!matchesTarget) return false;

    // 2. Condition flag check: if card requires a flag, it must be active
    if (card.if && !flags[card.if]) return false;

    return true;
  });

  // Filter out cards that have already been played this cycle
  const unplayedPool = basePool.filter((c) => !seenCardIds.includes(c.id));

  // If unplayed cards are fewer than 3, recycle by returning the full base pool
  if (unplayedPool.length < 3) {
    return basePool.length > 0 ? basePool : deck;
  }

  return unplayedPool;
};

/**
 * Handle demise of the active partner when a stat reaches 0 or 100.
 * If the companion is still alive: auto-switches active control to the survivor and creates a transition card.
 * If both partners are now dead or jailed: marks Game Over and produces the ending cause.
 */
export const handlePartnerDemise = (
  state: GameState,
  fatalStat: StatKey,
  extreme: 'low' | 'high'
): {
  updatedPartnerA: PartnerState;
  updatedPartnerB: PartnerState;
  newActivePartner: PartnerId;
  isGameOver: boolean;
  transitionCard?: GameCard;
  ending?: EndingCause;
  bufferedStats?: EmpireStats;
} => {
  const activeKey = state.activePartner;
  const isJailed = fatalStat === 'policia' && extreme === 'high';
  const fate = isJailed ? 'jailed' : 'dead';
  const ending = getEnding(fatalStat, extreme);

  const updatedPartnerA: PartnerState = {
    ...state.partnerA,
    ...(activeKey === 'partnerA'
      ? { status: fate, deathCause: ending.title }
      : {}),
  };

  const updatedPartnerB: PartnerState = {
    ...state.partnerB,
    ...(activeKey === 'partnerB'
      ? { status: fate, deathCause: ending.title }
      : {}),
  };

  const survivorKey: PartnerId = activeKey === 'partnerA' ? 'partnerB' : 'partnerA';
  const survivorPartner = survivorKey === 'partnerA' ? updatedPartnerA : updatedPartnerB;
  const fallenPartner = activeKey === 'partnerA' ? updatedPartnerA : updatedPartnerB;

  if (survivorPartner.status === 'alive') {
    // Companion is alive -> Auto-switch to survivor and buffer fatal stat
    const bufferedStats: EmpireStats = {
      ...state.stats,
      [fatalStat]: extreme === 'low' ? 25 : 75,
    };

    const transitionCard: GameCard = {
      id: `transition_demise_${state.turn}_${Date.now()}`,
      w: 'camila',
      t: `«${fallenPartner.name} ha ${fate === 'jailed' ? 'sido arrestado/a' : 'caído'} (${ending.title}). Ahora el imperio de Vice Shores depende enteramente de ti.»`,
      l: {
        t: 'Continuar la lucha',
        fx: { estres: 10, respeto: 10 },
      },
      r: {
        t: 'Vengar su nombre',
        fx: { dinero: -10, policia: 15, respeto: 15 },
      },
      target: 'common',
      isTransitionCard: true,
    };

    return {
      updatedPartnerA,
      updatedPartnerB,
      newActivePartner: survivorKey,
      isGameOver: false,
      transitionCard,
      bufferedStats,
    };
  }

  // Both partners are dead/jailed -> Full generation Game Over
  return {
    updatedPartnerA,
    updatedPartnerB,
    newActivePartner: activeKey,
    isGameOver: true,
    ending,
  };
};

/**
 * Compute the succession legacy bonuses and penalty modifiers for Generation N+1.
 */
export const calculateLegacy = (state: GameState): LegacyReport => {
  const rows: [string, number][] = [];

  // Respect legacy
  let dRespeto = Math.round((state.stats.respeto - 40) * 0.5);
  if (dRespeto !== 0) {
    rows.push([dRespeto > 0 ? 'Reputación consolidada' : 'Pérdida de respeto', dRespeto]);
  }

  // Police heat legacy
  let dPolicia = state.stats.policia > 30 ? Math.round((state.stats.policia - 30) * 0.45) : 0;
  if (dPolicia > 0) {
    rows.push(['Búsqueda policial heredada', dPolicia]);
  }

  // Money / Asset legacy
  let dDinero = 0;
  if (state.flags.hotel_lavado) {
    dDinero = 24;
    rows.push(['Hotel Boutique (Lavado Activo)', 24]);
  } else if (state.stats.dinero > 68) {
    dDinero = 9;
    rows.push(['Criptomonedas ocultas', 9]);
  } else {
    dDinero = -13;
    rows.push(['Deudas del cártel del Ruso', -13]);
  }

  // Stress legacy base
  let dEstres = 0;

  // Trait flags
  if (state.flags.miedo_calle) {
    dRespeto += 15;
    dEstres += 10;
    rows.push(['Miedo instaurado en las calles', 15]);
    rows.push(['Tensión en los barrios', 10]);
  }

  if (state.flags.bebida_legal) {
    dDinero += 15;
    rows.push(['Regalías de Neon Dreams Energy', 15]);
  }

  // Fatality specific penalties
  if (state.activeEnding?.id === 'policia_100') {
    dPolicia += 15;
    rows.push(['Redadas constantes del FIB', 15]);
  }

  if (state.activeEnding?.id === 'estres_100') {
    dEstres += 10;
    rows.push(['Paranoia organizacional', 10]);
  }

  return {
    dDinero,
    dPolicia,
    dEstres,
    dRespeto,
    rows,
    generation: state.generation,
    yearsInPower: state.turn,
    moneyLaundered: state.moneyLaundered,
    causeOfDeath: state.activeEnding?.title,
  };
};

export const INTRO_CARD: GameCard = {
  id: 'intro_fianza',
  w: 'camila',
  t: 'He pagado tu fianza, Nico. Más vale que no vuelvas a cagarla o los del cártel nos cortarán el cuello a los dos.',
  l: {
    t: 'Gracias, salgamos de aquí',
    fx: { estres: -5, respeto: 5 },
  },
  r: {
    t: 'Yo tenía todo controlado',
    fx: { estres: 5, respeto: -5 },
  },
  target: 'partnerA_only',
};

/**
 * Creates the initial state for Generation N+1 applying legacy modifiers.
 */
export const createNextGenerationState = (previousState: GameState): GameState => {
  const legacy = calculateLegacy(previousState);
  const nextGen = previousState.generation + 1;

  const nextStats: EmpireStats = {
    dinero: clampStat(50 + legacy.dDinero),
    policia: clampStat(30 + legacy.dPolicia),
    estres: clampStat(35 + legacy.dEstres),
    respeto: clampStat(40 + legacy.dRespeto),
  };

  const partnerA: PartnerState = {
    id: 'partnerA',
    name: nextGen > 2 ? `Nico Gen ${nextGen}` : 'Nico',
    role: 'El Estratega',
    seed: `partnerA-gen${nextGen}`,
    status: 'alive',
  };

  const partnerB: PartnerState = {
    id: 'partnerB',
    name: nextGen > 2 ? `Camila Gen ${nextGen}` : 'Camila',
    role: 'La Ejecutora',
    seed: `partnerB-gen${nextGen}`,
    status: 'alive',
  };

  // Retain unlocked legacy infrastructure flags
  const inheritedFlags: Record<string, boolean> = {};
  if (previousState.flags.hotel_lavado) inheritedFlags.hotel_lavado = true;
  if (previousState.flags.bebida_legal) inheritedFlags.bebida_legal = true;
  if (previousState.flags.miedo_calle) inheritedFlags.miedo_calle = true;

  return {
    partnerA,
    partnerB,
    activePartner: 'partnerA',
    stats: nextStats,
    flags: inheritedFlags,
    generation: nextGen,
    turn: 1,
    moneyLaundered: previousState.moneyLaundered,
    runHistory: previousState.runHistory || [],
    currentCard: INTRO_CARD,
    seenCardIds: [INTRO_CARD.id],
    gameOver: false,
    activeEnding: null,
    legacyReport: legacy,
    isEmpireHubOpen: false,
  };
};

/**
 * Creates a brand new Generation 1 Game State.
 */
export const createInitialGameState = (): GameState => {
  return {
    partnerA: { ...INITIAL_PARTNER_A },
    partnerB: { ...INITIAL_PARTNER_B },
    activePartner: 'partnerA',
    stats: { ...INITIAL_STATS },
    flags: {},
    generation: 1,
    turn: 1,
    moneyLaundered: 0,
    runHistory: [],
    currentCard: INTRO_CARD,
    seenCardIds: [INTRO_CARD.id],
    gameOver: false,
    activeEnding: null,
    legacyReport: null,
    isEmpireHubOpen: false,
  };
};
