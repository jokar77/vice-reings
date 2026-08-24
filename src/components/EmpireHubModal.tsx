import React from 'react';
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
import {
  EmpireStats,
  HistoryEntry,
  PartnerState,
  StatModifiers,
} from '../types/game';
import { COLORS } from '../constants/theme';
import { useGameStore } from '../store/gameStore';
import { triggerImpactLightHaptic } from '../utils/audioHaptics';

export interface EmpireHubModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onReset?: () => void;
  history?: HistoryEntry[];
  stats?: EmpireStats;
  generation?: number;
  turn?: number;
  moneyLaundered?: number;
  partnerA?: PartnerState;
  partnerB?: PartnerState;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const formatCurrency = (amount: number): string => {
  return `$${amount.toLocaleString('en-US')}`;
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'alive':
      return COLORS.aqua;
    case 'dead':
    case 'jailed':
      return COLORS.blood;
    default:
      return COLORS.textMuted;
  }
};

const renderStatDeltaBadge = (
  label: string,
  val: number | undefined,
  goodWhenPositive: boolean
) => {
  if (val === undefined || val === 0) return null;
  const isPositive = val > 0;
  const isGood = goodWhenPositive ? isPositive : !isPositive;
  const badgeColor = isGood ? COLORS.moss : COLORS.blood;
  const formattedVal = isPositive ? `+${val}` : `${val}`;

  return (
    <View
      key={label}
      style={[
        styles.deltaBadge,
        {
          borderColor: badgeColor,
          backgroundColor: isGood
            ? 'rgba(0, 255, 136, 0.12)'
            : 'rgba(255, 0, 85, 0.12)',
        },
      ]}
    >
      <Text style={[styles.deltaText, { color: badgeColor }]}>
        {label}: {formattedVal}
      </Text>
    </View>
  );
};

export const EmpireHubModal: React.FC<EmpireHubModalProps> = ({
  isOpen: propsIsOpen,
  onClose,
  onReset,
  history: propsHistory,
  stats: propsStats,
  generation: propsGeneration,
  turn: propsTurn,
  moneyLaundered: propsMoneyLaundered,
  partnerA: propsPartnerA,
  partnerB: propsPartnerB,
  style,
  testID = 'empire-hub-modal',
}) => {
  const storeIsOpen = useGameStore((s) => s.isEmpireHubOpen);
  const storeClose = useGameStore((s) => s.closeEmpireHub);
  const storeReset = useGameStore((s) => s.resetGame);
  const storeHistory = useGameStore((s) => s.history);
  const storeStats = useGameStore((s) => s.stats);
  const storeGeneration = useGameStore((s) => s.generation);
  const storeTurn = useGameStore((s) => s.turn);
  const storeMoneyLaundered = useGameStore((s) => s.moneyLaundered);
  const storePartnerA = useGameStore((s) => s.partnerA);
  const storePartnerB = useGameStore((s) => s.partnerB);

  const visible = propsIsOpen !== undefined ? propsIsOpen : storeIsOpen;
  const history = propsHistory !== undefined ? propsHistory : storeHistory;
  const generation = propsGeneration !== undefined ? propsGeneration : storeGeneration;
  const turn = propsTurn !== undefined ? propsTurn : storeTurn;
  const moneyLaundered =
    propsMoneyLaundered !== undefined ? propsMoneyLaundered : storeMoneyLaundered;
  const pA = propsPartnerA !== undefined ? propsPartnerA : storePartnerA;
  const pB = propsPartnerB !== undefined ? propsPartnerB : storePartnerB;

  const handleClose = () => {
    triggerImpactLightHaptic();
    if (onClose) {
      onClose();
    } else {
      storeClose();
    }
  };

  const handleReset = () => {
    triggerImpactLightHaptic();
    if (onReset) {
      onReset();
    } else {
      storeReset();
    }
    if (onClose) {
      onClose();
    } else {
      storeClose();
    }
  };

  return (
    <Modal
      testID={testID}
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        {/* Backdrop Tap to dismiss */}
        <TouchableOpacity
          testID="empire-hub-backdrop"
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />

        {/* Dashboard Card Container */}
        <View style={[styles.modalCard, style]}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>HUB DEL IMPERIO</Text>
              <Text style={styles.headerSubtitle}>
                VICE SHORES • REGISTRO DE OPERACIONES
              </Text>
            </View>
            <TouchableOpacity
              testID="empire-hub-close-btn"
              style={styles.closeButton}
              activeOpacity={0.7}
              onPress={handleClose}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            testID="empire-hub-scroll-view"
            style={styles.scrollBody}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Section 1: Match & Dynasty Metrics */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>MÉTRICAS DEL CARTEL</Text>
              <View style={styles.metricsGrid}>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>AÑOS EN PODER</Text>
                  <Text testID="metric-years" style={styles.metricValue}>
                    {turn}
                  </Text>
                </View>

                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>DINERO LAVADO</Text>
                  <Text
                    testID="metric-money"
                    style={[styles.metricValue, { color: COLORS.amber }]}
                  >
                    {formatCurrency(moneyLaundered)}
                  </Text>
                </View>

                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>GENERACIÓN</Text>
                  <Text
                    testID="metric-generation"
                    style={[styles.metricValue, { color: COLORS.aqua }]}
                  >
                    Gen {generation}
                  </Text>
                </View>
              </View>

              {/* Duo Status Cards */}
              <View style={styles.partnerStatusRow}>
                <View
                  testID="partner-status-a"
                  style={[
                    styles.partnerCard,
                    { borderColor: getStatusColor(pA?.status || 'alive') },
                  ]}
                >
                  <Text style={styles.partnerRoleTag}>{pA?.role || 'El Estratega'}</Text>
                  <Text style={styles.partnerNameText}>{pA?.name || 'Nico'}</Text>
                  <Text
                    style={[
                      styles.partnerStatusLabel,
                      { color: getStatusColor(pA?.status || 'alive') },
                    ]}
                  >
                    {pA?.status === 'alive'
                      ? 'ACTIVO'
                      : pA?.status === 'jailed'
                      ? 'ENCARCELADO'
                      : 'CAÍDO'}
                  </Text>
                </View>

                <View
                  testID="partner-status-b"
                  style={[
                    styles.partnerCard,
                    { borderColor: getStatusColor(pB?.status || 'alive') },
                  ]}
                >
                  <Text style={styles.partnerRoleTag}>{pB?.role || 'La Ejecutora'}</Text>
                  <Text style={styles.partnerNameText}>{pB?.name || 'Camila'}</Text>
                  <Text
                    style={[
                      styles.partnerStatusLabel,
                      { color: getStatusColor(pB?.status || 'alive') },
                    ]}
                  >
                    {pB?.status === 'alive'
                      ? 'ACTIVO'
                      : pB?.status === 'jailed'
                      ? 'ENCARCELADA'
                      : 'CAÍDA'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Section 2: Recent Cards History (Last 50) */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>HISTORIAL DE DECISIONES</Text>
                <Text style={styles.historyCountBadge}>
                  {history.length} / 50
                </Text>
              </View>

              {history.length === 0 ? (
                <View testID="history-empty-view" style={styles.emptyHistoryBox}>
                  <Text style={styles.emptyHistoryText}>
                    No hay decisiones registradas en este período.
                  </Text>
                </View>
              ) : (
                <View testID="history-list" style={styles.historyList}>
                  {history.map((item, index) => {
                    const isLeft = item.direction === 'left';
                    const choiceColor = isLeft ? COLORS.blood : COLORS.aqua;
                    const deltas = item.statDeltas || {};

                    return (
                      <View
                        key={item.id || `hist-${index}`}
                        testID={`history-item-${item.id}`}
                        style={styles.historyItemCard}
                      >
                        {/* History Card Header */}
                        <View style={styles.historyItemHeader}>
                          <View style={styles.historySpeakerWrapper}>
                            <Text
                              testID={`history-speaker-${item.id}`}
                              style={styles.historySpeakerName}
                            >
                              {item.characterName || item.character}
                            </Text>
                            <Text style={styles.historyPartnerActor}>
                              vía {item.partnerName}
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.directionBadge,
                              { borderColor: choiceColor },
                            ]}
                          >
                            <Text
                              style={[
                                styles.directionBadgeText,
                                { color: choiceColor },
                              ]}
                            >
                              {isLeft ? '← IZQ' : 'DER →'}
                            </Text>
                          </View>
                        </View>

                        {/* Narrative dialogue text */}
                        <Text style={styles.historyPromptText}>«{item.text}»</Text>

                        {/* Choice made */}
                        <View style={styles.historyChoiceBox}>
                          <Text style={styles.historyChoiceLabel}>Elección:</Text>
                          <Text
                            testID={`history-choice-${item.id}`}
                            style={[
                              styles.historyChoiceValue,
                              { color: choiceColor },
                            ]}
                          >
                            {item.choiceText}
                          </Text>
                        </View>

                        {/* Stat Deltas */}
                        <View
                          testID={`history-deltas-${item.id}`}
                          style={styles.deltasRow}
                        >
                          {renderStatDeltaBadge('Dinero', deltas.dinero, true)}
                          {renderStatDeltaBadge('Búsqueda', deltas.policia, false)}
                          {renderStatDeltaBadge('Estrés', deltas.estres, false)}
                          {renderStatDeltaBadge('Reputación', deltas.respeto, true)}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity
              testID="empire-hub-reset-btn"
              style={styles.resetButton}
              activeOpacity={0.7}
              onPress={handleReset}
            >
              <Text style={styles.resetButtonText}>REINICIAR PARTIDA</Text>
            </TouchableOpacity>

            <TouchableOpacity
              testID="empire-hub-close-bottom-btn"
              style={styles.closeBottomButton}
              activeOpacity={0.7}
              onPress={handleClose}
            >
              <Text style={styles.closeBottomButtonText}>CERRAR</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 10, 26, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '88%',
    backgroundColor: COLORS.petrol,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.dim,
    overflow: 'hidden',
    shadowColor: COLORS.aqua,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: 'rgba(10, 10, 26, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: COLORS.amber,
    letterSpacing: 1.5,
  },
  headerSubtitle: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 1,
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  closeButtonText: {
    color: COLORS.textLight,
    fontSize: 14,
    fontWeight: 'bold',
  },
  scrollBody: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.aqua,
    letterSpacing: 1.2,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  historyCountBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textMuted,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: 'rgba(10, 10, 26, 0.7)',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    marginBottom: 4,
    textAlign: 'center',
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.textLight,
  },
  partnerStatusRow: {
    flexDirection: 'row',
    gap: 8,
  },
  partnerCard: {
    flex: 1,
    backgroundColor: 'rgba(10, 10, 26, 0.7)',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1.5,
  },
  partnerRoleTag: {
    fontSize: 8,
    fontWeight: '800',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  partnerNameText: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.textLight,
    marginTop: 2,
  },
  partnerStatusLabel: {
    fontSize: 10,
    fontWeight: '900',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  emptyHistoryBox: {
    padding: 24,
    backgroundColor: 'rgba(10, 10, 26, 0.5)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
  },
  emptyHistoryText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  historyList: {
    gap: 10,
  },
  historyItemCard: {
    backgroundColor: 'rgba(10, 10, 26, 0.75)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.15)',
  },
  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  historySpeakerWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historySpeakerName: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.amber,
  },
  historyPartnerActor: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  directionBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  directionBadgeText: {
    fontSize: 9,
    fontWeight: '900',
  },
  historyPromptText: {
    fontSize: 12,
    color: COLORS.paper,
    fontStyle: 'italic',
    lineHeight: 16,
    marginBottom: 8,
  },
  historyChoiceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  historyChoiceLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginRight: 6,
  },
  historyChoiceValue: {
    fontSize: 11,
    fontWeight: '800',
    flex: 1,
  },
  deltasRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  deltaBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  deltaText: {
    fontSize: 9,
    fontWeight: '800',
  },
  footer: {
    flexDirection: 'row',
    padding: 12,
    gap: 10,
    backgroundColor: 'rgba(10, 10, 26, 0.95)',
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
  },
  resetButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 0, 85, 0.6)',
    backgroundColor: 'rgba(255, 0, 85, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButtonText: {
    fontSize: 11,
    fontWeight: '900',
    color: COLORS.blood,
    letterSpacing: 0.8,
  },
  closeBottomButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 240, 255, 0.6)',
    backgroundColor: 'rgba(0, 240, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBottomButtonText: {
    fontSize: 11,
    fontWeight: '900',
    color: COLORS.aqua,
    letterSpacing: 0.8,
  },
});

export default EmpireHubModal;
