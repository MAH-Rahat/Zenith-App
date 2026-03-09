/**
 * CriticalStateOverlay.tsx
 * 
 * Full-screen overlay displayed when HP reaches 0 (Critical State).
 * Shows warning message, pulses border in alert color, and requires user acknowledgment.
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.8
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Modal,
  Dimensions,
} from 'react-native';
import { hpSystem } from '../services/HPSystem';

interface CriticalStateOverlayProps {
  visible: boolean;
  onAcknowledge: () => void;
}

export const CriticalStateOverlay: React.FC<CriticalStateOverlayProps> = ({
  visible,
  onAcknowledge,
}) => {
  // Animated value for border pulse (1 Hz = 1 second cycle)
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Start border pulse animation at 1 Hz
      // Requirement 11.3: Pulse UI border in alert color at 1 Hz
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500, // 0.5 seconds to full opacity
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 500, // 0.5 seconds back to transparent
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(0);
    }
  }, [visible, pulseAnim]);

  const handleAcknowledge = async () => {
    try {
      // Reset HP to 100
      // Requirement 11.6: Reset HP to 100
      await hpSystem.resetHP();
      
      // Call parent callback to dismiss overlay
      // Requirement 11.8: Dismiss overlay and resume normal operation
      onAcknowledge();
    } catch (error) {
      console.error('Failed to acknowledge Critical State:', error);
    }
  };

  // Interpolate pulse animation for border opacity
  const borderOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.container}>
        {/* Pulsing border overlay */}
        <Animated.View
          style={[
            styles.borderOverlay,
            {
              opacity: borderOpacity,
            },
          ]}
        />

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.title}>CRITICAL STATE</Text>
          
          <Text style={styles.subtitle}>HP DEPLETED</Text>
          
          <View style={styles.messageContainer}>
            <Text style={styles.message}>
              Your health points have reached zero due to prolonged inactivity.
            </Text>
            
            <Text style={styles.consequence}>
              CONSEQUENCES:
            </Text>
            
            <Text style={styles.consequenceItem}>
              • Rank reset to Script Novice
            </Text>
            <Text style={styles.consequenceItem}>
              • Level reset to 0
            </Text>
            <Text style={styles.consequenceItem}>
              • Total EXP reset to 0
            </Text>
            <Text style={styles.consequenceItem}>
              • Contribution grid shattered
            </Text>
            
            <Text style={styles.warning}>
              Stay active to avoid future Critical States.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.acknowledgeButton}
            onPress={handleAcknowledge}
            activeOpacity={0.8}
          >
            <Text style={styles.acknowledgeButtonText}>
              ACKNOWLEDGE & RESET
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // void color
    justifyContent: 'center',
    alignItems: 'center',
  },
  borderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 8,
    borderColor: '#FF2A42', // alert color
    pointerEvents: 'none',
  },
  content: {
    width: width * 0.85,
    maxWidth: 400,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FF2A42', // alert color
    letterSpacing: 2,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF2A42', // alert color
    letterSpacing: 4,
    marginBottom: 40,
    textAlign: 'center',
  },
  messageContainer: {
    width: '100%',
    marginBottom: 40,
  },
  message: {
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 32,
  },
  consequence: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFB800', // caution color
    letterSpacing: 2,
    marginBottom: 16,
    textAlign: 'center',
  },
  consequenceItem: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 24,
    marginBottom: 8,
    textAlign: 'center',
  },
  warning: {
    fontSize: 14,
    color: '#FFB800', // caution color
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 24,
    fontStyle: 'italic',
  },
  acknowledgeButton: {
    backgroundColor: '#FF2A42', // alert color
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  acknowledgeButtonText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 1.5,
  },
});
