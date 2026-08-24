# E2E Test Infra: Vice Shores Mobile

## Test Philosophy
- Opaque-box, requirement-driven. No internal implementation couplings.
- Multi-tier validation methodology: Category-Partition (Tier 1), Boundary Value Analysis (Tier 2), Pairwise Combinations (Tier 3), Real-World Empire Gameplay Simulations (Tier 4).

## Feature Inventory Test Mapping
| # | Feature | Requirement Source | Tier 1 (Count) | Tier 2 (Count) | Tier 3 (Pairwise) | Tier 4 (Workloads) |
|---|---------|-------------------|:--------------:|:--------------:|:-----------------:|:------------------:|
| F1 | Zustand + AsyncStorage Persistence | ORIGINAL_REQUEST.md AC | 5 | 5 | ✓ | ✓ |
| F2 | Dual Protagonist State & Transitions | ORIGINAL_REQUEST.md AC, Design §4 | 5 | 5 | ✓ | ✓ |
| F3 | Dynamic Deck Filtering by Partner | Design Spec §4.2 | 5 | 5 | ✓ | ✓ |
| F4 | Stat Modifiers, Danger Clamping & Endings | Reference index.html, Design §4.1 | 5 | 5 | ✓ | ✓ |
| F5 | Survival Switch vs Dual Demise Game Over | ORIGINAL_REQUEST.md AC, Design §4.4 | 5 | 5 | ✓ | ✓ |
| F6 | Legacy Succession & Generation Inheritance | Reference index.html, Design §4.4 | 5 | 5 | ✓ | ✓ |
| F7 | Empire Hub History & Match Metrics | Design Spec §3, ORIGINAL_REQUEST R1 | 5 | 5 | ✓ | ✓ |
| F8 | Procedural SVG Portrait Determinism | Design Spec §2, Reference index.html | 5 | 5 | ✓ | ✓ |

## Test Architecture & Framework
- **Test Runner**: Jest (`npx.cmd jest`) with `jest-expo` preset and `@testing-library/react-native`.
- **Mocks**:
  - `@react-native-async-storage/async-storage` via `@react-native-async-storage/async-storage/jest/async-storage-mock`.
  - `react-native-reanimated` mock with worklet initialization.
- **Pass / Fail Criteria**:
  - 100% test assertions pass with exit code 0.
  - Zero unhandled promise rejections or async memory leaks.

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Full Empire Run: Partner A dies of stress, Partner B takes over, runs 15 years, then gets arrested -> Game Over | F1, F2, F3, F4, F5, F7 | High |
| 2 | Legacy Inheritance Run: Generation 1 creates 'hotel_lavado' and high respect -> Generation 2 starts with proper bonuses | F1, F4, F6, F7 | High |
| 3 | State Recovery / Persistence Interruption: Simulate app close mid-game with custom flags and verify exact restoration | F1, F2, F3, F7 | High |
| 4 | Deck Exhaustion & Pool Recycling: Play 40 consecutive cards under heavy flag unlocks without crashes or empty draws | F3, F4, F7 | Medium |
| 5 | Organic Perspective Alternation: Story triggers switch between Partner A and B with independent choice consequences | F2, F3, F4, F7 | Medium |

## Coverage Thresholds
- Tier 1: ≥5 per feature (Total ≥ 40 test cases)
- Tier 2: ≥5 per feature (Total ≥ 40 boundary test cases)
- Tier 3: Pairwise coverage across major feature combinations (Total ≥ 12 test cases)
- Tier 4: ≥5 realistic multi-turn gameplay scenarios
- **Total Minimum Target**: ≥97 Automated Jest Tests
