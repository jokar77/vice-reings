import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const isHapticsAvailable = Platform.OS === 'ios' || Platform.OS === 'android';

/**
 * Triggers light haptic feedback when card dragging begins or crosses minor thresholds.
 */
export const triggerCardDragHaptic = async (): Promise<void> => {
  if (!isHapticsAvailable) return;
  try {
    await Haptics.selectionAsync();
  } catch {
    // Graceful fallback on unsupported platforms or simulators
  }
};

/**
 * Triggers medium impact / success haptic feedback when a card choice is committed.
 */
export const triggerChoiceCommitHaptic = async (): Promise<void> => {
  if (!isHapticsAvailable) return;
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch {
    // Fallback
  }
};

/**
 * Triggers warning haptic feedback when any stat reaches dangerous territory (<=14 or >=86).
 */
export const triggerDangerHaptic = async (): Promise<void> => {
  if (!isHapticsAvailable) return;
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } catch {
    // Fallback
  }
};

/**
 * Triggers error / heavy haptic feedback when a partner falls or game over occurs.
 */
export const triggerPartnerDemiseHaptic = async (): Promise<void> => {
  if (!isHapticsAvailable) return;
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } catch {
    // Fallback
  }
};

/**
 * Helper aliases for general haptic triggers
 */
export const triggerSelectionHaptic = triggerCardDragHaptic;

export const triggerImpactLightHaptic = async (): Promise<void> => {
  if (!isHapticsAvailable) return;
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {}
};

export const triggerImpactMediumHaptic = async (): Promise<void> => {
  if (!isHapticsAvailable) return;
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch {}
};

export const triggerImpactHeavyHaptic = async (): Promise<void> => {
  if (!isHapticsAvailable) return;
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  } catch {}
};

export const triggerSuccessHaptic = async (): Promise<void> => {
  if (!isHapticsAvailable) return;
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {}
};

export const triggerWarningHaptic = triggerDangerHaptic;
export const triggerErrorHaptic = triggerPartnerDemiseHaptic;
