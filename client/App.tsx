import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, ActivityIndicator, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { BottomTabNavigator } from './src/navigation/BottomTabNavigator';
import { sentinelSystem } from './src/services/SentinelSystem';
import { gameRulesManager } from './src/services/GameRulesManager';
import { backgroundTaskService } from './src/services/BackgroundTaskService';
import { transitModeService } from './src/services/TransitModeService';
import { notificationService } from './src/services/NotificationService';
import { TransitModeProvider } from './src/contexts/TransitModeContext';
import { colors } from './src/theme/colors';

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      await sentinelSystem.initialize();
      await gameRulesManager.loadCustomRules();
      
      // Register background task for HP inactivity checking
      // Requirement 8.4: Check for inactivity penalty every hour using expo-task-manager
      await backgroundTaskService.registerHPInactivityTask();
      
      // Initialize Transit Mode service
      // Requirement 22.1, 22.2: Activate automatically at 17:00, deactivate at 22:00
      await transitModeService.initialize();
      
      // Initialize Notification Service
      // Requirement 62.2: Register device token on first launch
      // Requirement 62.6: Request notification permissions on first launch
      await notificationService.initialize();
      
      await new Promise(resolve => setTimeout(resolve, 500));
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to initialize app:', err);
      setError('Failed to initialize app');
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.active} />
        <Text style={styles.loadingText}>Loading Zenith...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <TransitModeProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <BottomTabNavigator />
      </NavigationContainer>
    </TransitModeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.void,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.text,
    fontSize: 16,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: colors.void,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    color: colors.alert, // Requirement 3.8: alert for critical states
    fontSize: 16,
    textAlign: 'center',
  },
});
