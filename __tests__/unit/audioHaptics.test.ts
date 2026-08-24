import * as Haptics from 'expo-haptics';
import {
  triggerCardDragHaptic,
  triggerChoiceCommitHaptic,
  triggerDangerHaptic,
  triggerPartnerDemiseHaptic,
  triggerImpactLightHaptic,
  triggerImpactMediumHaptic,
  triggerImpactHeavyHaptic,
  triggerSuccessHaptic,
  triggerWarningHaptic,
  triggerErrorHaptic,
} from '@/utils/audioHaptics';

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn().mockResolvedValue(undefined),
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

describe('audioHaptics - Haptic Trigger Utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('triggers selection haptic for card drag', async () => {
    await triggerCardDragHaptic();
    expect(Haptics.selectionAsync).toHaveBeenCalled();
  });

  it('triggers medium impact for choice commit', async () => {
    await triggerChoiceCommitHaptic();
    expect(Haptics.impactAsync).toHaveBeenCalledWith('medium');
  });

  it('triggers warning notification for danger state', async () => {
    await triggerDangerHaptic();
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('warning');
  });

  it('triggers error notification for partner demise', async () => {
    await triggerPartnerDemiseHaptic();
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('error');
  });

  it('executes impact and notification helper aliases without crashing', async () => {
    await triggerImpactLightHaptic();
    await triggerImpactMediumHaptic();
    await triggerImpactHeavyHaptic();
    await triggerSuccessHaptic();
    await triggerWarningHaptic();
    await triggerErrorHaptic();

    expect(Haptics.impactAsync).toHaveBeenCalledWith('light');
    expect(Haptics.impactAsync).toHaveBeenCalledWith('heavy');
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
  });
});
