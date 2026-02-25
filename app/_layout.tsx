import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { AuthProvider, useAuth } from '@/lib/contexts/AuthContext';
import { EventProvider, useEvent } from '@/lib/contexts/EventContext';

function RootNavigator() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { activeEvent, isLoading: eventLoading } = useEvent();

  if (authLoading || eventLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#4ECDC4" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <Stack.Screen name="(auth)" />
      ) : !activeEvent ? (
        <Stack.Screen name="event" />
      ) : (
        <Stack.Screen name="(tabs)" />
      )}
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
