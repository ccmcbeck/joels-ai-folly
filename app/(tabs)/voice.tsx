import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEvent } from '@/lib/contexts/EventContext';
import { livekitService } from '@/lib/services/livekit';
import { config } from '@/lib/config';
import type { VoiceMessage } from '@/lib/types';

export default function VoiceScreen() {
  const { activeEvent } = useEvent();
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadMessages();
  }, [activeEvent?.id]);

  async function loadMessages() {
    if (!activeEvent || config.useMockData) {
      // Show mock archived messages
      setMessages(MOCK_VOICE_MESSAGES);
      return;
    }
    setLoading(true);
    try {
      const msgs = await livekitService.listMessages(activeEvent.id);
      setMessages(msgs);
    } catch {
      // Silently fail — messages may not exist yet
    } finally {
      setLoading(false);
    }
  }

  function formatTime(timestamp: string): string {
    const d = new Date(timestamp);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function formatDuration(ms: number): string {
    const secs = Math.round(ms / 1000);
    if (secs < 60) return `${secs}s`;
    return `${Math.floor(secs / 60)}m ${secs % 60}s`;
  }

  const renderMessage = ({ item }: { item: VoiceMessage }) => (
    <View style={styles.messageRow}>
      <View style={styles.messageAvatar}>
        <Text style={styles.avatarText}>
          {item.speakerName.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.messageContent}>
        <View style={styles.messageHeader}>
          <Text style={styles.speakerName}>{item.speakerName}</Text>
          <Text style={styles.messageTime}>{formatTime(item.timestamp)}</Text>
        </View>
        <View style={styles.targetBadge}>
          <Ionicons
            name={item.targetType === 'all' ? 'people' : item.targetType === 'subgroup' ? 'git-branch' : 'person'}
            size={12}
            color="#888"
          />
          <Text style={styles.targetText}>
            {item.targetType === 'all' ? 'All Riders' : item.targetId || 'Direct'}
          </Text>
          <Text style={styles.durationText}>{formatDuration(item.durationMs)}</Text>
        </View>
        {item.transcript ? (
          <Text style={styles.transcript}>{item.transcript}</Text>
        ) : (
          <Text style={styles.transcriptPending}>Transcription pending...</Text>
        )}
        {item.audioUrl && (
          <TouchableOpacity style={styles.playButton}>
            <Ionicons name="play-circle" size={24} color="#4ECDC4" />
            <Text style={styles.playText}>Play</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Voice Messages</Text>
        <Text style={styles.subtitle}>
          {messages.length} message{messages.length !== 1 ? 's' : ''} archived
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4ECDC4" />
        </View>
      ) : messages.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubbles-outline" size={64} color="#333" />
          <Text style={styles.emptyText}>No voice messages yet</Text>
          <Text style={styles.emptySubtext}>
            Use the PTT button on the Map tab to send voice messages.
            They'll be transcribed and archived here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.list}
          inverted
        />
      )}
    </View>
  );
}

const MOCK_VOICE_MESSAGES: VoiceMessage[] = [
  {
    id: 'vm-1',
    eventId: 'mock',
    speakerUid: 'joel',
    speakerName: 'Joel',
    transcript: 'Hey everyone, we\'re approaching the turn at Bonita Cove. Watch for pedestrians on the path.',
    durationMs: 5200,
    targetType: 'all',
    timestamp: new Date(Date.now() - 300000).toISOString(),
  },
  {
    id: 'vm-2',
    eventId: 'mock',
    speakerUid: 'vito',
    speakerName: 'Vito',
    transcript: 'Copy that. I\'m about 2 minutes behind the main group.',
    durationMs: 3100,
    targetType: 'all',
    timestamp: new Date(Date.now() - 240000).toISOString(),
  },
  {
    id: 'vm-3',
    eventId: 'mock',
    speakerUid: 'joel',
    speakerName: 'Joel',
    transcript: 'Maria, looks like you might be off route. Are you taking the Fiesta Island detour?',
    durationMs: 4800,
    targetType: 'direct',
    targetId: 'Maria',
    timestamp: new Date(Date.now() - 180000).toISOString(),
  },
  {
    id: 'vm-4',
    eventId: 'mock',
    speakerUid: 'maria',
    speakerName: 'Maria',
    transcript: 'Yeah, I wanted to check out the viewpoint. I\'ll rejoin at De Anza Cove.',
    durationMs: 3800,
    targetType: 'direct',
    targetId: 'Joel',
    timestamp: new Date(Date.now() - 120000).toISOString(),
  },
];

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f23' },
  header: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  title: { color: '#fff', fontSize: 22, fontWeight: '700' },
  subtitle: { color: '#888', fontSize: 14, marginTop: 4 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: { color: '#666', fontSize: 18, fontWeight: '600', marginTop: 16 },
  emptySubtext: {
    color: '#444',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  list: { padding: 16 },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  messageAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2a2a4e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#4ECDC4', fontSize: 16, fontWeight: '700' },
  messageContent: { flex: 1 },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  speakerName: { color: '#fff', fontSize: 15, fontWeight: '600' },
  messageTime: { color: '#666', fontSize: 12 },
  targetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  targetText: { color: '#888', fontSize: 12 },
  durationText: { color: '#666', fontSize: 12, marginLeft: 8 },
  transcript: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    padding: 12,
  },
  transcriptPending: {
    color: '#555',
    fontSize: 13,
    fontStyle: 'italic',
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  playText: { color: '#4ECDC4', fontSize: 13, fontWeight: '600' },
});
