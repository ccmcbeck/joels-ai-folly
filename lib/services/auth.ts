import { Amplify } from 'aws-amplify';
import {
  signIn as amplifySignIn,
  signUp as amplifySignUp,
  confirmSignUp as amplifyConfirmSignUp,
  signOut as amplifySignOut,
  getCurrentUser as amplifyGetCurrentUser,
  fetchAuthSession,
} from 'aws-amplify/auth';
import { config } from '../config';

// Configure Amplify — safe to call multiple times, last call wins
if (config.aws.cognito.userPoolId) {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: config.aws.cognito.userPoolId,
        userPoolClientId: config.aws.cognito.userPoolClientId,
      },
    },
  });
}

export const authService = {
  async signIn(email: string, password: string) {
    // Clear any stale auth state (e.g., from a previous sign-up flow)
    try { await amplifySignOut(); } catch { /* ignore */ }
    const result = await amplifySignIn({
      username: email,
      password,
      options: {
        authFlowType: 'USER_PASSWORD_AUTH',
      },
    });
    return result;
  },

  async signUp(email: string, password: string, displayName: string) {
    const result = await amplifySignUp({
      username: email,
      password,
      options: {
        userAttributes: {
          email,
          preferred_username: displayName,
        },
      },
    });
    return result;
  },

  async confirmSignUp(email: string, code: string) {
    const result = await amplifyConfirmSignUp({
      username: email,
      confirmationCode: code,
    });
    return result;
  },

  async signOut() {
    await amplifySignOut();
  },

  async getCurrentUser() {
    try {
      const user = await amplifyGetCurrentUser();
      return user;
    } catch {
      return null;
    }
  },

  async getToken(): Promise<string | null> {
    try {
      const session = await fetchAuthSession();
      return session.tokens?.idToken?.toString() ?? null;
    } catch {
      return null;
    }
  },

  async getUserId(): Promise<string | null> {
    try {
      const user = await amplifyGetCurrentUser();
      return user.userId;
    } catch {
      return null;
    }
  },
};
