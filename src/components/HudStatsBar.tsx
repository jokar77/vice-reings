import React, { useEffect } from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import { EmpireStats, StatKey } from '../types/game';
import {
  COLORS,
  GAME_STATS,
  StatConfig,
  LOW_DANGER_THRESHOLD,
  HIGH_DANGER_THRESHOLD,
} from '../constants/theme';
import { useGameStore } from '../store/gameStore';

export interface HudStatsBarProps {
  stats?: EmpireStats;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const isStatInDanger = (val: number): boolean => {
  return val <= LOW_DANGER_THRESHOLD || val >= HIGH_DANGER_THRESHOLD;
};

const StatGauge: React.FC<{
  stat: StatConfig;
  value: number;
}> = ({ stat, value }) => {
  const clampedVal = Math.max(0, Math.min(100, Math.round(value)));
  const inDanger = isStatInDanger(clampedVal);
  const pulseAnim = useSharedValue(1);

  useEffect(() => {
    if (inDanger) {
      pulseAnim.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 400 }),
          withTiming(1.0, { duration: 400 })
        ),
        -1,
        true
      );
    } else {
      cancelAnimation(pulseAnim);
      pulseAnim.value = 1;
    }
    return () => {
      cancelAnimation(pulseAnim);
    };
  }, [inDanger, pulseAnim]);

  const animatedDangerStyle = useAnimatedStyle(() => {
    return {
      opacity: inDanger ? pulseAnim.value : 1,
    };
  });

  return (
    <View
      testID={`stat-gauge-${stat.key}`}
      accessibilityLabel={`${stat.name}: ${clampedVal}%${inDanger ? ' (PELIGRO)' : ''}`}
      style={[
        styles.gaugeContainer,
        inDanger && styles.gaugeContainerDanger,
      ]}
    >
      {/* Icon & Label Header */}
      <View style={styles.gaugeHeader}>
        <View style={styles.iconWrapper}>
          <Svg width={14} height={14} viewBox="0 0 16 16">
            <Path
              d={stat.svgPath}
              fill={stat.svgStroke ? 'none' : stat.color}
              stroke={stat.color}
              strokeWidth={stat.svgStroke ? 2 : 1}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </View>
        <Text style={styles.statLabel}>{stat.name}</Text>
        <Text
          testID={`stat-val-${stat.key}`}
          style={[styles.statValue, { color: stat.color }]}
        >
          {clampedVal}
        </Text>
      </View>

      {/* Progress Track */}
      <View style={styles.trackBackground}>
        <View
          testID={`stat-bar-${stat.key}`}
          style={[
            styles.trackFill,
            {
              width: `${clampedVal}%`,
              backgroundColor: inDanger ? COLORS.blood : stat.color,
            },
          ]}
        />
      </View>

      {/* Danger Pulsing Indicator */}
      {inDanger && (
        <Animated.View
          testID={`stat-danger-${stat.key}`}
          style={[styles.dangerBadge, animatedDangerStyle]}
        >
          <Text style={styles.dangerText}>!</Text>
        </Animated.View>
      )}
    </View>
  );
};

export const HudStatsBar: React.FC<HudStatsBarProps> = ({
  stats: propsStats,
  style,
  testID = 'hud-stats-bar',
}) => {
  const storeStats = useGameStore((s) => s.stats);
  const activeStats = propsStats || storeStats || {
    dinero: 50,
    policia: 30,
    estres: 35,
    respeto: 40,
  };

  return (
    <View testID={testID} style={[styles.container, style]}>
      {GAME_STATS.map((stat) => (
        <StatGauge
          key={stat.key}
          stat={stat}
          value={activeStats[stat.key as StatKey] ?? stat.initialValue}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.petrol,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
    shadowColor: COLORS.aqua,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  gaugeContainer: {
    flex: 1,
    marginHorizontal: 3,
    backgroundColor: 'rgba(10, 10, 26, 0.65)',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    position: 'relative',
  },
  gaugeContainerDanger: {
    borderColor: COLORS.blood,
    backgroundColor: 'rgba(255, 0, 85, 0.15)',
  },
  gaugeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  iconWrapper: {
    width: 14,
    height: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 2,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
    marginLeft: 2,
  },
  statValue: {
    fontSize: 10,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
  trackBackground: {
    height: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 3,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  trackFill: {
    height: '100%',
    borderRadius: 3,
  },
  dangerBadge: {
    position: 'absolute',
    top: -5,
    right: -4,
    backgroundColor: COLORS.blood,
    width: 12,
    height: 12,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  dangerText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
    lineHeight: 9,
  },
});

export default HudStatsBar;
