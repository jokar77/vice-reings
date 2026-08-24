import { StatKey } from '../types/game';

export const COLORS = {
  ink: '#0A0A1A',
  petrol: '#1F0D3D',
  petrol2: '#341259',
  petrol3: '#4A1673',
  paper: '#E0F7FA',
  dim: '#9955FF',
  aqua: '#00F0FF',
  amber: '#FEE715',
  blood: '#FF0055',
  moss: '#00FF88',
  line: 'rgba(0, 240, 255, 0.15)',
  darkOverlay: 'rgba(10, 10, 26, 0.85)',
  cardBg: '#150A2A',
  gold: '#FFD700',
  textMuted: '#8E8E93',
  textLight: '#FFFFFF',
};

export const LOW_DANGER_THRESHOLD = 14;
export const HIGH_DANGER_THRESHOLD = 86;

export interface StatConfig {
  key: StatKey;
  name: string;
  color: string;
  initialValue: number;
  svgPath: string;
  svgStroke?: boolean;
}

export const GAME_STATS: StatConfig[] = [
  {
    key: 'dinero',
    name: 'Dinero',
    color: COLORS.amber,
    initialValue: 50,
    svgPath: 'M8 1v14M4.5 4.5h5a2.5 2.5 0 010 5h-3a2.5 2.5 0 000 5h5',
    svgStroke: true,
  },
  {
    key: 'policia',
    name: 'Búsqueda',
    color: COLORS.aqua,
    initialValue: 30,
    svgPath: 'M8 1l6 2.5v5C14 12 11 14.6 8 15.5 5 14.6 2 12 2 8.5v-5z',
    svgStroke: false,
  },
  {
    key: 'estres',
    name: 'Estrés',
    color: COLORS.blood,
    initialValue: 35,
    svgPath: 'M9 1L2.5 9.4h4L6 15l7.2-8.8h-4.4z',
    svgStroke: false,
  },
  {
    key: 'respeto',
    name: 'Reputación',
    color: COLORS.moss,
    initialValue: 40,
    svgPath: 'M8 1.2l2 4.6 5 .5-3.8 3.3 1.2 4.9L8 11.8 3.6 14.5l1.2-4.9L1 6.3l5-.5z',
    svgStroke: false,
  },
];

export const BACKGROUND_COLORS = {
  street: '#0F0926',
  club: '#22083A',
  ocean: '#07182E',
  gas: '#1A0B10',
  mansion: '#180B28',
};
