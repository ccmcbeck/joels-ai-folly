import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../services/auth';
import { fetchUserAttributes } from 'aws-amplify/auth';
import { config } from '../config';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<{ needsConfirmation: boolean }>;
  confirmSignUp: (email: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

const MOCK_USER: User = {
  uid: 'mock-user-1',
  email: 'rider@joelsaifolly.app',
  displayName: 'You',
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      if (config.useMockData) {
        // In mock mode, check AsyncStorage for a mock session
        const mockSession = await AsyncStorage.getItem('mockSession');
        if (mockSession) {
          setUser(JSON.parse(mockSession));
        }
      } else {
        const cognitoUser = await authService.getCurrentUser();
        if (cognitoUser) {
          const attrs = await fetchUserAttributes();
          setUser({
            uid: cognitoUser.userId,
            email: attrs.email ?? cognitoUser.signInDetails?.loginId ?? '',
            displayName: attrs.preferred_username ?? attrs.email ?? cognitoUser.username,
          });
        }
      }
    } catch {
      // No session
    } finally {
      setIsLoading(false);
    }
  }

  const signIn = useCallback(async (email: string, password: string) => {
    if (config.useMockData) {
      const mockUser = { ...MOCK_USER, email, displayName: email.split('@')[0] };
      await AsyncStorage.setItem('mockSession', JSON.stringify(mockUser));
      setUser(mockUser);
      return;
    }
    await authService.signIn(email, password);
    await checkAuth();
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName: string) => {
    if (config.useMockData) {
      const mockUser = { ...MOCK_USER, email, displayName };
      await AsyncStorage.setItem('mockSession', JSON.stringify(mockUser));
      setUser(mockUser);
      return { needsConfirmation: false };
    }
    const result = await authService.signUp(email, password, displayName);
    return {
      needsConfirmation: result.nextStep.signUpStep === 'CONFIRM_SIGN_UP',
    };
  }, []);

  const confirmSignUp = useCallback(async (email: string, code: string) => {
    if (config.useMockData) return;
    await authService.confirmSignUp(email, code);
  }, []);

  const signOut = useCallback(async () => {
    if (config.useMockData) {
      await AsyncStorage.removeItem('mockSession');
      await AsyncStorage.removeItem('activeEventId');
    } else {
      await authService.signOut();
    }
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        signIn,
        signUp,
        confirmSignUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
