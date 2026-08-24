import { INITIAL_DECK } from '../../src/constants/deck';
import { getEligibleCards } from '../../src/store/gameEngine';
import { GameCard } from '../../src/types/game';

describe('Deck Filtering & Perspective Management', () => {
  it('contains exactly 30 cards in INITIAL_DECK', () => {
    expect(INITIAL_DECK.length).toBe(30);
  });

  it('filters cards for partnerA, excluding partnerB_only cards', () => {
    const eligiblePartnerA = getEligibleCards(INITIAL_DECK, 'partnerA', {}, []);

    // PartnerA should receive common and partnerA_only cards
    eligiblePartnerA.forEach((card) => {
      expect(card.target).not.toBe('partnerB_only');
      expect(['common', 'partnerA_only', undefined]).toContain(card.target);
    });

    const hasPartnerACards = eligiblePartnerA.some((c) => c.target === 'partnerA_only');
    expect(hasPartnerACards).toBe(true);
  });

  it('filters cards for partnerB, excluding partnerA_only cards', () => {
    const eligiblePartnerB = getEligibleCards(INITIAL_DECK, 'partnerB', {}, []);

    // PartnerB should receive common and partnerB_only cards
    eligiblePartnerB.forEach((card) => {
      expect(card.target).not.toBe('partnerA_only');
      expect(['common', 'partnerB_only', undefined]).toContain(card.target);
    });

    const hasPartnerBCards = eligiblePartnerB.some((c) => c.target === 'partnerB_only');
    expect(hasPartnerBCards).toBe(true);
  });

  it('locks conditional flag cards when flags are absent', () => {
    const eligibleWithoutFlags = getEligibleCards(INITIAL_DECK, 'partnerA', {}, []);

    const hasRusoPaz = eligibleWithoutFlags.some((c) => c.id === 'card_14_ruso_paz');
    const hasIsaTestimonio = eligibleWithoutFlags.some((c) => c.id === 'card_16_isa_testimonio');

    expect(hasRusoPaz).toBe(false);
    expect(hasIsaTestimonio).toBe(false);
  });

  it('unlocks conditional flag cards when required flags are present', () => {
    const flags = {
      guerra_ruso: true,
      vance_mad: true,
    };

    const eligibleWithFlags = getEligibleCards(INITIAL_DECK, 'partnerA', flags, []);

    const hasRusoPaz = eligibleWithFlags.some((c) => c.id === 'card_14_ruso_paz');
    const hasIsaTestimonio = eligibleWithFlags.some((c) => c.id === 'card_16_isa_testimonio');

    expect(hasRusoPaz).toBe(true);
    expect(hasIsaTestimonio).toBe(true);
  });

  it('excludes already seen card IDs when unplayed pool has >= 3 cards', () => {
    const seenIds = ['card_1_vance_cargamento', 'card_2_lexi_vip', 'card_3_ruso_yates'];
    const eligible = getEligibleCards(INITIAL_DECK, 'partnerA', {}, seenIds);

    expect(eligible.some((c) => c.id === 'card_1_vance_cargamento')).toBe(false);
    expect(eligible.some((c) => c.id === 'card_2_lexi_vip')).toBe(false);
    expect(eligible.some((c) => c.id === 'card_3_ruso_yates')).toBe(false);
  });

  it('automatically recycles seen pool when unplayed cards fall below 3', () => {
    const mockDeck: GameCard[] = [
      {
        id: 'c1',
        w: 'lexi',
        t: 'Card 1',
        l: { t: 'L', fx: {} },
        r: { t: 'R', fx: {} },
        target: 'common',
      },
      {
        id: 'c2',
        w: 'lexi',
        t: 'Card 2',
        l: { t: 'L', fx: {} },
        r: { t: 'R', fx: {} },
        target: 'common',
      },
      {
        id: 'c3',
        w: 'lexi',
        t: 'Card 3',
        l: { t: 'L', fx: {} },
        r: { t: 'R', fx: {} },
        target: 'common',
      },
    ];

    // Mark c1 and c2 as seen -> only 1 unplayed remains (< 3) -> should recycle
    const recycled = getEligibleCards(mockDeck, 'partnerA', {}, ['c1', 'c2']);
    expect(recycled.length).toBe(3);
    expect(recycled.map((c) => c.id)).toEqual(['c1', 'c2', 'c3']);
  });
});
