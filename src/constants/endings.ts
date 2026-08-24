import { EndingCause, StatKey } from '../types/game';

export const ENDINGS: Record<string, EndingCause> = {
  dinero_0: {
    id: 'dinero_0',
    title: 'Bancarrota',
    description: 'Las deudas se cobran solas. Los acreedores tomaron el imperio y tu libertad.',
    stat: 'dinero',
    extreme: 'low',
  },
  dinero_100: {
    id: 'dinero_100',
    title: 'El FIB',
    description: 'Demasiado evidente. Montañas de efectivo sin justificar atrajeron al FIB.',
    stat: 'dinero',
    extreme: 'high',
  },
  policia_0: {
    id: 'policia_0',
    title: 'Olvidado',
    description: 'Caíste en la irrelevancia. Nadie te busca, nadie te teme, tu imperio se disolvió.',
    stat: 'policia',
    extreme: 'low',
  },
  policia_100: {
    id: 'policia_100',
    title: 'Busted',
    description: 'Sentencia de Vida. Las fuerzas especiales asaltaron tu cuartel general.',
    stat: 'policia',
    extreme: 'high',
  },
  estres_0: {
    id: 'estres_0',
    title: 'Descuido',
    description: 'Te relajaste demasiado. Mientras dormías en la gloria, te eliminaron sin resistencia.',
    stat: 'estres',
    extreme: 'low',
  },
  estres_100: {
    id: 'estres_100',
    title: 'Wasted',
    description: 'Paranoia absoluta. El colapso mental y las traiciones te consumieron por completo.',
    stat: 'estres',
    extreme: 'high',
  },
  respeto_0: {
    id: 'respeto_0',
    title: 'Solo',
    description: 'Nadie te cubre la espalda. Tus propios soldados te dejaron a merced de la calle.',
    stat: 'respeto',
    extreme: 'low',
  },
  respeto_100: {
    id: 'respeto_100',
    title: 'Corona',
    description: 'El más grande cae más fuerte. Tu ambición desenfrenada desató una guerra total contra ti.',
    stat: 'respeto',
    extreme: 'high',
  },
};

export const getEnding = (stat: StatKey, extreme: 'low' | 'high'): EndingCause => {
  const endingId = `${stat}_${extreme === 'low' ? '0' : '100'}`;
  return ENDINGS[endingId] || ENDINGS.estres_100;
};
