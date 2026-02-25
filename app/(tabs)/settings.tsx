import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useEvent } from '@/lib/contexts/EventContext';
import { ROUTE_TOTAL_DISTANCE } from '@/lib/mock-data';
import { routeService } from '@/lib/services/routes';

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const { activeEvent, leaveEvent } = useEvent();

  const [name, setName] = useState(user?.displayName || 'Rider');
  const [offRouteAlerts, setOffRouteAlerts] = useState(true);
  const [groupAlerts, setGroupAlerts] = useState(true);
  const [offRouteThreshold, setOffRouteThreshold] = useState('100');
  const [gpsInterval, setGpsInterval] = useState('3');
  const [keepScreenOn, setKeepScreenOn] = useState(true);

  const route = activeEvent?.route;
  const routeKm = route
    ? (route[route.length - 1].distanceFromStart / 1000).toFixed(1)
    : (ROUTE_TOTAL_DISTANCE / 1000).toFixed(1);

  const participantCount = activeEvent?.participants?.length || 5;

  async function handleImportGPX() {
    try {
      const points = await routeService.importGPX();
      if (points) {
        Alert.alert('Route Imported', `${points.length} waypoints loaded (${(points[points.length - 1].distanceFromStart / 1000).toFixed(1)} km)`);
      }
    } catch (err: any) {
      Alert.alert('Import Failed', err.message);
    }
  }

  async function handleShareInvite() {
    if (!activeEvent?.inviteCode) return;
    await Share.share({
      message: `Join my ride on Joel's AI Folly!\nEvent: ${activeEvent.name}\nCode: ${activeEvent.inviteCode}`,
    });
  }

  async function handleLeaveEvent() {
    Alert.alert(
      'Leave Event',
      'Are you sure you want to leave this event?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: () => leaveEvent(),
        },
      ],
    );
  }

  async function handleSignOut() {
    Alert.alert(
      'Sign Out',
      'This will also leave the current event.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await leaveEvent();
            await signOut();
          },
        },
      ],
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Profile */}
      <Text style={styles.sectionTitle}>Profile</Text>
      <View style={styles.row}>
        <Text style={styles.label}>Display Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholderTextColor="#666"
        />
      </View>

      {/* Event */}
      <Text style={styles.sectionTitle}>Current Event</Text>
      <View style={styles.infoRow}>
        <Ionicons name="bicycle" size={18} color="#4ECDC4" />
        <Text style={styles.infoText}>{activeEvent?.name || 'Mission Bay Bike Loop'}</Text>
      </View>
      <View style={styles.infoRow}>
        <Ionicons name="people" size={18} color="#4ECDC4" />
        <Text style={styles.infoText}>{participantCount} participants</Text>
      </View>
      <View style={styles.infoRow}>
        <Ionicons name="map" size={18} color="#4ECDC4" />
        <Text style={styles.infoText}>{routeKm} km route</Text>
      </View>
      {activeEvent?.inviteCode && (
        <View style={styles.infoRow}>
          <Ionicons name="key" size={18} color="#4ECDC4" />
          <Text style={styles.infoText}>Invite code: {activeEvent.inviteCode}</Text>
        </View>
      )}

      {/* Route Import */}
      <Text style={styles.sectionTitle}>Route</Text>
      <TouchableOpacity style={styles.actionButton} onPress={handleImportGPX}>
        <Ionicons name="document-outline" size={18} color="#4ECDC4" />
        <Text style={styles.actionButtonText}>Import GPX File</Text>
      </TouchableOpacity>

      {/* Alerts */}
      <Text style={styles.sectionTitle}>Alerts</Text>
      <View style={styles.switchRow}>
        <Text style={styles.label}>Off-route warnings</Text>
        <Switch
          value={offRouteAlerts}
          onValueChange={setOffRouteAlerts}
          trackColor={{ true: '#4ECDC4', false: '#333' }}
          thumbColor="#fff"
        />
      </View>
      <View style={styles.switchRow}>
        <Text style={styles.label}>Group member alerts</Text>
        <Switch
          value={groupAlerts}
          onValueChange={setGroupAlerts}
          trackColor={{ true: '#4ECDC4', false: '#333' }}
          thumbColor="#fff"
        />
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Off-route threshold (m)</Text>
        <TextInput
          style={styles.inputSmall}
          value={offRouteThreshold}
          onChangeText={setOffRouteThreshold}
          keyboardType="numeric"
          placeholderTextColor="#666"
        />
      </View>

      {/* GPS */}
      <Text style={styles.sectionTitle}>GPS</Text>
      <View style={styles.row}>
        <Text style={styles.label}>Update interval (sec)</Text>
        <TextInput
          style={styles.inputSmall}
          value={gpsInterval}
          onChangeText={setGpsInterval}
          keyboardType="numeric"
          placeholderTextColor="#666"
        />
      </View>
      <View style={styles.switchRow}>
        <Text style={styles.label}>Keep screen on</Text>
        <Switch
          value={keepScreenOn}
          onValueChange={setKeepScreenOn}
          trackColor={{ true: '#4ECDC4', false: '#333' }}
          thumbColor="#fff"
        />
      </View>

      {/* Share Event */}
      <Text style={styles.sectionTitle}>Share Event</Text>
      <TouchableOpacity style={styles.actionButton} onPress={handleShareInvite}>
        <Ionicons name="share-outline" size={18} color="#4ECDC4" />
        <Text style={styles.actionButtonText}>
          Share Invite Code{activeEvent?.inviteCode ? `: ${activeEvent.inviteCode}` : ''}
        </Text>
      </TouchableOpacity>

      {/* Actions */}
      <Text style={styles.sectionTitle}>Account</Text>
      <TouchableOpacity style={styles.dangerButton} onPress={handleLeaveEvent}>
        <Ionicons name="exit-outline" size={18} color="#FF6B6B" />
        <Text style={styles.dangerButtonText}>Leave Event</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.dangerButton} onPress={handleSignOut}>
        <Ionicons name="log-out-outline" size={18} color="#FF6B6B" />
        <Text style={styles.dangerButtonText}>Sign Out</Text>
      </TouchableOpacity>

      {/* About */}
      <Text style={styles.sectionTitle}>About</Text>
      <Text style={styles.aboutText}>Joel's AI Folly v0.1.0</Text>
      <Text style={styles.aboutSubtext}>Group event communication for cyclists</Text>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f23', paddingHorizontal: 16 },
  sectionTitle: {
    color: '#4ECDC4',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 24,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a2e',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a2e',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  label: { color: '#ccc', fontSize: 15 },
  infoText: { color: '#ccc', fontSize: 15 },
  input: {
    color: '#fff',
    fontSize: 15,
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 120,
    textAlign: 'right',
  },
  inputSmall: {
    color: '#fff',
    fontSize: 15,
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    width: 60,
    textAlign: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#333',
  },
  actionButtonText: { color: '#ccc', fontSize: 14 },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.2)',
  },
  dangerButtonText: { color: '#FF6B6B', fontSize: 14, fontWeight: '600' },
  aboutText: { color: '#888', fontSize: 14 },
  aboutSubtext: { color: '#555', fontSize: 13, marginTop: 4 },
});
