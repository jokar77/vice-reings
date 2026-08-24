import React, { useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { EndingCause, LegacyReport } from '../types/game';
import { COLORS } from '../constants/theme';
import { useGameStore } from '../store/gameStore';
import {
  triggerPartnerDemiseHaptic,
  triggerChoiceCommitHaptic,
} from '../utils/audioHaptics';

export interface GameOverModalProps {
  isOpen?: boolean;
  ending?: EndingCause | null;
  legacyReport?: LegacyReport | null;
  onContinue?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const formatCurrency = (amount: number): string => {
  return `$${amount.toLocaleString('en-US')}`;
};

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen: propsIsOpen,
  ending: propsEnding,
  legacyReport: propsLegacyReport,
  onContinue,
  style,
  testID = 'game-over-modal',
}) => {
  const storeGameOver = useGameStore((s) => s.gameOver);
  const storeActiveEnding = useGameStore((s) => s.activeEnding);
  const storeLegacyReport = useGameStore((s) => s.legacyReport);
  const storeStartNewGeneration = useGameStore((s) => s.startNewGeneration);

  const visible = propsIsOpen !== undefined ? propsIsOpen : storeGameOver;
  const ending = propsEnding !== undefined ? propsEnding : storeActiveEnding;
  const legacy =
    propsLegacyReport !== undefined ? propsLegacyReport : storeLegacyReport;

  useEffect(() => {
    if (visible) {
      triggerPartnerDemiseHaptic();
    }
  }, [visible]);

  const handleContinue = () => {
    triggerChoiceCommitHaptic();
    if (onContinue) {
      onContinue();
    } else {
      storeStartNewGeneration();
    }
  };

  const titleText = ending?.title || 'FIN DEL IMPERIO';
  const descText =
    ending?.description ||
    'Ambos líderes han caído. El imperio criminal de Vice Shores ha colapsado bajo la presión de las calles.';
  const currentGen = legacy?.generation ?? 1;
  const nextGen = currentGen + 1;

  return (
    <Modal
      testID={testID}
      visible={visible}
      transparent={false}
      animationType="fade"
    >
      <View style={[styles.container, style]}>
        {/* Ambient Top Banner */}
        <View style={styles.topAccentBar} />

        <ScrollView
          testID="game-over-scroll-view"
          style={styles.scrollBody}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Title & Narrative */}
          <View style={styles.header}>
            <Text style={styles.kickerText}>VICE SHORES • CAÍDA TOTAL</Text>
            <Text testID="game-over-title" style={styles.title}>
              {titleText.toUpperCase()}
            </Text>
            <View style={styles.titleUnderline} />
            <Text testID="game-over-description" style={styles.description}>
              «{descText}»
            </Text>
          </View>

          {/* Generation & Lifetime Metrics */}
          <View style={styles.lifetimeBox}>
            <View style={styles.lifetimeMetric}>
              <Text style={styles.lifetimeLabel}>GENERACIÓN</Text>
              <Text style={styles.lifetimeValue}>Gen {currentGen}</Text>
            </View>
            <View style={styles.lifetimeDivider} />
            <View style={styles.lifetimeMetric}>
              <Text style={styles.lifetimeLabel}>AÑOS EN PODER</Text>
              <Text style={styles.lifetimeValue}>
                {legacy?.yearsInPower ?? 0}
              </Text>
            </View>
            <View style={styles.lifetimeDivider} />
            <View style={styles.lifetimeMetric}>
              <Text style={styles.lifetimeLabel}>DINERO LAVADO</Text>
              <Text
                style={[styles.lifetimeValue, { color: COLORS.amber }]}
              >
                {formatCurrency(legacy?.moneyLaundered ?? 0)}
              </Text>
            </View>
          </View>

          {/* Legacy & Succession Report */}
          <View
            testID="legacy-report-container"
            style={styles.legacyContainer}
          >
            <View style={styles.legacyHeaderRow}>
              <Text style={styles.legacyTitle}>INFORME DE HERENCIA</Text>
              <Text style={styles.legacyGenBadge}>
                Para Gen {nextGen}
              </Text>
            </View>
            <Text style={styles.legacySubtitle}>
              Bonificaciones y penalizaciones transferidas a los sucesores
            </Text>

            {/* Stat Modifiers Grid */}
            <View style={styles.statModGrid}>
              <View style={styles.statModCard}>
                <Text style={styles.statModLabel}>DINERO INICIAL</Text>
                <Text
                  testID="legacy-stat-dinero"
                  style={[
                    styles.statModValue,
                    {
                      color:
                        (legacy?.dDinero ?? 0) >= 0
                          ? COLORS.amber
                          : COLORS.blood,
                    },
                  ]}
                >
                  {(legacy?.dDinero ?? 0) >= 0 ? '+' : ''}
                  {legacy?.dDinero ?? 0}
                </Text>
              </View>

              <View style={styles.statModCard}>
                <Text style={styles.statModLabel}>BÚSQUEDA POLICIAL</Text>
                <Text
                  testID="legacy-stat-policia"
                  style={[
                    styles.statModValue,
                    {
                      color:
                        (legacy?.dPolicia ?? 0) <= 0
                          ? COLORS.aqua
                          : COLORS.blood,
                    },
                  ]}
                >
                  {(legacy?.dPolicia ?? 0) >= 0 ? '+' : ''}
                  {legacy?.dPolicia ?? 0}
                </Text>
              </View>

              <View style={styles.statModCard}>
                <Text style={styles.statModLabel}>ESTRÉS INICIAL</Text>
                <Text
                  testID="legacy-stat-estres"
                  style={[
                    styles.statModValue,
                    {
                      color:
                        (legacy?.dEstres ?? 0) <= 0
                          ? COLORS.moss
                          : COLORS.blood,
                    },
                  ]}
                >
                  {(legacy?.dEstres ?? 0) >= 0 ? '+' : ''}
                  {legacy?.dEstres ?? 0}
                </Text>
              </View>

              <View style={styles.statModCard}>
                <Text style={styles.statModLabel}>REPUTACIÓN CALLEJERA</Text>
                <Text
                  testID="legacy-stat-respeto"
                  style={[
                    styles.statModValue,
                    {
                      color:
                        (legacy?.dRespeto ?? 0) >= 0
                          ? COLORS.moss
                          : COLORS.blood,
                    },
                  ]}
                >
                  {(legacy?.dRespeto ?? 0) >= 0 ? '+' : ''}
                  {legacy?.dRespeto ?? 0}
                </Text>
              </View>
            </View>

            {/* Individual Heritage Rows */}
            {legacy?.rows && legacy.rows.length > 0 && (
              <View style={styles.traitRowsList}>
                <Text style={styles.traitSectionHeader}>RASGOS Y CONSECUENCIAS</Text>
                {legacy.rows.map(([desc, val], idx) => {
                  const isPositive = val >= 0;
                  return (
                    <View
                      key={`legacy-row-${idx}`}
                      testID={`legacy-row-${idx}`}
                      style={styles.traitRow}
                    >
                      <Text style={styles.traitDesc}>{desc}</Text>
                      <Text
                        style={[
                          styles.traitVal,
                          { color: isPositive ? COLORS.moss : COLORS.blood },
                        ]}
                      >
                        {isPositive ? `+${val}` : `${val}`}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Continue Succession CTA Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            testID="btn-continue-generation"
            accessibilityLabel="Continuar el Imperio"
            style={styles.continueButton}
            activeOpacity={0.8}
            onPress={handleContinue}
          >
            <Text style={styles.continueButtonText}>CONTINUAR EL IMPERIO</Text>
            <Text style={styles.continueButtonSubtext}>
              Iniciar Generación {nextGen} con Nico y Camila
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0515',
    justifyContent: 'space-between',
  },
  topAccentBar: {
    height: 4,
    backgroundColor: COLORS.blood,
    width: '100%',
    shadowColor: COLORS.blood,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 6,
  },
  scrollBody: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 36,
    paddingBottom: 24,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
  },
  kickerText: {
    fontSize: 11,
    fontWeight: '900',
    color: COLORS.blood,
    letterSpacing: 2.5,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 3,
    textAlign: 'center',
    textShadowColor: 'rgba(255, 0, 85, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  titleUnderline: {
    width: 60,
    height: 3,
    backgroundColor: COLORS.blood,
    borderRadius: 2,
    marginVertical: 12,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.paper,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  lifetimeBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(21, 10, 42, 0.8)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
    width: '100%',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  lifetimeMetric: {
    alignItems: 'center',
  },
  lifetimeLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  lifetimeValue: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  lifetimeDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  legacyContainer: {
    width: '100%',
    backgroundColor: 'rgba(21, 10, 42, 0.85)',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 240, 255, 0.3)',
    padding: 16,
    marginBottom: 16,
  },
  legacyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  legacyTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.aqua,
    letterSpacing: 1.2,
  },
  legacyGenBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.amber,
    backgroundColor: 'rgba(254, 231, 21, 0.12)',
    borderColor: COLORS.amber,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  legacySubtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4,
    marginBottom: 14,
  },
  statModGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  statModCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'rgba(10, 10, 26, 0.8)',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
  },
  statModLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginBottom: 4,
    textAlign: 'center',
  },
  statModValue: {
    fontSize: 16,
    fontWeight: '900',
  },
  traitRowsList: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 12,
    gap: 8,
  },
  traitSectionHeader: {
    fontSize: 9,
    fontWeight: '900',
    color: COLORS.textMuted,
    letterSpacing: 1,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  traitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 10, 26, 0.5)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  traitDesc: {
    fontSize: 12,
    color: COLORS.paper,
    flex: 1,
  },
  traitVal: {
    fontSize: 12,
    fontWeight: '900',
    marginLeft: 8,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(10, 5, 21, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  continueButton: {
    backgroundColor: COLORS.blood,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.blood,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  continueButtonText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  continueButtonSubtext: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 3,
  },
});

export default GameOverModal;
