# Project: Vice Shores Mobile (React Native Rewrite)

## Architecture
Vice Shores Mobile is a native React Native application built with Expo (TypeScript), implementing a Synthwave / GTA 6 aesthetic card-swiping game with a **Dual Protagonist (La Pareja)** architectural engine.

```
+-------------------------------------------------------------------------------+
|                                UI Layer                                       |
|  - Fullscreen Immersion & Custom Status Bar Handling                          |
|  - Main Game Screen (HUD Stats Bar, Danger Glow, Active Partner Indicator)    |
|  - Card Swipe Arena (Gesture Handler + Reanimated 60 FPS, Tilt, Choice Badge) |
|  - Procedural SVG Portrait Engine (React Native SVG, PRNG Seed Generative)    |
|  - Empire Hub Dashboard (Overlay Gear Modal: History, Match Stats, Heirs)    |
|  - Game Over & New Generation Screen (Legacy Report, Stat Inheritance)        |
+-------------------------------------------------------------------------------+
                                      │
                                      ▼
+-------------------------------------------------------------------------------+
|                      Dual Protagonist Game Engine                             |
|  - Deck Management & Filtering (common / partnerA_only / partnerB_only)       |
|  - Perspective Switcher (Organic Story Switch & Survival Demise Switch)       |
|  - State Clamping & Fatality Checks (8 Death Causes)                          |
|  - Legacy & Generation Succession Calculator                                  |
+-------------------------------------------------------------------------------+
                                      │
                                      ▼
+-------------------------------------------------------------------------------+
|                       State & Persistence Layer                               |
|  - Zustand Central Store                                                      |
|  - AsyncStorage Persistent Storage Sync (Auto-save)                           |
+-------------------------------------------------------------------------------+
```

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Expo Toolchain & Project Scaffold | Initialize standard package.json, app.json, tsconfig.json, babel.config.js, metro.config.js | M1 | Survey |
| 2 | Jest Test Infrastructure & Mocks | Jest config, jest.setup.js with AsyncStorage / Reanimated mocks, test runner | M1 | Survey |
| 3 | TypeScript Core Types & Schemas | Full typing for stats, partners, cards, deck, choices, legacy, and flags | M2 | Survey |
| 4 | 30-Card Deck & Cast Database | Port complete 30-card deck with Spanish dialogue, flags, and partner targets; 10 cast definitions | M2 | Survey |
| 5 | Dual Protagonist Zustand Store | Store slice with partnerA, partnerB, activePartner, stats, flags, history, generation | M2 | Survey |
| 6 | AsyncStorage Persistence Middleware | Auto-persist game state to AsyncStorage and rehydrate on startup | M2 | Survey |
| 7 | Dynamic Deck Filtering Engine | Filter eligible cards based on activePartner, flags, and recycle pool when < 3 cards | M2 | Survey |
| 8 | Perspective Switching (Organic & Survival) | Seamless partner toggle on story triggers; auto-transfer control to partner on death | M2 | Survey |
| 9 | Strict Game Over & Legacy Engine | Game Over triggered strictly when both partners fall; compute generation inheritance | M2 | Survey |
| 10 | Procedural SVG Portrait Engine | PRNG seed hashing and modular SVG component layers (hair, shades, skin, accessories) | M3 | Survey |
| 11 | Reanimated + Gesture Card Swipe Arena | PanGestureHandler + Reanimated 3 swipe physics, rotation tilt, left/right choice badges | M3 | Survey |
| 12 | Top HUD & Dynamic Stat Gauges | 4 gauges (dinero, policia, estres, respeto) with danger pulsation (<=14 or >=86) | M3 | Survey |
| 13 | Active Protagonist UI Indicator | Visual badge/accent header showing current active decision-maker | M3 | Survey |
| 14 | Dynamic Synthwave Environments | Background gradient/tint shifts matching character environment (`street`, `club`, etc.) | M3 | Survey |
| 15 | Empire Hub Modal & Gear Toggle | Top-right gear button opens dashboard with card history, lifetime stats, and reset options | M4 | Survey |
| 16 | Game Over & New Generation Screen | Displays death narrative, legacy modifiers, and button to launch Generation N+1 | M4 | Survey |
| 17 | Fullscreen OS Immersion | Hidden/translucent status bar and safe area edge-to-edge layout | M4 | Survey |
| 18 | E2E Test Suite Pass (Tiers 1-4) | Comprehensive opaque-box and engine tests passing 100% | M5 | Survey |
| 19 | Build & Export Verification | `npx tsc --noEmit` and `npx expo export` compiling with zero errors (code 0) | M5 | Survey |
| 20 | Adversarial & Integrity Hardening | Forensic audit and challenger verification against edge cases and leaks | M5 | Survey |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Toolchain, Project Setup & Test Infrastructure | Configure package.json, app.json, tsconfig.json, babel.config.js, metro.config.js, jest.config.js, jest.setup.js, install dependencies | none | DONE |
| M2 | Dual Protagonist Core State, Deck & Game Engine | Types, constants/deck, Zustand store with AsyncStorage, deck filter, dual switching, game over & legacy | M1 | IN_PROGRESS |
| M3 | Visuals, SVG Portraits & Gesture Card UI | SVG portrait generator, Reanimated card stack with Gesture Handler, HUD gauges, dynamic backgrounds | M2 | PLANNED |
| M4 | Empire Hub, Game Over & Screen Flow | Empire Hub modal, gear toggle, card history list, Game Over screen, New Gen flow, App root integration | M3 | PLANNED |
| M5 | E2E Verification, Build Export & Hardening | Full test pass across Tiers 1-4, `npx expo export` bundling, Challenger stress testing, Forensic Audit | M4 | PLANNED |

## Code Layout
```
vice_shores_mobile/
├── App.tsx                       # Main application entry point & root container
├── app.json                      # Expo configuration
├── babel.config.js               # Babel preset & reanimated plugin
├── index.ts                      # App registry entry point
├── jest.config.js                # Jest test runner configuration
├── jest.setup.js                 # Jest setup & mocks (AsyncStorage, Reanimated)
├── metro.config.js               # Metro bundler configuration
├── package.json                  # Dependencies & scripts
├── tsconfig.json                 # TypeScript strict configuration
├── src/
│   ├── types/
│   │   └── game.ts               # Core TypeScript interfaces & types
│   ├── constants/
│   │   ├── characters.ts         # 10 cast definitions, roles, seeds, backgrounds
│   │   ├── deck.ts               # 30 game cards with Spanish text, choices, flags, targets
│   │   ├── endings.ts            # 8 fatal game over descriptions
│   │   └── theme.ts              # Synthwave color tokens, typography & palette
│   ├── store/
│   │   ├── gameStore.ts          # Zustand store with AsyncStorage persistence
│   │   └── gameEngine.ts         # Headless game engine (stat deltas, clamping, switching, legacy)
│   ├── components/
│   │   ├── CardSwipeArena.tsx    # Reanimated 3 + Gesture Handler card swipe arena
│   │   ├── EmpireHubModal.tsx    # Gear overlay dashboard with history & stats
│   │   ├── GameOverModal.tsx     # Death & New Generation succession modal
│   │   ├── HudStatsBar.tsx       # 4 stat gauges with danger warning animations
│   │   ├── PartnerBadge.tsx      # Active protagonist indicator badge
│   │   └── PortraitSvg.tsx       # Generative procedural React Native SVG portrait
│   └── utils/
│       ├── prng.ts               # Mulberry32 / FNV-1a deterministic random generator
│       └── audioHaptics.ts       # Haptic and audio feedback triggers
└── __tests__/
    ├── unit/
    │   ├── prng.test.ts          # PRNG deterministic output tests
    │   ├── deckFilter.test.ts    # Perspective deck filtering unit tests
    │   ├── gameEngine.test.ts    # Stat clamping, organic/survival switching, legacy formulas
    │   └── storePersistence.test.ts # Zustand + AsyncStorage persistence roundtrip tests
    └── e2e/
        ├── tier1_features.test.ts    # Tier 1: Feature isolation tests
        ├── tier2_boundaries.test.ts  # Tier 2: Boundary & corner case tests
        ├── tier3_combinations.test.ts# Tier 3: Pairwise cross-feature tests
        └── tier4_workloads.test.ts   # Tier 4: Real-world gameplay simulation scenarios
```

## Interface Contracts

### Zustand Store & Game Engine
```typescript
interface GameStoreState {
  partnerA: PartnerState;
  partnerB: PartnerState;
  activePartner: 'partnerA' | 'partnerB';
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

  // Actions
  initGame: () => void;
  makeChoice: (direction: 'left' | 'right') => void;
  switchPartnerManually?: () => void;
  openEmpireHub: () => void;
  closeEmpireHub: () => void;
  startNewGeneration: () => void;
  resetGame: () => void;
}
```

### Dynamic Deck Filter Signature
```typescript
function getEligibleCards(
  deck: GameCard[],
  activePartner: 'partnerA' | 'partnerB',
  flags: Record<string, boolean>,
  seenCardIds: string[]
): GameCard[];
```

### Survival Demise Transition Signature
```typescript
function handlePartnerDemise(
  state: GameState,
  fatalStat: StatKey,
  extreme: 'low' | 'high'
): {
  updatedPartnerA: PartnerState;
  updatedPartnerB: PartnerState;
  newActivePartner: 'partnerA' | 'partnerB';
  isGameOver: boolean;
  transitionCard?: GameCard;
  ending?: EndingCause;
};
```
