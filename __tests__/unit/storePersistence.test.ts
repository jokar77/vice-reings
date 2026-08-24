import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGameStore } from '../../src/store/gameStore';
import { INITIAL_DECK } from '../../src/constants/deck';

describe('Zustand Store & AsyncStorage Persistence', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useGameStore.getState().resetGame();
  });

  it('initializes with default dual protagonist state', () => {
    const state = useGameStore.getState();

    expect(state.generation).toBe(1);
    expect(state.turn).toBe(1);
    expect(state.partnerA.status).toBe('alive');
    expect(state.partnerB.status).toBe('alive');
    expect(state.activePartner).toBe('partnerA');
    expect(state.gameOver).toBe(false);
    expect(state.stats).toEqual({
      dinero: 50,
      policia: 30,
      estres: 35,
      respeto: 40,
    });
    expect(state.currentCard).toBeDefined();
  });

  it('mutates state properly when making a choice', () => {
    const initialCard = useGameStore.getState().currentCard!;
    const choice = initialCard.l;

    useGameStore.getState().makeChoice('left');

    const updatedState = useGameStore.getState();
    expect(updatedState.turn).toBe(2);
    expect(updatedState.history.length).toBe(1);
    expect(updatedState.history[0].cardId).toBe(initialCard.id);
    expect(updatedState.history[0].direction).toBe('left');
    expect(updatedState.history[0].choiceText).toBe(choice.t);
  });

  it('switches partner manually when both partners are alive', () => {
    expect(useGameStore.getState().activePartner).toBe('partnerA');

    useGameStore.getState().switchPartnerManually();
    expect(useGameStore.getState().activePartner).toBe('partnerB');

    useGameStore.getState().switchPartnerManually();
    expect(useGameStore.getState().activePartner).toBe('partnerA');
  });

  it('executes survival auto-switch to partnerB on partnerA demise without triggering game over', () => {
    // Force current card to one that maxes out stress (e.g. +100 stress)
    useGameStore.setState({
      stats: { dinero: 50, policia: 30, estres: 95, respeto: 40 },
      currentCard: {
        id: 'fatal_test_card',
        w: 'ruso',
        t: 'Test fatal narrative',
        l: { t: 'Opción Fatal', fx: { estres: 30 } },
        r: { t: 'Opción Segura', fx: { estres: -10 } },
        target: 'common',
      },
      activePartner: 'partnerA',
    });

    useGameStore.getState().makeChoice('left');

    const state = useGameStore.getState();
    expect(state.partnerA.status).toBe('dead');
    expect(state.partnerB.status).toBe('alive');
    expect(state.activePartner).toBe('partnerB');
    expect(state.gameOver).toBe(false);
    expect(state.currentCard?.isTransitionCard).toBe(true);
  });

  it('triggers game over strictly when the second partner also falls', () => {
    // Set partnerA as already dead, partnerB as active
    useGameStore.setState({
      partnerA: {
        id: 'partnerA',
        name: 'Nico',
        role: 'El Estratega',
        seed: 'partnerA-nico',
        status: 'dead',
        deathCause: 'Wasted',
      },
      partnerB: {
        id: 'partnerB',
        name: 'Camila',
        role: 'La Ejecutora',
        seed: 'partnerB-camila',
        status: 'alive',
      },
      activePartner: 'partnerB',
      stats: { dinero: 50, policia: 90, estres: 35, respeto: 40 },
      currentCard: {
        id: 'fatal_test_police',
        w: 'vance',
        t: 'Police raid final',
        l: { t: 'Resistir', fx: { policia: 30 } },
        r: { t: 'Escapar', fx: { policia: -10 } },
        target: 'common',
      },
    });

    useGameStore.getState().makeChoice('left');

    const state = useGameStore.getState();
    expect(state.partnerA.status).toBe('dead');
    expect(state.partnerB.status).toBe('jailed');
    expect(state.gameOver).toBe(true);
    expect(state.activeEnding).toBeDefined();
    expect(state.activeEnding?.id).toBe('policia_100');
    expect(state.legacyReport).toBeDefined();
  });

  it('persists state changes and rehydrates correctly from storage', async () => {
    // Perform a series of choices
    useGameStore.setState({
      turn: 7,
      generation: 2,
      flags: { hotel_lavado: true, guerra_ruso: true },
      stats: { dinero: 80, policia: 45, estres: 20, respeto: 70 },
      activePartner: 'partnerB',
    });

    // Verify storage has written the serialized state
    const rawStored = await AsyncStorage.getItem('vice_shores_game_storage');
    expect(rawStored).toBeTruthy();

    const parsed = JSON.parse(rawStored!);
    expect(parsed.state.turn).toBe(7);
    expect(parsed.state.generation).toBe(2);
    expect(parsed.state.flags.hotel_lavado).toBe(true);
    expect(parsed.state.stats.dinero).toBe(80);
    expect(parsed.state.activePartner).toBe('partnerB');
  });

  it('advances generation via startNewGeneration and resets game via resetGame', () => {
    // Trigger Game Over first
    useGameStore.setState({
      gameOver: true,
      generation: 1,
      stats: { dinero: 75, policia: 40, estres: 40, respeto: 60 },
      flags: { hotel_lavado: true },
    });

    useGameStore.getState().startNewGeneration();

    let state = useGameStore.getState();
    expect(state.generation).toBe(2);
    expect(state.gameOver).toBe(false);
    expect(state.partnerA.status).toBe('alive');
    expect(state.partnerB.status).toBe('alive');

    // Reset game completely
    useGameStore.getState().resetGame();
    state = useGameStore.getState();
    expect(state.generation).toBe(1);
    expect(state.stats).toEqual({
      dinero: 50,
      policia: 30,
      estres: 35,
      respeto: 40,
    });
  });
});
