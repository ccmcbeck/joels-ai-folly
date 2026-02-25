import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  SAMPLE_ROUTE,
  ROUTE_TOTAL_DISTANCE,
  createMockParticipants,
  advanceParticipants,
} from '@/lib/mock-data';
import { computeRelativePositions, formatRelativePosition } from '@/lib/route-utils';
import type { Participant } from '@/lib/types';
import { useEvent } from '@/lib/contexts/EventContext';
import { useAuth } from '@/lib/contexts/AuthContext';

export default function GroupScreen() {
  const { activeEvent, createSubGroup } = useEvent();
  const { user } = useAuth();
  const [participants, setParticipants] = useState<Participant[]>(
    createMockParticipants(2000),
  );
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      setParticipants((prev) => advanceParticipants(prev, 2));
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  const route = activeEvent?.route ?? SAMPLE_ROUTE;
  const routeTotal = route.length > 0
    ? route[route.length - 1].distanceFromStart
    : ROUTE_TOTAL_DISTANCE;

  const meParticipant: Participant = {
    id: 'me',
    name: user?.displayName || 'You',
    color: '#4ECDC4',
    location: route[5] ?? route[0],
    heading: 0,
    speed: 4.5,
    distanceAlongRoute: 2000,
    isOffRoute: false,
    lastUpdate: Date.now(),
  };

  const allParticipants = [meParticipant, ...participants];
  const relatives = computeRelativePositions(meParticipant, participants);

  async function handleCreateSubGroup() {
    if (!newGroupName.trim()) return;
    try {
      await createSubGroup(newGroupName.trim());
      setNewGroupName('');
      setShowCreateGroup(false);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  }

  const renderParticipant = ({ item }: { item: Participant }) => {
    const rel = relatives.find((r) => r.participantId === item.id);
    const isMe = item.id === 'me';

    return (
      <View style={styles.participantRow}>
        <View style={[styles.avatar, { backgroundColor: item.color }]}>
          <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.participantInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.participantName}>
              {item.name}
              {isMe && ' (You)'}
            </Text>
            {item.isOffRoute && (
              <View style={styles.offRouteBadge}>
                <Text style={styles.offRouteText}>OFF ROUTE</Text>
              </View>
            )}
          </View>
          <Text style={styles.participantDetail}>
            {isMe
              ? `${(item.distanceAlongRoute / 1000).toFixed(1)} km into route`
              : rel
                ? formatRelativePosition(rel)
                : '...'}
          </Text>
          <Text style={styles.participantSpeed}>
            {(item.speed * 3.6).toFixed(0)} km/h
          </Text>
        </View>
        {!isMe && (
          <TouchableOpacity style={styles.pttButton}>
            <Ionicons name="mic" size={20} color="#4ECDC4" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.eventName}>{activeEvent?.name || 'Mission Bay Bike Loop'}</Text>
        <Text style={styles.eventMeta}>
          {allParticipants.length} riders &middot; {(routeTotal / 1000).toFixed(1)} km route
        </Text>
        {activeEvent?.inviteCode && (
          <Text style={styles.inviteCode}>Code: {activeEvent.inviteCode}</Text>
        )}
      </View>

      {/* Sub-groups */}
      {activeEvent?.subGroups && activeEvent.subGroups.length > 0 && (
        <View style={styles.subgroupList}>
          {activeEvent.subGroups.map((sg) => (
            <View key={sg.subGroupId} style={styles.subgroupChip}>
              <Text style={styles.subgroupChipText}>{sg.name}</Text>
              <Text style={styles.subgroupChipCount}>{sg.memberUids.length}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.subgroupHeader}>
        <Text style={styles.subgroupTitle}>All Riders</Text>
        <TouchableOpacity
          style={styles.subgroupAction}
          onPress={() => setShowCreateGroup(true)}
        >
          <Ionicons name="add-circle-outline" size={20} color="#4ECDC4" />
          <Text style={styles.subgroupActionText}>Create Sub-group</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={allParticipants}
        keyExtractor={(item) => item.id}
        renderItem={renderParticipant}
        contentContainerStyle={styles.list}
      />

      {/* Create sub-group modal */}
      <Modal visible={showCreateGroup} transparent animationType="slide">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowCreateGroup(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Sub-group</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Group name (e.g., Fast Group)"
              placeholderTextColor="#666"
              value={newGroupName}
              onChangeText={setNewGroupName}
              autoFocus
            />
            <TouchableOpacity style={styles.modalButton} onPress={handleCreateSubGroup}>
              <Text style={styles.modalButtonText}>Create</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f23' },
  header: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  eventName: { color: '#fff', fontSize: 22, fontWeight: '700' },
  eventMeta: { color: '#888', fontSize: 14, marginTop: 4 },
  inviteCode: {
    color: '#4ECDC4',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  subgroupList: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
    flexWrap: 'wrap',
  },
  subgroupChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(78, 205, 196, 0.15)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  subgroupChipText: { color: '#4ECDC4', fontSize: 13, fontWeight: '600' },
  subgroupChipCount: { color: '#888', fontSize: 12 },
  subgroupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  subgroupTitle: { color: '#ccc', fontSize: 16, fontWeight: '600' },
  subgroupAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  subgroupActionText: { color: '#4ECDC4', fontSize: 13 },
  list: { paddingHorizontal: 16 },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a2e',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  participantInfo: { flex: 1, marginLeft: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  participantName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  offRouteBadge: {
    backgroundColor: 'rgba(255, 165, 0, 0.2)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  offRouteText: { color: '#FFA500', fontSize: 10, fontWeight: '700' },
  participantDetail: { color: '#4ECDC4', fontSize: 13, marginTop: 2 },
  participantSpeed: { color: '#666', fontSize: 12, marginTop: 1 },
  pttButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(78, 205, 196, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 16 },
  modalInput: {
    backgroundColor: '#0f0f23',
    color: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#2a2a4e',
    marginBottom: 16,
  },
  modalButton: {
    backgroundColor: '#4ECDC4',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  modalButtonText: { color: '#0f0f23', fontSize: 16, fontWeight: '700' },
});
