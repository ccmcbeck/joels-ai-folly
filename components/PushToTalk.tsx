import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Modal,
  FlatList,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAudioRecorder, AudioModule, RecordingPresets } from 'expo-audio';
import type { Participant, PTTTarget } from '@/lib/types';
import { useEvent } from '@/lib/contexts/EventContext';
import { livekitService } from '@/lib/services/livekit';
import { config } from '@/lib/config';

interface Props {
  participants: Participant[];
}

export default function PushToTalk({ participants }: Props) {
  const { activeEvent } = useEvent();
  const [isRecording, setIsRecording] = useState(false);
  const [target, setTarget] = useState<PTTTarget>({ type: 'all' });
  const [showTargetPicker, setShowTargetPicker] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const startRecording = useCallback(async () => {
    setIsRecording(true);
    setRecordingDuration(0);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Request permission and start audio recording
    try {
      const { granted } = await AudioModule.requestRecordingPermissionsAsync();
      if (!granted) {
        console.warn('[PTT] Audio recording permission denied');
        return;
      }
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
    } catch (err) {
      console.warn('[PTT] Failed to start recording:', err);
    }

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // Duration timer
    timerRef.current = setInterval(() => {
      setRecordingDuration((prev) => prev + 1);
    }, 1000);
  }, [pulseAnim]);

  const stopRecording = useCallback(async () => {
    setIsRecording(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Stop audio recording
    try {
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      const targetLabel = getTargetLabel(target);
      console.log(`[PTT] Recorded ${recordingDuration}s to ${targetLabel}, uri: ${uri}`);

      if (!config.useMockData && activeEvent) {
        try {
          const tokenData = await livekitService.getToken(activeEvent.id, target);
          console.log(`[PTT] Got LiveKit token for room: ${tokenData.roomName}`);
        } catch (err) {
          console.warn('[PTT] Failed to get LiveKit token:', err);
        }
      }
    } catch (err) {
      console.warn('[PTT] Failed to stop recording:', err);
    }
  }, [target, recordingDuration, pulseAnim, activeEvent]);

  const targetLabel = getTargetLabel(target);
  const subGroups = activeEvent?.subGroups ?? [];

  return (
    <View style={styles.container}>
      {/* Target selector */}
      <TouchableOpacity
        style={styles.targetSelector}
        onPress={() => setShowTargetPicker(true)}
      >
        <Ionicons
          name={target.type === 'all' ? 'people' : target.type === 'subgroup' ? 'git-branch-outline' : 'person'}
          size={14}
          color="#4ECDC4"
        />
        <Text style={styles.targetText}>{targetLabel}</Text>
        <Ionicons name="chevron-up" size={14} color="#666" />
      </TouchableOpacity>

      {/* PTT button */}
      <Animated.View style={[styles.pttOuter, { transform: [{ scale: pulseAnim }] }]}>
        <Pressable
          style={[styles.pttButton, isRecording && styles.pttButtonActive]}
          onPressIn={startRecording}
          onPressOut={stopRecording}
        >
          <Ionicons
            name={isRecording ? 'mic' : 'mic-outline'}
            size={32}
            color={isRecording ? '#fff' : '#4ECDC4'}
          />
        </Pressable>
      </Animated.View>

      {/* Recording indicator */}
      {isRecording && (
        <View style={styles.recordingIndicator}>
          <View style={styles.recordingDot} />
          <Text style={styles.recordingText}>
            {recordingDuration}s to {targetLabel}
          </Text>
        </View>
      )}

      {/* Target picker modal */}
      <Modal
        visible={showTargetPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTargetPicker(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowTargetPicker(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Send voice to...</Text>

            {/* All Riders */}
            <TouchableOpacity
              style={[
                styles.targetOption,
                target.type === 'all' && styles.targetOptionActive,
              ]}
              onPress={() => {
                setTarget({ type: 'all' });
                setShowTargetPicker(false);
              }}
            >
              <Ionicons name="people" size={20} color="#4ECDC4" />
              <Text style={styles.targetOptionText}>All Riders</Text>
            </TouchableOpacity>

            {/* Sub-groups */}
            {subGroups.length > 0 && (
              <>
                <Text style={styles.targetSectionTitle}>Sub-groups</Text>
                {subGroups.map((sg) => (
                  <TouchableOpacity
                    key={sg.subGroupId}
                    style={[
                      styles.targetOption,
                      target.type === 'subgroup' &&
                        target.subGroupId === sg.subGroupId &&
                        styles.targetOptionActive,
                    ]}
                    onPress={() => {
                      setTarget({
                        type: 'subgroup',
                        subGroupId: sg.subGroupId,
                        name: sg.name,
                      });
                      setShowTargetPicker(false);
                    }}
                  >
                    <Ionicons name="git-branch-outline" size={20} color="#4ECDC4" />
                    <Text style={styles.targetOptionText}>{sg.name}</Text>
                    <Text style={styles.targetMemberCount}>
                      {sg.memberUids.length} members
                    </Text>
                  </TouchableOpacity>
                ))}
              </>
            )}

            {/* Individual participants */}
            <Text style={styles.targetSectionTitle}>Direct Message</Text>
            {participants.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={[
                  styles.targetOption,
                  target.type === 'direct' &&
                    target.uid === p.id &&
                    styles.targetOptionActive,
                ]}
                onPress={() => {
                  setTarget({ type: 'direct', uid: p.id, name: p.name });
                  setShowTargetPicker(false);
                }}
              >
                <View style={[styles.targetDot, { backgroundColor: p.color }]} />
                <Text style={styles.targetOptionText}>{p.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function getTargetLabel(target: PTTTarget): string {
  switch (target.type) {
    case 'all':
      return 'All Riders';
    case 'subgroup':
      return target.name;
    case 'direct':
      return target.name;
  }
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    alignItems: 'center',
  },
  targetSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(26, 26, 46, 0.92)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 8,
  },
  targetText: { color: '#ccc', fontSize: 13, fontWeight: '500' },
  pttOuter: { borderRadius: 40 },
  pttButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(26, 26, 46, 0.95)',
    borderWidth: 3,
    borderColor: '#4ECDC4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pttButtonActive: {
    backgroundColor: '#FF6B6B',
    borderColor: '#FF6B6B',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    backgroundColor: 'rgba(255, 107, 107, 0.9)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  recordingText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    maxHeight: '70%',
  },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 16 },
  targetSectionTitle: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
  },
  targetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  targetOptionActive: {
    backgroundColor: 'rgba(78, 205, 196, 0.15)',
  },
  targetOptionText: { color: '#fff', fontSize: 16, flex: 1 },
  targetMemberCount: { color: '#888', fontSize: 12 },
  targetDot: { width: 20, height: 20, borderRadius: 10 },
});
