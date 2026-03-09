import * as Haptics from 'expo-haptics';
import { AnimationController as IAnimationController } from '../types';

class AnimationControllerImpl implements IAnimationController {
  playTaskCompletionAnimation(): void {
    // This will be triggered via React Native Reanimated in components
    console.log('Task completion animation triggered');
  }

  playEXPBarFillAnimation(amount: number): void {
    // This will be triggered via React Native Reanimated in EXPTracker component
    console.log(`EXP bar fill animation triggered for ${amount} EXP`);
  }

  playSkillUnlockAnimation(): void {
    // This will be triggered via React Native Reanimated in SkillTree component
    console.log('Skill unlock animation triggered');
  }

  playRankUpAnimation(newRank: string): void {
    // This will be triggered via React Native Reanimated in EXPTracker component
    console.log(`Rank-up animation triggered for new rank: ${newRank}`);
    // Trigger haptic feedback for rank-up
    this.triggerHapticFeedback();
  }

  triggerHapticFeedback(): void {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.warn('Haptic feedback not available:', error);
    }
  }
}

export const animationController = new AnimationControllerImpl();
