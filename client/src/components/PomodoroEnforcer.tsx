import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { pomodoroTimer, PomodoroStatus } from '../services/PomodoroTimer';

/**
 * PomodoroEnforcer Component
 * 
 * Requirements: 34.1, 34.2, 34.3, 34.4, 34.5, 34.6, 34.7, 35.1, 35.2, 35.3, 35.4, 35.5, 35.6
 * 
 * A strict 25-minute focus timer with AppState monitoring.
 * - Displays countdown in 72pt JetBrains Mono font
 * - Uses void background (#000000) during active session
 * - Awards +20 EXP on completion
 * - Deducts -5 EXP if user switches away from app
 * - Flashes screen in alert color (#FF2A42) on failure
 */
export const PomodoroEnforcer: React.FC = () => {
  const [status, setStatus] = useState<PomodoroStatus>('idle');
  const [timeDisplay, setTimeDisplay] = useState('25:00');
  const [flashOpacity] = useState(new Animated.Value(0));

  useEffect(() => {
    setupPomodoroCallbacks();
    
    // Initialize display
    updateTimeDisplay();

    return () => {
      // Cleanup if component unmounts
      pomodoroTimer.stop();
    };
  }, []);

  const setupPomodoroCallbacks = () => {
    // Update time display every second
    pomodoroTimer.onTick((remainingMs) => {
      const totalSeconds = Math.ceil(remainingMs / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      setTimeDisplay(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    });

    // Update status
    pomodoroTimer.onStatusChange((newStatus) => {
      setStatus(newStatus);
    });

    // Flash screen on failure (Requirement 35.3)
    pomodoroTimer.onFlash(() => {
      triggerFlashAnimation();
    });
  };

  const updateTimeDisplay = () => {
    const formatted = pomodoroTimer.getFormattedTime();
    setTimeDisplay(formatted);
  };

  const handleStart = () => {
    pomodoroTimer.start();
  };

  const handlePause = () => {
    pomodoroTimer.pause();
  };

  const handleResume = () => {
    pomodoroTimer.resume();
  };

  const handleStop = () => {
    pomodoroTimer.stop();
    setTimeDisplay('25:00');
  };

  /**
   * Trigger red flash animation on session failure (Requirement 35.3)
   */
  const triggerFlashAnimation = () => {
    Animated.sequence([
      Animated.timing(flashOpacity, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(flashOpacity, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(flashOpacity, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(flashOpacity, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'idle':
        return 'Ready to start';
      case 'running':
        return 'FOCUS MODE ACTIVE';
      case 'paused':
        return 'Paused';
      case 'completed':
        return 'SESSION COMPLETE! +20 EXP';
      case 'failed':
        return 'SESSION FAILED! -5 EXP';
      default:
        return '';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'running':
        return '#00E5FF'; // active color
      case 'completed':
        return '#00FF66'; // growth color
      case 'failed':
        return '#FF2A42'; // alert color
      default:
        return '#888888'; // void color
    }
  };

  return (
    <View style={styles.container}>
      {/* Flash overlay for failure (Requirement 35.3) */}
      <Animated.View
        style={[
          styles.flashOverlay,
          {
            opacity: flashOpacity,
          },
        ]}
        pointerEvents="none"
      />

      <View style={styles.content}>
        {/* Timer Display (Requirements 34.1, 34.2) */}
        <Text style={styles.timerDisplay}>{timeDisplay}</Text>

        {/* Status Message (Requirements 34.6, 35.5) */}
        <Text style={[styles.statusText, { color: getStatusColor() }]}>
          {getStatusMessage()}
        </Text>

        {/* Control Buttons (Requirements 34.4, 34.5, 34.7) */}
        <View style={styles.buttonContainer}>
          {status === 'idle' && (
            <TouchableOpacity style={[styles.button, styles.startButton]} onPress={handleStart}>
              <Text style={styles.buttonText}>START</Text>
            </TouchableOpacity>
          )}

          {status === 'running' && (
            <>
              <TouchableOpacity style={[styles.button, styles.pauseButton]} onPress={handlePause}>
                <Text style={styles.buttonText}>PAUSE</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.stopButton]} onPress={handleStop}>
                <Text style={styles.buttonText}>STOP</Text>
              </TouchableOpacity>
            </>
          )}

          {status === 'paused' && (
            <>
              <TouchableOpacity style={[styles.button, styles.startButton]} onPress={handleResume}>
                <Text style={styles.buttonText}>RESUME</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.stopButton]} onPress={handleStop}>
                <Text style={styles.buttonText}>STOP</Text>
              </TouchableOpacity>
            </>
          )}

          {(status === 'completed' || status === 'failed') && (
            <TouchableOpacity style={[styles.button, styles.startButton]} onPress={handleStart}>
              <Text style={styles.buttonText}>START NEW SESSION</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Info Text (Requirements 35.1, 35.2) */}
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            25-minute deep focus session
          </Text>
          <Text style={styles.warningText}>
            ⚠️ Switching away from the app will immediately fail the session and deduct 5 EXP
          </Text>
          <Text style={styles.infoText}>
            Complete the session to earn 20 EXP
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // void background (Requirement 34.3)
  },
  flashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FF2A42', // alert color (Requirement 35.3)
    zIndex: 1000,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  timerDisplay: {
    fontSize: 72, // 72pt font (Requirement 34.2)
    fontFamily: 'monospace', // JetBrains Mono equivalent (Requirement 34.2)
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 40,
    letterSpacing: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 60,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 60,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 24,
    minWidth: 120,
    alignItems: 'center',
    borderWidth: 1,
  },
  startButton: {
    backgroundColor: '#00FF66', // growth color
    borderColor: '#00FF66',
  },
  pauseButton: {
    backgroundColor: '#FFB800', // caution color
    borderColor: '#FFB800',
  },
  stopButton: {
    backgroundColor: '#FF2A42', // alert color
    borderColor: '#FF2A42',
  },
  buttonText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  infoContainer: {
    gap: 12,
    paddingHorizontal: 40,
  },
  infoText: {
    fontSize: 11,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 16,
  },
  warningText: {
    fontSize: 11,
    color: '#FF2A42', // alert color
    textAlign: 'center',
    lineHeight: 16,
    fontWeight: '700',
  },
});
