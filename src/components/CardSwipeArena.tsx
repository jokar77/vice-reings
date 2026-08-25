import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withRepeat,
  interpolate,
  Extrapolation,
  runOnJS,
  cancelAnimation,
} from 'react-native-reanimated';
import { useEffect, useRef } from 'react';
import { GameCard } from '../types/game';
import { getCharacter } from '../constants/characters';
import { COLORS } from '../constants/theme';
import { useGameStore } from '../store/gameStore';
import { PortraitSvg } from './PortraitSvg';
import {
  triggerCardDragHaptic,
  triggerChoiceCommitHaptic,
} from '../utils/audioHaptics';

export const SWIPE_THRESHOLD = 76;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = Math.min(SCREEN_WIDTH - 32, 360);

export interface CardSwipeArenaProps {
  currentCard?: GameCard | null;
  nextCard?: GameCard | null;
  onChoice?: (direction: 'left' | 'right') => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const CardSwipeArena: React.FC<CardSwipeArenaProps> = ({
  currentCard: propsCard,
  nextCard: propsNextCard,
  onChoice,
  style,
  testID = 'card-swipe-arena',
}) => {
  const storeCard = useGameStore((s) => s.currentCard);
  const storeMakeChoice = useGameStore((s) => s.makeChoice);

  const card = propsCard !== undefined ? propsCard : storeCard;
  const dispatchChoice = onChoice || storeMakeChoice;

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const idleRotate = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const idleTimer = useRef<NodeJS.Timeout | null>(null);

  const resetIdleTimer = () => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    cancelAnimation(idleRotate);
    idleRotate.value = 0;

    idleTimer.current = setTimeout(() => {
      // Balanceo leve si no se toca en 15 segundos
      idleRotate.value = withRepeat(
        withSequence(
          withTiming(2, { duration: 300 }),
          withTiming(-2, { duration: 600 }),
          withTiming(0, { duration: 300 })
        ),
        -1, // infinito
        true
      );
    }, 15000);
  };

  useEffect(() => {
    resetIdleTimer();
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [card?.id]); // reset on new card

  const executeChoice = (direction: 'left' | 'right') => {
    triggerChoiceCommitHaptic();
    dispatchChoice(direction);
  };

  const handleChoiceCommit = (direction: 'left' | 'right') => {
    executeChoice(direction);
    translateX.value = 0;
    translateY.value = 0;
    resetIdleTimer();
  };

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      isDragging.value = true;
      runOnJS(resetIdleTimer)();
      runOnJS(triggerCardDragHaptic)();
    })
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY * 0.25;
    })
    .onEnd(() => {
      isDragging.value = false;
      if (translateX.value > SWIPE_THRESHOLD) {
        runOnJS(handleChoiceCommit)('right');
      } else if (translateX.value < -SWIPE_THRESHOLD) {
        runOnJS(handleChoiceCommit)('left');
      } else {
        translateX.value = withSpring(0, { damping: 15, stiffness: 120 });
        translateY.value = withSpring(0, { damping: 15, stiffness: 120 });
      }
    });

  const animatedCardStyle = useAnimatedStyle(() => {
    const swipeRotate = interpolate(
      translateX.value,
      [-SCREEN_WIDTH * 0.7, 0, SCREEN_WIDTH * 0.7],
      [-14, 0, 14],
      Extrapolation.CLAMP
    );

    const finalRotate = swipeRotate + idleRotate.value;

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${finalRotate}deg` },
      ],
    };
  });

  const animatedLeftBadgeStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [-120, -30, 0],
      [1, 0.4, 0],
      Extrapolation.CLAMP
    );
    const scale = interpolate(
      translateX.value,
      [-120, 0],
      [1.05, 0.85],
      Extrapolation.CLAMP
    );
    return {
      opacity,
      transform: [{ scale }],
    };
  });

  const animatedRightBadgeStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [0, 30, 120],
      [0, 0.4, 1],
      Extrapolation.CLAMP
    );
    const scale = interpolate(
      translateX.value,
      [0, 120],
      [0.85, 1.05],
      Extrapolation.CLAMP
    );
    return {
      opacity,
      transform: [{ scale }],
    };
  });

  if (!card) {
    return (
      <View testID={testID} style={[styles.container, styles.emptyContainer, style]}>
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>VICE SHORES</Text>
          <Text style={styles.emptySubtitle}>El imperio aguarda...</Text>
        </View>
      </View>
    );
  }

  const charDef = getCharacter(card.w);
  const nextCharDef = propsNextCard ? getCharacter(propsNextCard.w) : null;

  return (
    <View testID={testID} style={[styles.container, style]}>
      {/* Card Stack Container */}
      <View style={styles.stackWrapper}>
        {/* Next Card Preview (Underneath) */}
        <View testID="swipe-card-preview" style={styles.previewCard}>
          <View style={styles.previewContent}>
            {nextCharDef ? (
              <PortraitSvg
                seed={nextCharDef.seed}
                width="100%"
                height={160}
              />
            ) : (
              <View style={styles.previewPlaceholder} />
            )}
          </View>
        </View>

        {/* Active Front Card with Pan Gesture */}
        <GestureDetector gesture={panGesture}>
          <Animated.View
            testID="swipe-card-active"
            style={[styles.card, animatedCardStyle]}
          >
            {/* Left Choice Drag Badge (Red / Warning) */}
            <Animated.View
              testID="choice-badge-left"
              pointerEvents="none"
              style={[styles.choiceBadge, styles.choiceBadgeLeft, animatedLeftBadgeStyle]}
            >
              <Text style={styles.choiceBadgeTextLeft}>{card.l.t}</Text>
            </Animated.View>

            {/* Right Choice Drag Badge (Aqua / Acceptance) */}
            <Animated.View
              testID="choice-badge-right"
              pointerEvents="none"
              style={[styles.choiceBadge, styles.choiceBadgeRight, animatedRightBadgeStyle]}
            >
              <Text style={styles.choiceBadgeTextRight}>{card.r.t}</Text>
            </Animated.View>

            {/* Character Portrait Header */}
            <View style={styles.portraitWrapper}>
              <PortraitSvg
                testID="character-portrait"
                seed={charDef.seed}
                width="100%"
                height={190}
              />
              <View style={styles.portraitOverlay}>
                <Text testID="character-name" style={styles.charName}>
                  {charDef.name}
                </Text>
                <Text testID="character-role" style={styles.charRole}>
                  {charDef.role}
                </Text>
              </View>
            </View>

            {/* Narrative Dialogue Body */}
            <View style={styles.dialogueContainer}>
              <Text testID="card-dialogue-text" style={styles.dialogueText}>
                {card.t}
              </Text>
            </View>
          </Animated.View>
        </GestureDetector>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  emptyContainer: {
    justifyContent: 'center',
  },
  emptyCard: {
    width: CARD_WIDTH,
    height: 380,
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.line,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.amber,
    letterSpacing: 2,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  stackWrapper: {
    width: CARD_WIDTH,
    height: 390,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewCard: {
    position: 'absolute',
    width: CARD_WIDTH - 16,
    height: 375,
    borderRadius: 16,
    backgroundColor: '#0F071D',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    top: 10,
    zIndex: 1,
    overflow: 'hidden',
    opacity: 0.65,
    transform: [{ scale: 0.95 }],
  },
  previewContent: {
    flex: 1,
    opacity: 0.4,
  },
  previewPlaceholder: {
    flex: 1,
    backgroundColor: '#120A24',
  },
  card: {
    width: CARD_WIDTH,
    height: 380,
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.petrol3,
    zIndex: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
    position: 'relative',
  },
  choiceBadge: {
    position: 'absolute',
    top: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 2,
    zIndex: 30,
    maxWidth: '75%',
  },
  choiceBadgeLeft: {
    right: 16,
    borderColor: COLORS.blood,
    backgroundColor: 'rgba(255, 0, 85, 0.9)',
    transform: [{ rotate: '12deg' }],
  },
  choiceBadgeRight: {
    left: 16,
    borderColor: COLORS.aqua,
    backgroundColor: 'rgba(0, 240, 255, 0.9)',
    transform: [{ rotate: '-12deg' }],
  },
  choiceBadgeTextLeft: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  choiceBadgeTextRight: {
    color: COLORS.ink,
    fontWeight: '900',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  portraitWrapper: {
    width: '100%',
    height: 190,
    position: 'relative',
    backgroundColor: COLORS.petrol,
  },
  portraitOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(10, 10, 26, 0.85)',
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
  },
  charName: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.amber,
    letterSpacing: 0.5,
  },
  charRole: {
    fontSize: 12,
    color: COLORS.paper,
    opacity: 0.85,
  },
  dialogueContainer: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 7, 29, 0.95)',
  },
  dialogueText: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.paper,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  buttonsRow: {
    flexDirection: 'row',
    width: CARD_WIDTH,
    gap: 10,
    marginTop: 16,
  },
  choiceButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(21, 10, 42, 0.9)',
    minHeight: 60,
  },
  choiceButtonLeft: {
    borderColor: 'rgba(255, 0, 85, 0.7)',
  },
  choiceButtonRight: {
    borderColor: 'rgba(0, 240, 255, 0.7)',
  },
  buttonDirectionTag: {
    fontSize: 9,
    fontWeight: '900',
    color: COLORS.textMuted,
    letterSpacing: 1,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  buttonTextLeft: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.blood,
    textAlign: 'center',
  },
  buttonTextRight: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.aqua,
    textAlign: 'center',
  },
});

export default CardSwipeArena;
