import 'react-native-get-random-values';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '@/lib/contexts/AuthContext';
import { EventProvider, useEvent } from '@/lib/contexts/EventContext';

function RootNavigator() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { activeEvent, isLoading: eventLoading } = useEvent();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (authLoading || eventLoading) return;

    const inAuth = segments[0] === '(auth)';
    const inEvent = segments[0] === 'event';
    const inTabs = segments[0] === '(tabs)';

    if (!isAuthenticated && !inAuth) {
      router.replace('/(auth)/sign-in');
    } else if (isAuthenticated && !activeEvent && !inEvent) {
      router.replace('/event');
    } else if (isAuthenticated && activeEvent && !inTabs) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, activeEvent, authLoading, eventLoading]);

  if (authLoading || eventLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#4ECDC4" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="event" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <EventProvider>
        <StatusBar style="light" />
        <RootNavigator />
      </EventProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: '#0f0f23',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
