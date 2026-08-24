import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  GameCard,
  GameStoreState,
  HistoryEntry,
  PartnerId,
} from '../types/game';
import { INITIAL_DECK } from '../constants/deck';
import { getCharacter } from '../constants/characters';
import {
  applyChoiceDeltas,
  calculateLegacy,
  checkStatFatalities,
  createInitialGameState,
  createNextGenerationState,
  getEligibleCards,
  handlePartnerDemise,
} from './gameEngine';

const initial = createInitialGameState();

export const useGameStore = create<GameStoreState>()(
  persist(
    (set, get) => ({
      ...initial,

      initGame: () => {
        const state = get();
        if (!state.currentCard && !state.gameOver) {
          set(createInitialGameState());
        }
      },

      makeChoice: (direction: 'left' | 'right') => {
        const state = get();
        if (state.gameOver || !state.currentCard) return;

        const currentCard = state.currentCard;
        const choice = direction === 'left' ? currentCard.l : currentCard.r;
        const newStats = applyChoiceDeltas(state.stats, choice.fx);

        // Update narrative and legacy flags
        const newFlags = { ...state.flags };
        if (choice.fx.set) {
          choice.fx.set.forEach((f: string) => {
            newFlags[f] = true;
          });
        }
        if (choice.fx.legado) {
          choice.fx.legado.forEach((f: string) => {
            newFlags[f] = true;
          });
        }

        // Launder money metric tracking
        let newMoneyLaundered = state.moneyLaundered;
        if (choice.fx.dinero && choice.fx.dinero > 0) {
          const multiplier = newFlags.hotel_lavado ? 15000 : 5000;
          newMoneyLaundered += choice.fx.dinero * multiplier;
        }

        // Add history log entry (bounded to latest 50 entries)
        const historyEntry: HistoryEntry = {
          id: `hist_${state.turn}_${Date.now()}`,
          cardId: currentCard.id,
          character: currentCard.w,
          characterName: getCharacter(currentCard.w).name,
          text: currentCard.t,
          choiceText: choice.t,
          direction,
          partnerId: state.activePartner,
          partnerName: state[state.activePartner].name,
          statDeltas: choice.fx,
          timestamp: Date.now(),
        };

        const updatedHistory = [historyEntry, ...state.history].slice(0, 50);

        // Check for stat boundary fatality (0 or 100)
        const fatality = checkStatFatalities(newStats);

        if (fatality) {
          const demiseResult = handlePartnerDemise(
            {
              ...state,
              stats: newStats,
              flags: newFlags,
            },
            fatality.stat,
            fatality.extreme
          );

          if (demiseResult.isGameOver) {
            const finalState = {
              ...state,
              stats: newStats,
              flags: newFlags,
              turn: state.turn + 1,
              moneyLaundered: newMoneyLaundered,
              partnerA: demiseResult.updatedPartnerA,
              partnerB: demiseResult.updatedPartnerB,
              activeEnding: demiseResult.ending || null,
              gameOver: true,
              history: updatedHistory,
            };

            const legacyReport = calculateLegacy(finalState);

            set({
              ...finalState,
              legacyReport,
              currentCard: null,
            });
            return;
          }

          // Companion survives -> Switch active partner and display survival transition card
          const transitionCard = demiseResult.transitionCard!;
          const finalStats = demiseResult.bufferedStats ?? newStats;

          set({
            stats: finalStats,
            flags: newFlags,
            turn: state.turn + 1,
            moneyLaundered: newMoneyLaundered,
            partnerA: demiseResult.updatedPartnerA,
            partnerB: demiseResult.updatedPartnerB,
            activePartner: demiseResult.newActivePartner,
            currentCard: transitionCard,
            seenCardIds: [...state.seenCardIds, transitionCard.id],
            history: updatedHistory,
            gameOver: false,
          });
          return;
        }

        // Determine next active partner
        let nextPartner: PartnerId = state.activePartner;
        const bothAlive =
          state.partnerA.status === 'alive' && state.partnerB.status === 'alive';

        if (bothAlive && currentCard.switchPartner) {
          nextPartner = state.activePartner === 'partnerA' ? 'partnerB' : 'partnerA';
        } else if (state[state.activePartner].status !== 'alive') {
          // Fallback check: if active is somehow not alive, switch to the other
          nextPartner = state.activePartner === 'partnerA' ? 'partnerB' : 'partnerA';
        }

        // Draw next card from perspective filtered deck
        const updatedSeenIds = [...state.seenCardIds, currentCard.id];
        const eligiblePool = getEligibleCards(
          INITIAL_DECK,
          nextPartner,
          newFlags,
          updatedSeenIds
        );

        const nextCardIndex = Math.floor(Math.random() * eligiblePool.length);
        const nextCard = eligiblePool[nextCardIndex] || INITIAL_DECK[0];

        set({
          stats: newStats,
          flags: newFlags,
          turn: state.turn + 1,
          moneyLaundered: newMoneyLaundered,
          activePartner: nextPartner,
          currentCard: nextCard,
          seenCardIds: [...updatedSeenIds, nextCard.id],
          history: updatedHistory,
        });
      },

      switchPartnerManually: () => {
        const state = get();
        if (
          state.partnerA.status === 'alive' &&
          state.partnerB.status === 'alive' &&
          !state.gameOver
        ) {
          const nextPartner: PartnerId =
            state.activePartner === 'partnerA' ? 'partnerB' : 'partnerA';
          const eligiblePool = getEligibleCards(
            INITIAL_DECK,
            nextPartner,
            state.flags,
            state.seenCardIds
          );
          const nextCard =
            eligiblePool[Math.floor(Math.random() * eligiblePool.length)] ||
            INITIAL_DECK[0];

          set({
            activePartner: nextPartner,
            currentCard: nextCard,
            seenCardIds: [...state.seenCardIds, nextCard.id],
          });
        }
      },

      openEmpireHub: () => set({ isEmpireHubOpen: true }),
      closeEmpireHub: () => set({ isEmpireHubOpen: false }),

      startNewGeneration: () => {
        const state = get();
        const nextGenState = createNextGenerationState(state);
        set(nextGenState);
      },

      resetGame: () => {
        set(createInitialGameState());
      },
    }),
    {
      name: 'vice_shores_game_storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        partnerA: state.partnerA,
        partnerB: state.partnerB,
        activePartner: state.activePartner,
        stats: state.stats,
        flags: state.flags,
        generation: state.generation,
        turn: state.turn,
        moneyLaundered: state.moneyLaundered,
        history: state.history,
        currentCard: state.currentCard,
        seenCardIds: state.seenCardIds,
        gameOver: state.gameOver,
        activeEnding: state.activeEnding,
        legacyReport: state.legacyReport,
        isEmpireHubOpen: false, // Don't persist modal open state
      }),
    }
  )
);
