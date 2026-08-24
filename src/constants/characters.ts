import { CharacterDef, CharacterId, PartnerState } from '../types/game';

export const CHARACTERS: Record<CharacterId, CharacterDef> = {
  vance: {
    id: 'vance',
    name: 'Teniente Vance',
    role: 'Policía de Vice Shores',
    seed: 'vance-01',
    bg: 'street',
    n: 'Teniente Vance',
    r: 'Policía de Vice Shores',
    s: 'vance-01',
  },
  lexi: {
    id: 'lexi',
    name: 'Lexi',
    role: 'Dueña de Neon Dreams',
    seed: 'lexi-99',
    bg: 'club',
    n: 'Lexi',
    r: 'Dueña de Neon Dreams',
    s: 'lexi-99',
  },
  ruso: {
    id: 'ruso',
    name: "Yuri 'El Ruso'",
    role: 'Tráfico y Armas',
    seed: 'ruso-33',
    bg: 'ocean',
    n: "Yuri 'El Ruso'",
    r: 'Tráfico y Armas',
    s: 'ruso-33',
  },
  cody: {
    id: 'cody',
    name: 'Cody',
    role: 'Criptobro / Lavado',
    seed: 'cody-777',
    bg: 'mansion',
    n: 'Cody',
    r: 'Criptobro / Lavado',
    s: 'cody-777',
  },
  trey: {
    id: 'trey',
    name: 'Trey',
    role: 'Pandillero Zona Sur',
    seed: 'trey-22',
    bg: 'street',
    n: 'Trey',
    r: 'Pandillero Zona Sur',
    s: 'trey-22',
  },
  isa: {
    id: 'isa',
    name: 'Isabella',
    role: 'Abogada Defensora',
    seed: 'isa-55',
    bg: 'mansion',
    n: 'Isabella',
    r: 'Abogada Defensora',
    s: 'isa-55',
  },
  tommy: {
    id: 'tommy',
    name: 'Tommy',
    role: 'Mano Derecha',
    seed: 'tommy-88',
    bg: 'club',
    n: 'Tommy',
    r: 'Mano Derecha',
    s: 'tommy-88',
  },
  manny: {
    id: 'manny',
    name: 'Manny',
    role: 'Mecánico de Exóticos',
    seed: 'manny-11',
    bg: 'gas',
    n: 'Manny',
    r: 'Mecánico de Exóticos',
    s: 'manny-11',
  },
  broker: {
    id: 'broker',
    name: 'El Broker',
    role: 'Bienes Raíces',
    seed: 'broker-44',
    bg: 'mansion',
    n: 'El Broker',
    r: 'Bienes Raíces',
    s: 'broker-44',
  },
  camila: {
    id: 'camila',
    name: 'Camila',
    role: 'Tu Socia y Pareja',
    seed: 'camila-66',
    bg: 'mansion',
    n: 'Camila',
    r: 'Tu Socia y Pareja',
    s: 'camila-66',
  },
};

export const INITIAL_PARTNER_A: PartnerState = {
  id: 'partnerA',
  name: 'Nico',
  role: 'El Estratega',
  seed: 'partnerA-nico',
  status: 'alive',
};

export const INITIAL_PARTNER_B: PartnerState = {
  id: 'partnerB',
  name: 'Camila',
  role: 'La Ejecutora',
  seed: 'partnerB-camila',
  status: 'alive',
};

export const INITIAL_PARTNERS = {
  partnerA: INITIAL_PARTNER_A,
  partnerB: INITIAL_PARTNER_B,
};

export const getCharacter = (id: CharacterId): CharacterDef => {
  return CHARACTERS[id] || CHARACTERS.camila;
};
