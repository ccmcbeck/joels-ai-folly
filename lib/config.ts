// Environment configuration
// Set these in .env or via EAS Build environment variables
// Prefix with EXPO_PUBLIC_ to make available in client code

export const config = {
  aws: {
    region: process.env.EXPO_PUBLIC_AWS_REGION || 'us-west-2',
    cognito: {
      userPoolId: process.env.EXPO_PUBLIC_COGNITO_USER_POOL_ID || '',
      userPoolClientId: process.env.EXPO_PUBLIC_COGNITO_CLIENT_ID || '',
    },
    apiGateway: {
      restUrl: process.env.EXPO_PUBLIC_API_URL || '',
      websocketUrl: process.env.EXPO_PUBLIC_WS_URL || '',
    },
  },
  livekit: {
    url: process.env.EXPO_PUBLIC_LIVEKIT_URL || '',
  },
  // When true, use mock data instead of real backend
  useMockData: !process.env.EXPO_PUBLIC_API_URL,
};