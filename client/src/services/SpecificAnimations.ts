/**
 * Specific Animation Implementations
 * 
 * Requirements: 6.4, 71.3
 * 
 * Animations:
 * - Task completion animation (cascade reveal)
 * - EXP bar fill animation with 60fps target
 * - Skill unlock animation
 * - Level-up animation
 * - Rank-up animation
 * - Critical State border pulse (1 Hz)
 */

import { Animated, Easing } from 'react-native';
import { animationController } from './AnimationController';

/**
 * Task Completion Animation (Cascade Reveal)
 * Requirement 6.4: Task completion animation (cascade reveal)
 */
export const playTaskCompletionAnimation = async (
  animatedValue: Animated.Value
): Promise<void> => {
  const animation = Animated.sequence([
    // Scale up
    Animated.timing(animatedValue, {
      toValue: 1.2,
      duration: 150,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }),
    // Scale back to normal
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 150,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }),
  ]);

  await animationController.startAnimation('task-completion', animation);
};

/**
 * EXP Bar Fill Animation
 * Requirement 6.4: EXP bar fill animation with 60fps target
 */
export const playEXPBarFillAnimation = async (
  animatedValue: Animated.Value,
  toValue: number,
  duration: number = 800
): Promise<void> => {
  const animation = Animated.timing(animatedValue, {
    toValue,
    duration,
    easing: Easing.out(Easing.cubic),
    useNativeDriver: false, // Width animation requires layout driver
  });

  await animationController.startAnimation('exp-bar-fill', animation);
};

/**
 * Skill Unlock Animation
 * Requirement 6.4: Skill unlock animation
 */
export const playSkillUnlockAnimation = async (
  scaleValue: Animated.Value,
  opacityValue: Animated.Value
): Promise<void> => {
  // Reset values
  scaleValue.setValue(0);
  opacityValue.setValue(0);

  const animation = Animated.parallel([
    // Scale animation
    Animated.spring(scaleValue, {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }),
    // Fade in animation
    Animated.timing(opacityValue, {
      toValue: 1,
      duration: 400,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }),
  ]);

  await animationController.startAnimation('skill-unlock', animation);
};

/**
 * Level-Up Animation
 * Requirement 6.4: Level-up animation
 */
export const playLevelUpAnimation = async (
  scaleValue: Animated.Value,
  rotateValue: Animated.Value
): Promise<void> => {
  // Reset values
  scaleValue.setValue(1);
  rotateValue.setValue(0);

  const animation = Animated.parallel([
    // Pulse scale animation
    Animated.sequence([
      Animated.timing(scaleValue, {
        toValue: 1.3,
        duration: 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(scaleValue, {
        toValue: 1,
        duration: 200,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
    ]),
    // Rotate animation
    Animated.timing(rotateValue, {
      toValue: 1,
      duration: 400,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }),
  ]);

  await animationController.startAnimation('level-up', animation);
};

/**
 * Rank-Up Animation
 * Requirement 6.4: Rank-up animation
 */
export const playRankUpAnimation = async (
  scaleValue: Animated.Value,
  opacityValue: Animated.Value,
  translateYValue: Animated.Value
): Promise<void> => {
  // Reset values
  scaleValue.setValue(0.5);
  opacityValue.setValue(0);
  translateYValue.setValue(50);

  const animation = Animated.parallel([
    // Scale animation
    Animated.spring(scaleValue, {
      toValue: 1,
      friction: 6,
      tension: 40,
      useNativeDriver: true,
    }),
    // Fade in animation
    Animated.timing(opacityValue, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }),
    // Slide up animation
    Animated.timing(translateYValue, {
      toValue: 0,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }),
  ]);

  await animationController.startAnimation('rank-up', animation);
};

/**
 * Critical State Border Pulse Animation
 * Requirement 71.3: Critical State border pulse (1 Hz)
 */
export const startCriticalStatePulse = (
  opacityValue: Animated.Value
): Animated.CompositeAnimation => {
  const animation = animationController.createPulseAnimation(
    opacityValue,
    0.3, // Min opacity
    1.0, // Max opacity
    1000 // 1 Hz = 1000ms
  );

  animation.start();
  return animation;
};

/**
 * Stop Critical State Border Pulse Animation
 */
export const stopCriticalStatePulse = (
  animation: Animated.CompositeAnimation
): void => {
  animation.stop();
};

/**
 * Cascade Reveal Animation for Multiple Elements
 * Requirement 6.4: Task completion animation (cascade reveal)
 */
export const playCascadeRevealAnimation = async (
  elements: Animated.Value[],
  staggerDelay: number = 100
): Promise<void> => {
  // Reset all values
  elements.forEach((value) => value.setValue(0));

  const animation = animationController.createCascadeAnimation(
    elements,
    staggerDelay
  );

  await animationController.startAnimation('cascade-reveal', animation);
};

/**
 * EXP Pulse Effect (for EXP gain)
 * Requirement 6.4: EXP bar fill animation with 60fps target
 */
export const playEXPPulseAnimation = async (
  scaleValue: Animated.Value,
  opacityValue: Animated.Value
): Promise<void> => {
  // Reset values
  scaleValue.setValue(1);
  opacityValue.setValue(1);

  const animation = Animated.parallel([
    // Scale pulse
    Animated.sequence([
      Animated.timing(scaleValue, {
        toValue: 1.15,
        duration: 150,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(scaleValue, {
        toValue: 1,
        duration: 150,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
    ]),
    // Opacity pulse
    Animated.sequence([
      Animated.timing(opacityValue, {
        toValue: 0.7,
        duration: 150,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(opacityValue, {
        toValue: 1,
        duration: 150,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
    ]),
  ]);

  await animationController.startAnimation('exp-pulse', animation);
};

/**
 * Fade In Animation
 */
export const playFadeInAnimation = async (
  opacityValue: Animated.Value,
  duration: number = 300
): Promise<void> => {
  opacityValue.setValue(0);

  const animation = Animated.timing(opacityValue, {
    toValue: 1,
    duration,
    easing: Easing.out(Easing.ease),
    useNativeDriver: true,
  });

  await animationController.startAnimation('fade-in', animation);
};

/**
 * Fade Out Animation
 */
export const playFadeOutAnimation = async (
  opacityValue: Animated.Value,
  duration: number = 300
): Promise<void> => {
  const animation = Animated.timing(opacityValue, {
    toValue: 0,
    duration,
    easing: Easing.in(Easing.ease),
    useNativeDriver: true,
  });

  await animationController.startAnimation('fade-out', animation);
};

/**
 * Slide In From Bottom Animation
 */
export const playSlideInFromBottomAnimation = async (
  translateYValue: Animated.Value,
  opacityValue: Animated.Value,
  distance: number = 100
): Promise<void> => {
  // Reset values
  translateYValue.setValue(distance);
  opacityValue.setValue(0);

  const animation = Animated.parallel([
    Animated.timing(translateYValue, {
      toValue: 0,
      duration: 400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }),
    Animated.timing(opacityValue, {
      toValue: 1,
      duration: 400,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }),
  ]);

  await animationController.startAnimation('slide-in-bottom', animation);
};
