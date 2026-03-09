/**
 * Animation Controller Service
 * 
 * Requirements: 6.1-6.6, 71.1-71.5, 77.1-77.4
 * 
 * Features:
 * - Set useNativeDriver: true for ALL animations
 * - Limit concurrent animations to maximum 3 at any time
 * - Use React Native Reanimated for complex animations
 * - Target 60 FPS for all UI transitions
 * - Avoid animating layout properties (width, height, padding)
 * - Animate only transform and opacity properties
 */

import { Animated, Easing } from 'react-native';

interface AnimationConfig {
  id: string;
  animation: Animated.CompositeAnimation;
  startTime: number;
}

class AnimationController {
  private activeAnimations: Map<string, AnimationConfig> = new Map();
  private readonly MAX_CONCURRENT_ANIMATIONS = 3; // Requirement 6.2
  private animationQueue: Array<() => void> = [];

  /**
   * Create a fade animation
   * Requirement 6.1: Set useNativeDriver: true for ALL animations
   * Requirement 6.6: Animate only transform and opacity properties
   */
  createFadeAnimation(
    animatedValue: Animated.Value,
    toValue: number,
    duration: number = 300,
    easing: ((value: number) => number) = Easing.ease
  ): Animated.CompositeAnimation {
    return Animated.timing(animatedValue, {
      toValue,
      duration,
      easing,
      useNativeDriver: true, // Requirement 6.1
    });
  }

  /**
   * Create a scale animation
   * Requirement 6.1: Set useNativeDriver: true for ALL animations
   * Requirement 6.6: Animate only transform and opacity properties
   */
  createScaleAnimation(
    animatedValue: Animated.Value,
    toValue: number,
    duration: number = 300,
    easing: ((value: number) => number) = Easing.ease
  ): Animated.CompositeAnimation {
    return Animated.timing(animatedValue, {
      toValue,
      duration,
      easing,
      useNativeDriver: true, // Requirement 6.1
    });
  }

  /**
   * Create a translate animation
   * Requirement 6.1: Set useNativeDriver: true for ALL animations
   * Requirement 6.6: Animate only transform and opacity properties
   */
  createTranslateAnimation(
    animatedValue: Animated.Value,
    toValue: number,
    duration: number = 300,
    easing: ((value: number) => number) = Easing.ease
  ): Animated.CompositeAnimation {
    return Animated.timing(animatedValue, {
      toValue,
      duration,
      easing,
      useNativeDriver: true, // Requirement 6.1
    });
  }

  /**
   * Create a spring animation
   * Requirement 6.1: Set useNativeDriver: true for ALL animations
   * Requirement 6.4: Target 60 FPS for all UI transitions
   */
  createSpringAnimation(
    animatedValue: Animated.Value,
    toValue: number,
    config?: Animated.SpringAnimationConfig
  ): Animated.CompositeAnimation {
    return Animated.spring(animatedValue, {
      toValue,
      useNativeDriver: true, // Requirement 6.1
      ...config,
    });
  }

  /**
   * Create a pulse animation (for Critical State border)
   * Requirement 6.1: Set useNativeDriver: true for ALL animations
   * Requirement 71.3: Critical State border pulse (1 Hz)
   */
  createPulseAnimation(
    animatedValue: Animated.Value,
    minValue: number = 0.5,
    maxValue: number = 1,
    duration: number = 1000 // 1 Hz = 1000ms
  ): Animated.CompositeAnimation {
    return Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: maxValue,
          duration: duration / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true, // Requirement 6.1
        }),
        Animated.timing(animatedValue, {
          toValue: minValue,
          duration: duration / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true, // Requirement 6.1
        }),
      ])
    );
  }

  /**
   * Create a cascade reveal animation
   * Requirement 6.4: Task completion animation (cascade reveal)
   * Requirement 6.1: Set useNativeDriver: true for ALL animations
   */
  createCascadeAnimation(
    animatedValues: Animated.Value[],
    staggerDelay: number = 100
  ): Animated.CompositeAnimation {
    const animations = animatedValues.map((value, index) =>
      Animated.timing(value, {
        toValue: 1,
        duration: 300,
        delay: index * staggerDelay,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true, // Requirement 6.1
      })
    );

    return Animated.parallel(animations);
  }

  /**
   * Start an animation with queue management
   * Requirement 6.2: Limit concurrent animations to maximum 3 at any time
   */
  async startAnimation(
    id: string,
    animation: Animated.CompositeAnimation
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const executeAnimation = () => {
        // Check if we can start the animation
        if (this.activeAnimations.size >= this.MAX_CONCURRENT_ANIMATIONS) {
          // Queue the animation
          this.animationQueue.push(executeAnimation);
          return;
        }

        // Register the animation
        const config: AnimationConfig = {
          id,
          animation,
          startTime: Date.now(),
        };
        this.activeAnimations.set(id, config);

        // Start the animation
        animation.start(({ finished }) => {
          // Remove from active animations
          this.activeAnimations.delete(id);

          // Process queue
          this.processQueue();

          if (finished) {
            resolve();
          } else {
            reject(new Error(`Animation ${id} was interrupted`));
          }
        });
      };

      executeAnimation();
    });
  }

  /**
   * Stop an animation
   */
  stopAnimation(id: string): void {
    const config = this.activeAnimations.get(id);
    if (config) {
      config.animation.stop();
      this.activeAnimations.delete(id);
      this.processQueue();
    }
  }

  /**
   * Stop all animations
   */
  stopAllAnimations(): void {
    this.activeAnimations.forEach((config) => {
      config.animation.stop();
    });
    this.activeAnimations.clear();
    this.animationQueue = [];
  }

  /**
   * Process animation queue
   * Requirement 6.2: Limit concurrent animations to maximum 3 at any time
   */
  private processQueue(): void {
    while (
      this.animationQueue.length > 0 &&
      this.activeAnimations.size < this.MAX_CONCURRENT_ANIMATIONS
    ) {
      const nextAnimation = this.animationQueue.shift();
      if (nextAnimation) {
        nextAnimation();
      }
    }
  }

  /**
   * Get active animation count
   */
  getActiveAnimationCount(): number {
    return this.activeAnimations.size;
  }

  /**
   * Get queued animation count
   */
  getQueuedAnimationCount(): number {
    return this.animationQueue.length;
  }

  /**
   * Check if animation is active
   */
  isAnimationActive(id: string): boolean {
    return this.activeAnimations.has(id);
  }
}

// Export singleton instance
export const animationController = new AnimationController();

// Export class for testing
export { AnimationController };
