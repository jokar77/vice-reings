import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGameStore } from '../../src/store/gameStore';
import {
  createInitialGameState,
  getEligibleCards,
  INITIAL_STATS,
} from '../../src/store/gameEngine';
import { INITIAL_DECK } from '../../src/constants/deck';
import { GameCard } from '../../src/types/game';

describe('Tier 4: Real-World Multi-Generation Empire Gameplay Simulations', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useGameStore.setState(createInitialGameState());
  });

  // =========================================================================
  // Scenario 1: The Cartel Smuggler Arc
  // =========================================================================
  it('Scenario 1: The Cartel Smuggler Arc (Full Dual Demise & Succession Run)', async () => {
    const store = useGameStore.getState();
    expect(store.generation).toBe(1);
    expect(store.activePartner).toBe('partnerA');
    expect(store.stats).toEqual(INITIAL_STATS);

    // Turn 1-3: Nico runs the smuggling operations
    const cargoCard = INITIAL_DECK.find((c) => c.id === 'card_1_vance_cargamento')!;
    useGameStore.setState({ currentCard: cargoCard });
    useGameStore.getState().makeChoice('left'); // Pays bribe: dinero -20, policia -15, estres -5

    const submarineCard = INITIAL_DECK.find((c) => c.id === 'card_24_ruso_submarino')!;
    useGameStore.setState({ currentCard: submarineCard });
    useGameStore.getState().makeChoice('left'); // Smuggle: dinero +35, policia +20, estres +15, respeto +10

    // Nico suffers a massive panic attack & stress overload
    const stressBombCard: GameCard = {
      id: 'stress_overload',
      w: 'ruso',
      t: 'El Ruso emboscó el cargamento. Todo arde en llamas.',
      l: { t: 'Intentar salvar todo', fx: { estres: 90 } },
      r: { t: 'Huir', fx: { estres: 90 } },
    };
    useGameStore.setState({ currentCard: stressBombCard });
    useGameStore.getState().makeChoice('left'); // estres hits 100 -> Wasted

    // Verify Survival Demise Transition: Partner A dead, Partner B active
    const survivalState = useGameStore.getState();
    expect(survivalState.partnerA.status).toBe('dead');
    expect(survivalState.partnerA.deathCause).toBe('Wasted');
    expect(survivalState.partnerB.status).toBe('alive');
    expect(survivalState.activePartner).toBe('partnerB');
    expect(survivalState.gameOver).toBe(false);
    expect(survivalState.currentCard?.isTransitionCard).toBe(true);

    // Camila chooses on the transition card: "Vengar su nombre"
    useGameStore.getState().makeChoice('right');
    expect(useGameStore.getState().activePartner).toBe('partnerB');

    // Camila runs the cartel solo for 15 turns
    for (let turn = 0; turn < 14; turn++) {
      const regularCard: GameCard = {
        id: `cartel_trade_${turn}`,
        w: 'lexi',
        t: `Operaciones de contrabando año ${turn + 1}`,
        l: { t: 'Vender', fx: { dinero: 2 } },
        r: { t: 'Guardar', fx: { dinero: 2 } },
      };
      useGameStore.setState({
        currentCard: regularCard,
        stats: { dinero: 50, policia: 30, estres: 35, respeto: 40 },
      });
      useGameStore.getState().makeChoice(turn % 2 === 0 ? 'left' : 'right');
      expect(useGameStore.getState().activePartner).toBe('partnerB');
      expect(useGameStore.getState().partnerA.status).toBe('dead');
    }

    // Camila finally gets raided by the FIB (policia reaches 100)
    const finalRaidCard: GameCard = {
      id: 'fib_raid_final',
      w: 'vance',
      t: 'El FIB y SWAT irrumpen en el ático de Vice Shores.',
      l: { t: 'Resistir', fx: { policia: 100 } },
      r: { t: 'Entregarse', fx: { policia: 100 } },
    };
    useGameStore.setState({ currentCard: finalRaidCard });
    useGameStore.getState().makeChoice('left');

    // Strict Game Over validation
    const endState = useGameStore.getState();
    expect(endState.gameOver).toBe(true);
    expect(endState.partnerB.status).toBe('jailed');
    expect(endState.activeEnding?.id).toBe('policia_100');
    expect(endState.legacyReport).not.toBeNull();
    expect(endState.legacyReport?.generation).toBe(1);

    // Succession into Generation 2
    useGameStore.getState().startNewGeneration();
    const gen2State = useGameStore.getState();
    expect(gen2State.generation).toBe(2);
    expect(gen2State.turn).toBe(1);
    expect(gen2State.partnerA.status).toBe('alive');
    expect(gen2State.partnerB.status).toBe('alive');
    expect(gen2State.gameOver).toBe(false);
  });

  // =========================================================================
  // Scenario 2: The Heatwave Raid Arc
  // =========================================================================
  it('Scenario 2: The Heatwave Raid Arc (Flag Unlocks & Narrative Branching)', () => {
    // Step 1: Partner A refuses Vance's bribe, triggering 'vance_mad' flag
    const vanceCard = INITIAL_DECK.find((c) => c.id === 'card_1_vance_cargamento')!;
    useGameStore.setState({ currentCard: vanceCard, activePartner: 'partnerA' });
    useGameStore.getState().makeChoice('right'); // Que se lo queden: sets ['vance_mad']

    expect(useGameStore.getState().flags.vance_mad).toBe(true);

    // Step 2: Because vance_mad is active, Isabella's testimony card is now eligible
    const eligibleWithVanceMad = getEligibleCards(
      INITIAL_DECK,
      'partnerA',
      useGameStore.getState().flags,
      []
    );
    const isaTestimonyCard = eligibleWithVanceMad.find((c) => c.id === 'card_16_isa_testimonio');
    expect(isaTestimonyCard).toBeDefined();

    // Step 3: Play Isabella's testimony card and pay off the judge
    useGameStore.setState({ currentCard: isaTestimonyCard });
    useGameStore.getState().makeChoice('left'); // Paga el juez: dinero -30, policia -30, estres -10

    // Step 4: DEA raid triggers, requiring destruction of evidence
    const deaCard = INITIAL_DECK.find((c) => c.id === 'card_17_tommy_dea')!;
    useGameStore.setState({ currentCard: deaCard });
    useGameStore.getState().makeChoice('left'); // Quema todo: dinero -30, policia -20, estres 15

    const state = useGameStore.getState();
    expect(state.flags.vance_mad).toBe(true);
    expect(state.history.length).toBe(3);
    expect(state.turn).toBe(4);
  });

  // =========================================================================
  // Scenario 3: The Street War & Succession Arc
  // =========================================================================
  it('Scenario 3: The Street War & Succession Arc (Turf Battles, Miedo Calle & Corona Ending)', () => {
    // Step 1: Partner A arms Trey against Los Vagos
    const treyCard = INITIAL_DECK.find((c) => c.id === 'card_5_trey_vagos')!;
    useGameStore.setState({ currentCard: treyCard, activePartner: 'partnerA' });
    useGameStore.getState().makeChoice('left'); // Dales las armas: respeto +15, policia +20

    // Step 2: Partner A executes the snitch, unlocking legacy trait 'miedo_calle'
    const snitchCard = INITIAL_DECK.find((c) => c.id === 'card_28_tommy_soplon')!;
    useGameStore.setState({ currentCard: snitchCard });
    useGameStore.getState().makeChoice('left'); // Acaba con él: sets ['miedo_calle'], respeto +20

    expect(useGameStore.getState().flags.miedo_calle).toBe(true);

    // Step 3: Partner A falls in the turf war
    const fatalWarCard: GameCard = {
      id: 'street_war_fatal',
      w: 'trey',
      t: 'Emboscada en Little Haiti. Nico queda atrapado.',
      l: { t: 'Luchar hasta el fin', fx: { estres: 95 } },
      r: { t: 'Rendirse', fx: { estres: 95 } },
    };
    useGameStore.setState({ currentCard: fatalWarCard });
    useGameStore.getState().makeChoice('left');

    expect(useGameStore.getState().partnerA.status).toBe('dead');
    expect(useGameStore.getState().activePartner).toBe('partnerB');

    // Step 4: Partner B takes over and maxes out street reputation (respeto reaches 100 -> Corona)
    const respectOverloadCard: GameCard = {
      id: 'respect_corona_card',
      w: 'lexi',
      t: 'Toda la ciudad aclama a Camila como la Reina Indiscutida de Vice Shores.',
      l: { t: 'Aceptar la Corona', fx: { respeto: 80 } },
      r: { t: 'Gobernar con puño de hierro', fx: { respeto: 80 } },
    };
    useGameStore.setState({ currentCard: respectOverloadCard });
    useGameStore.getState().makeChoice('left');

    const crownEndState = useGameStore.getState();
    expect(crownEndState.gameOver).toBe(true);
    expect(crownEndState.activeEnding?.id).toBe('respeto_100');
    expect(crownEndState.legacyReport?.rows.some(([k]) => k.includes('Miedo instaurado'))).toBe(true);

    // Step 5: Succession into Gen 2 retains 'miedo_calle' and respect bonuses
    useGameStore.getState().startNewGeneration();
    const gen2 = useGameStore.getState();
    expect(gen2.generation).toBe(2);
    expect(gen2.flags.miedo_calle).toBe(true);
    expect(gen2.stats.respeto).toBeGreaterThanOrEqual(55);
  });

  // =========================================================================
  // Scenario 4: The Launderer Monopoly Arc
  // =========================================================================
  it('Scenario 4: The Launderer Monopoly Arc (Hotel Lavado, Bebida Legal & Million Dollar Wash)', () => {
    // Step 1: Switch to Camila and purchase the boutique hotel
    useGameStore.setState({ activePartner: 'partnerB' });
    const hotelCard = INITIAL_DECK.find((c) => c.id === 'card_9_broker_hotel')!;
    useGameStore.setState({ currentCard: hotelCard });
    useGameStore.getState().makeChoice('left'); // Cierra el trato: legado ['hotel_lavado']

    expect(useGameStore.getState().flags.hotel_lavado).toBe(true);

    // Step 2: Lexi launches Neon Dreams Energy drink
    const energyCard = INITIAL_DECK.find((c) => c.id === 'card_21_lexi_bebida')!;
    useGameStore.setState({ currentCard: energyCard });
    useGameStore.getState().makeChoice('left'); // Financia: legado ['bebida_legal']

    expect(useGameStore.getState().flags.bebida_legal).toBe(true);

    // Step 3: Run 35 consecutive profitable turns under the 15,000x hotel multiplier
    for (let i = 0; i < 35; i++) {
      const moneyGainCard: GameCard = {
        id: `money_cycle_${i}`,
        w: 'cody',
        t: `Crypto distribution phase ${i}`,
        l: { t: 'Launder', fx: { dinero: 5 } },
        r: { t: 'Hold', fx: { dinero: 5 } },
      };
      // Keep other stats stable
      useGameStore.setState({
        currentCard: moneyGainCard,
        stats: { dinero: 50, policia: 30, estres: 35, respeto: 40 },
      });
      useGameStore.getState().makeChoice('left');
    }

    const state = useGameStore.getState();
    expect(state.moneyLaundered).toBeGreaterThan(1000000);
    expect(state.flags.hotel_lavado).toBe(true);
    expect(state.flags.bebida_legal).toBe(true);
    expect(state.turn).toBe(38);
  });

  // =========================================================================
  // Scenario 5: The Fall & Redemption Arc
  // =========================================================================
  it('Scenario 5: The Fall & Redemption Arc (Bankruptcy, Debt Legacy & Generation Recovery)', () => {
    // Gen 1 goes bankrupt immediately
    const bankruptcyCard: GameCard = {
      id: 'bankruptcy_doom',
      w: 'cody',
      t: 'Todas las cuentas han sido congeladas.',
      l: { t: 'Colapso', fx: { dinero: -100 } },
      r: { t: 'Colapso', fx: { dinero: -100 } },
    };

    // Both partners fall to bankruptcy
    useGameStore.setState({ currentCard: bankruptcyCard, activePartner: 'partnerA' });
    useGameStore.getState().makeChoice('left');

    // Partner B takes over
    expect(useGameStore.getState().partnerA.status).toBe('dead');
    useGameStore.setState({ currentCard: bankruptcyCard });
    useGameStore.getState().makeChoice('left');

    // Game Over on Gen 1
    expect(useGameStore.getState().gameOver).toBe(true);
    expect(useGameStore.getState().activeEnding?.id).toBe('dinero_0');

    // Start Generation 2 with Cartel Debt Penalty (-13 Dinero -> Starts at 37)
    useGameStore.getState().startNewGeneration();
    const gen2 = useGameStore.getState();
    expect(gen2.generation).toBe(2);
    expect(gen2.stats.dinero).toBe(37); // 50 - 13 = 37

    // Gen 2 recovers through Cody's Crypto Rug-Pull
    const rugPullCard = INITIAL_DECK.find((c) => c.id === 'card_4_cody_token')!;
    useGameStore.setState({ currentCard: rugPullCard });
    useGameStore.getState().makeChoice('left'); // Vende todo: dinero +35

    expect(useGameStore.getState().stats.dinero).toBe(72); // 37 + 35 = 72

    // Complete 10 successful turns in Gen 2
    for (let i = 0; i < 10; i++) {
      const card = INITIAL_DECK[i % INITIAL_DECK.length];
      useGameStore.setState({
        currentCard: card,
        stats: { dinero: 60, policia: 30, estres: 35, respeto: 40 },
      });
      useGameStore.getState().makeChoice('right');
    }

    const gen2Final = useGameStore.getState();
    expect(gen2Final.turn).toBe(12);
    expect(gen2Final.gameOver).toBe(false);
    expect(gen2Final.stats.dinero).toBeGreaterThan(30);
  });
});
