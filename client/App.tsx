import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, ActivityIndicator, Text, TouchableOpacity, ScrollView } from 'react-native';
import { HomeScreen } from './src/screens/HomeScreen';
import { QuestsScreen } from './src/screens/QuestsScreen';
import { SkillsScreen } from './src/screens/SkillsScreen';
import { ActivityScreen } from './src/screens/ActivityScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { sentinelSystem } from './src/services/SentinelSystem';
import { gameRulesManager } from './src/services/GameRulesManager';
import { backgroundTaskService } from './src/services/BackgroundTaskService';
import { transitModeService } from './src/services/TransitModeService';
import { TransitModeProvider } from './src/contexts/TransitModeContext';

type TabName = 'Home' | 'Quests' | 'Skills' | 'Activity' | 'Settings';

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabName>('Home');

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
        <ActivityIndicator size="large" color="#FF0000" />
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

  const renderScreen = () => {
    switch (activeTab) {
      case 'Home':
        return <HomeScreen />;
      case 'Quests':
        return <QuestsScreen />;
      case 'Skills':
        return <SkillsScreen />;
      case 'Activity':
        return <ActivityScreen />;
      case 'Settings':
        return <SettingsScreen />;
      default:
        return <HomeScreen />;
    }
  };

  return (
    <TransitModeProvider>
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.content}>
          {renderScreen()}
        </View>
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={styles.tabButton}
            onPress={() => setActiveTab('Home')}
          >
            <View style={[styles.tabIndicator, activeTab === 'Home' && styles.tabIndicatorActive]} />
            <Text style={[styles.tabText, activeTab === 'Home' && styles.tabTextActive]}>
              HOME
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tabButton}
            onPress={() => setActiveTab('Quests')}
          >
            <View style={[styles.tabIndicator, activeTab === 'Quests' && styles.tabIndicatorActive]} />
            <Text style={[styles.tabText, activeTab === 'Quests' && styles.tabTextActive]}>
              QUESTS
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tabButton}
            onPress={() => setActiveTab('Skills')}
          >
            <View style={[styles.tabIndicator, activeTab === 'Skills' && styles.tabIndicatorActive]} />
            <Text style={[styles.tabText, activeTab === 'Skills' && styles.tabTextActive]}>
              SKILLS
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tabButton}
            onPress={() => setActiveTab('Activity')}
          >
            <View style={[styles.tabIndicator, activeTab === 'Activity' && styles.tabIndicatorActive]} />
            <Text style={[styles.tabText, activeTab === 'Activity' && styles.tabTextActive]}>
              ACTIVITY
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tabButton}
            onPress={() => setActiveTab('Settings')}
          >
            <View style={[styles.tabIndicator, activeTab === 'Settings' && styles.tabIndicatorActive]} />
            <Text style={[styles.tabText, activeTab === 'Settings' && styles.tabTextActive]}>
              SETTINGS
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TransitModeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    color: '#ff0000',
    fontSize: 16,
    textAlign: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#000000',
    borderTopColor: '#1a1a1a',
    borderTopWidth: 1,
    height: 70,
    paddingBottom: 10,
    paddingTop: 10,
  },
  tabButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  tabIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  tabIndicatorActive: {
    backgroundColor: '#FF0000',
  },
  tabText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#333333',
    letterSpacing: 1,
  },
  tabTextActive: {
    color: '#FF0000',
  },
});
