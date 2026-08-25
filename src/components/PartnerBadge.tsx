import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { PartnerId, PartnerState } from '../types/game';
import { COLORS } from '../constants/theme';
import { useGameStore } from '../store/gameStore';

export interface PartnerBadgeProps {
  activePartner?: PartnerId;
  partnerA?: PartnerState;
  partnerB?: PartnerState;
  onSwitchPartner?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'alive':
      return 'ACTIVO';
    case 'dead':
      return 'MUERTO';
    case 'jailed':
      return 'PRESO';
    default:
      return status.toUpperCase();
  }
};

const getStatusColor = (status: string, isActive: boolean): string => {
  if (status === 'dead' || status === 'jailed') {
    return COLORS.blood;
  }
  return isActive ? COLORS.aqua : COLORS.textMuted;
};

export const PartnerBadge: React.FC<PartnerBadgeProps> = ({
  activePartner: propsActive,
  partnerA: propsPartnerA,
  partnerB: propsPartnerB,
  onSwitchPartner,
  style,
  testID = 'partner-badge',
}) => {
  const storeActive = useGameStore((s) => s.activePartner);
  const storePartnerA = useGameStore((s) => s.partnerA);
  const storePartnerB = useGameStore((s) => s.partnerB);

  const active = propsActive || storeActive || 'partnerA';
  const pA = propsPartnerA || storePartnerA || {
    id: 'partnerA',
    name: 'Nico',
    role: 'El Estratega',
    seed: 'partnerA-nico',
    status: 'alive',
  };
  const pB = propsPartnerB || storePartnerB || {
    id: 'partnerB',
    name: 'Camila',
    role: 'La Ejecutora',
    seed: 'partnerB-camila',
    status: 'alive',
  };

  const currentPartner = active === 'partnerA' ? pA : pB;
  const partnerAccent = active === 'partnerA' ? COLORS.aqua : COLORS.blood;

  const canSwitch = pA.status === 'alive' && pB.status === 'alive';

  return (
    <View testID={testID} style={[styles.container, style]}>
      {/* Duo Selector Pills (Visual Only) */}
      <View style={styles.selectorRow}>
        <View
          testID="partner-tag-partnerA"
          style={[
            styles.partnerPill,
            active === 'partnerA' && styles.partnerPillActiveA,
            pA.status !== 'alive' && styles.partnerPillDisabled,
          ]}
        >
          <View
            style={[
              styles.indicatorDot,
              { backgroundColor: getStatusColor(pA.status, active === 'partnerA') },
            ]}
          />
          <Text
            style={[
              styles.pillName,
              active === 'partnerA' && styles.pillNameActiveA,
              pA.status !== 'alive' && styles.pillNameDisabled,
            ]}
          >
            {pA.name}
          </Text>
          {pA.status !== 'alive' && (
            <Text style={styles.pillStatusTag}>[{getStatusLabel(pA.status)}]</Text>
          )}
        </View>

        <View
          testID="partner-tag-partnerB"
          style={[
            styles.partnerPill,
            active === 'partnerB' && styles.partnerPillActiveB,
            pB.status !== 'alive' && styles.partnerPillDisabled,
          ]}
        >
          <View
            style={[
              styles.indicatorDot,
              { backgroundColor: getStatusColor(pB.status, active === 'partnerB') },
            ]}
          />
          <Text
            style={[
              styles.pillName,
              active === 'partnerB' && styles.pillNameActiveB,
              pB.status !== 'alive' && styles.pillNameDisabled,
            ]}
          >
            {pB.name}
          </Text>
          {pB.status !== 'alive' && (
            <Text style={styles.pillStatusTag}>[{getStatusLabel(pB.status)}]</Text>
          )}
        </View>
      </View>

      {/* Active Protagonist Card Header Banner */}
      <View
        style={[
          styles.bannerWrapper,
          { borderColor: partnerAccent, shadowColor: partnerAccent },
        ]}
      >
        <View style={styles.bannerContent}>
          <Text style={styles.decisionMakerLabel}>EN CONTROL</Text>
          <Text testID="active-partner-name" style={[styles.bannerTitle, { color: partnerAccent }]}>
            {currentPartner.name}
          </Text>
          <Text testID="active-partner-role" style={styles.bannerRole}>
            {currentPartner.role}
          </Text>
        </View>

        <View
          testID="active-partner-status"
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                currentPartner.status === 'alive'
                  ? 'rgba(0, 240, 255, 0.15)'
                  : 'rgba(255, 0, 85, 0.2)',
              borderColor:
                currentPartner.status === 'alive' ? COLORS.aqua : COLORS.blood,
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              {
                color:
                  currentPartner.status === 'alive' ? COLORS.aqua : COLORS.blood,
              },
            ]}
          >
            {getStatusLabel(currentPartner.status)}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  selectorRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 6,
  },
  partnerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: 'rgba(31, 13, 61, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  partnerPillActiveA: {
    borderColor: COLORS.aqua,
    backgroundColor: 'rgba(0, 240, 255, 0.12)',
  },
  partnerPillActiveB: {
    borderColor: COLORS.blood,
    backgroundColor: 'rgba(255, 0, 85, 0.12)',
  },
  partnerPillDisabled: {
    opacity: 0.6,
    borderColor: 'rgba(255, 0, 85, 0.4)',
  },
  indicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  pillName: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  pillNameActiveA: {
    color: COLORS.aqua,
  },
  pillNameActiveB: {
    color: COLORS.blood,
  },
  pillNameDisabled: {
    color: COLORS.blood,
    textDecorationLine: 'line-through',
  },
  pillStatusTag: {
    fontSize: 9,
    color: COLORS.blood,
    marginLeft: 4,
    fontWeight: 'bold',
  },
  bannerWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 10, 26, 0.85)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  bannerContent: {
    flex: 1,
  },
  decisionMakerLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  bannerRole: {
    fontSize: 11,
    color: COLORS.paper,
    opacity: 0.8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
});

export default PartnerBadge;
