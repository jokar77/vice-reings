export type StatKey = 'dinero' | 'policia' | 'estres' | 'respeto';

export interface EmpireStats {
  dinero: number;
  policia: number;
  estres: number;
  respeto: number;
}

export interface StatModifiers {
  dinero?: number;
  policia?: number;
  estres?: number;
  respeto?: number;
  set?: string[];
  legado?: string[];
}

export interface CardChoice {
  t: string; // Choice label text
  fx: StatModifiers;
}

export type CharacterId =
  | 'vance'
  | 'lexi'
  | 'ruso'
  | 'cody'
  | 'trey'
  | 'isa'
  | 'tommy'
  | 'manny'
  | 'broker'
  | 'camila';

export type BackgroundType = 'street' | 'club' | 'ocean' | 'gas' | 'mansion';

export interface CharacterDef {
  id: CharacterId;
  name: string;
  role: string;
  seed: string;
  bg: BackgroundType;
  // Aliases for legacy compatibility
  n?: string;
  r?: string;
  s?: string;
}

export type CardTarget = 'common' | 'partnerA_only' | 'partnerB_only';

export interface GameCard {
  id: string;
  w: CharacterId;
  t: string; // Dialogue / narrative text
  l: CardChoice; // Left choice
  r: CardChoice; // Right choice
  if?: string; // Flag requirement
  target?: CardTarget; // Perspective target
  switchPartner?: boolean; // Organic story hand-off trigger
  isTransitionCard?: boolean; // True if generated during survival transition
}

export type PartnerId = 'partnerA' | 'partnerB';
export type PartnerStatus = 'alive' | 'dead' | 'jailed';

export interface PartnerState {
  id: PartnerId;
  name: string;
  role: string;
  seed: string;
  status: PartnerStatus;
  deathCause?: string;
}

export interface HistoryEntry {
  id: string;
  cardId: string;
  character: CharacterId;
  characterName: string;
  text: string;
  choiceText: string;
  direction: 'left' | 'right';
  partnerId: PartnerId;
  partnerName: string;
  statDeltas: StatModifiers;
  timestamp: number;
}

export interface EndingCause {
  id: string; // 'dinero_0' | 'dinero_100' | 'policia_0' | 'policia_100' | 'estres_0' | 'estres_100' | 'respeto_0' | 'respeto_100'
  title: string;
  description: string;
  stat: StatKey;
  extreme: 'low' | 'high';
}

export interface LegacyReport {
  dDinero: number;
  dPolicia: number;
  dEstres: number;
  dRespeto: number;
  rows: [string, number][];
  generation: number;
  yearsInPower: number;
  moneyLaundered: number;
  causeOfDeath?: string;
}

export interface GameState {
  partnerA: PartnerState;
  partnerB: PartnerState;
  activePartner: PartnerId;
  stats: EmpireStats;
  flags: Record<string, boolean>;
  generation: number;
  turn: number;
  moneyLaundered: number;
  history: HistoryEntry[];
  currentCard: GameCard | null;
  seenCardIds: string[];
  gameOver: boolean;
  activeEnding: EndingCause | null;
  legacyReport: LegacyReport | null;
  isEmpireHubOpen: boolean;
}

export interface GameStoreState extends GameState {
  initGame: () => void;
  makeChoice: (direction: 'left' | 'right') => void;
  switchPartnerManually: () => void;
  openEmpireHub: () => void;
  closeEmpireHub: () => void;
  startNewGeneration: () => void;
  resetGame: () => void;
}
