import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/contexts/AuthContext';

export default function EventHomeScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>
          Hi, {user?.displayName || 'Rider'}
        </Text>
        <TouchableOpacity onPress={signOut} style={styles.signOutButton}>
          <Ionicons name="log-out-outline" size={20} color="#888" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Ionicons name="bicycle-outline" size={80} color="#4ECDC4" />
        <Text style={styles.title}>Ready to Ride?</Text>
        <Text style={styles.subtitle}>
          Create a new event or join one with an invite code
        </Text>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push('/event/create')}
        >
          <Ionicons name="add-circle-outline" size={24} color="#0f0f23" />
          <Text style={styles.primaryButtonText}>Create Event</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push('/event/join')}
        >
          <Ionicons name="enter-outline" size={24} color="#4ECDC4" />
          <Text style={styles.secondaryButtonText}>Join with Code</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  greeting: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  signOutButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 80,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginTop: 20,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
    marginBottom: 40,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: '#4ECDC4',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    gap: 8,
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#0f0f23',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    gap: 8,
    borderWidth: 1,
    borderColor: '#4ECDC4',
  },
  secondaryButtonText: {
    color: '#4ECDC4',
    fontSize: 16,
    fontWeight: '700',
  },
});
