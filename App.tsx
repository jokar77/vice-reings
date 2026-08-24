import React, { useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useGameStore } from './src/store/gameStore';
import { getCharacter } from './src/constants/characters';
import { BACKGROUND_COLORS, COLORS } from './src/constants/theme';
import {
  HudStatsBar,
  PartnerBadge,
  CardSwipeArena,
  EmpireHubModal,
  GameOverModal,
} from './src/components';
import { triggerImpactLightHaptic } from './src/utils/audioHaptics';

export default function App() {
  const initGame = useGameStore((s) => s.initGame);
  const currentCard = useGameStore((s) => s.currentCard);
  const openEmpireHub = useGameStore((s) => s.openEmpireHub);

  useEffect(() => {
    initGame();
  }, [initGame]);

  const currentBgKey = currentCard
    ? getCharacter(currentCard.w).bg
    : 'street';
  const currentBgColor =
    BACKGROUND_COLORS[currentBgKey] || BACKGROUND_COLORS.street;

  const handleOpenHub = () => {
    triggerImpactLightHaptic();
    openEmpireHub();
  };

  return (
    <SafeAreaProvider>
      <View
        testID="app-root-container"
        style={[styles.rootContainer, { backgroundColor: currentBgColor }]}
      >
        <StatusBar style="light" translucent={true} />

        <SafeAreaView style={styles.safeArea}>
          {/* Top Navigation Bar & Brand Header */}
          <View testID="app-header" style={styles.header}>
            <View style={styles.brandTitleContainer}>
              <Text testID="app-header-title" style={styles.brandTitle}>
                VICE SHORES
              </Text>
              <Text style={styles.brandSubtitle}>
                Dual Protagonist Engine Initialized
              </Text>
            </View>

            {/* Gear Button for Empire Hub */}
            <TouchableOpacity
              testID="btn-open-empire-hub"
              accessibilityLabel="Abrir Hub del Imperio"
              style={styles.gearButton}
              activeOpacity={0.7}
              onPress={handleOpenHub}
            >
              <Svg width={20} height={20} viewBox="0 0 24 24">
                <Path
                  d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"
                  fill={COLORS.aqua}
                />
              </Svg>
            </TouchableOpacity>
          </View>

          {/* Top HUD Statistics Gauges */}
          <HudStatsBar testID="hud-stats-bar" />

          {/* Active Protagonist Indicator & Switcher */}
          <PartnerBadge testID="partner-badge" />

          {/* Card Arena & Decision Swiper */}
          <View style={styles.arenaContainer}>
            <CardSwipeArena testID="card-swipe-arena" />
          </View>
        </SafeAreaView>

        {/* Modal Dashboards */}
        <EmpireHubModal testID="empire-hub-modal" />
        <GameOverModal testID="game-over-modal" />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: COLORS.ink,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    backgroundColor: 'rgba(10, 10, 26, 0.65)',
  },
  brandTitleContainer: {
    flex: 1,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.amber,
    letterSpacing: 2,
    textShadowColor: 'rgba(254, 231, 21, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  brandSubtitle: {
    fontSize: 8,
    fontWeight: '800',
    color: COLORS.aqua,
    letterSpacing: 1.5,
    marginTop: 1,
  },
  gearButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 240, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arenaContainer: {
    flex: 1,
  },
});
