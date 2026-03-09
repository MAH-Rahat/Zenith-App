/**
 * AgentFeedCard Component
 * 
 * Displays recent AI agent interactions and status.
 * Shows the latest agent message or system status.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors } from '../theme/colors';

interface AgentMessage {
  id: string;
  agentName: string;
  message: string;
  timestamp: string;
  type: 'info' | 'warning' | 'success';
}

interface AgentFeedCardProps {
  maxMessages?: number;
}

export const AgentFeedCard: React.FC<AgentFeedCardProps> = ({ maxMessages = 3 }) => {
  const [messages, setMessages] = useState<AgentMessage[]>([]);

  useEffect(() => {
    loadRecentMessages();
  }, []);

  const loadRecentMessages = async () => {
    // TODO: Load from database when agent interaction history is implemented
    // For now, show placeholder message
    setMessages([
      {
        id: '1',
        agentName: 'SENTINEL',
        message: 'System initialized. All agents ready.',
        timestamp: new Date().toISOString(),
        type: 'success',
      },
    ]);
  };

  const getAgentColor = (agentName: string): string => {
    const agentColors: Record<string, string> = {
      OPERATOR: colors.active,
      SENTINEL: colors.growth,
      BROKER: colors.caution,
      ARCHITECT: colors.active,
      FORGE: colors.growth,
      SIGNAL: colors.caution,
    };
    return agentColors[agentName] || colors.active;
  };

  const getTypeColor = (type: string): string => {
    switch (type) {
      case 'success':
        return colors.growth;
      case 'warning':
        return colors.caution;
      case 'info':
      default:
        return colors.active;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🤖 AGENT FEED</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>ACTIVE</Text>
        </View>
      </View>

      <ScrollView style={styles.messageList} showsVerticalScrollIndicator={false}>
        {messages.length > 0 ? (
          messages.slice(0, maxMessages).map((msg) => (
            <View key={msg.id} style={styles.messageCard}>
              <View style={styles.messageHeader}>
                <Text
                  style={[
                    styles.agentName,
                    { color: getAgentColor(msg.agentName) },
                  ]}
                >
                  {msg.agentName}
                </Text>
                <Text style={styles.timestamp}>
                  {new Date(msg.timestamp).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
              <Text style={styles.messageText}>{msg.message}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No recent agent activity</Text>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '700',
    letterSpacing: 1,
  },
  statusBadge: {
    backgroundColor: `${colors.growth}10`,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: colors.growth,
  },
  statusText: {
    color: colors.growth,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  messageList: {
    maxHeight: 200,
  },
  messageCard: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  agentName: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  timestamp: {
    fontSize: 10,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  messageText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 16,
  },
});
