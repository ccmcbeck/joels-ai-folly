# CLAUDE.md

## Overview

Joel's AI Folly is a cross-platform mobile app for group event communication, primarily targeting group bike rides. Built with React Native (Expo) and TypeScript with an AWS serverless backend.

The app combines four core capabilities:
1. **Push-to-talk** (MVP) - Real-time voice to individuals, sub-groups, or everyone, with transcription and archival
2. **Route navigation** - Load a route (GPX, Ride with GPS, Strava), get turn-by-turn directions (works offline)
3. **Location sharing** - See where all participants are, with relative positioning ("10 min behind")
4. **Off-route alerts** - Notifications when someone deviates from the planned route

Target scale: 150+ participants per event, no theoretical limit.

## Tech Stack

- **Framework**: React Native with Expo (SDK 52) + TypeScript
- **Navigation**: Expo Router (file-based routing)
- **Maps**: react-native-maps (Apple Maps on iOS, Google Maps on Android)
- **Location**: expo-location (foreground + background GPS)
- **Audio**: expo-av (recording) + LiveKit (real-time PTT rooms)
- **Auth**: AWS Cognito via aws-amplify
- **Backend**: AWS (API Gateway, Lambda, DynamoDB, S3, SNS)
- **Voice**: LiveKit (audio rooms, server-side egress for transcription)
- **Transcription**: Amazon Transcribe Streaming
- **Infrastructure**: AWS CDK (in `backend/`)

## Project Structure

```
app/                    # Expo Router screens
  _layout.tsx           # Root layout — auth gate + event gate + providers
  (auth)/               # Auth screens (shown when not signed in)
    _layout.tsx
    sign-in.tsx
    sign-up.tsx
    confirm.tsx
  event/                # Event screens (shown when no active event)
    _layout.tsx
    index.tsx           # Event home — create or join
    create.tsx          # Create new event
    join.tsx            # Join with invite code
  (tabs)/               # Main app (shown when signed in + event active)
    _layout.tsx         # Tab navigator (Map, Group, Voice, Settings)
    index.tsx           # Map screen — route, participants, nav HUD, PTT
    group.tsx           # Participant list, sub-groups, relative positions
    voice.tsx           # Voice message archive with transcripts
    settings.tsx        # Profile, event info, route import, alerts config
components/
  PushToTalk.tsx        # Hold-to-talk button with target picker (all/subgroup/direct)
lib/
  config.ts             # Environment configuration (AWS endpoints, LiveKit URL)
  types.ts              # Core types (User, Event, Participant, PTT, Voice, Location)
  route-utils.ts        # Haversine distance, snap-to-route, turn directions
  mock-data.ts          # Mission Bay bike loop + simulated riders
  location.ts           # GPS permission and watch wrapper
  contexts/
    AuthContext.tsx      # Auth state provider (Cognito or mock)
    EventContext.tsx     # Active event state provider
  services/
    auth.ts             # Cognito auth wrapper (sign in/up/out, tokens)
    api.ts              # REST API client with auth headers
    events.ts           # Event CRUD (create, join, list, sub-groups)
    livekit.ts          # LiveKit token management
    location-sharing.ts # WebSocket real-time location broadcast/receive
    routes.ts           # Route import (GPX parser, Strava API, RWGPS API)
backend/                # AWS CDK infrastructure + Lambda functions
  bin/app.ts            # CDK app entry point
  lib/stack.ts          # Full stack: Cognito, DynamoDB, API Gateway, WebSocket, S3
  functions/
    auth/               # Cognito triggers
    events/             # Event CRUD Lambda handlers
    locations/          # WebSocket connect/disconnect/broadcast handlers
    voice/              # LiveKit token generation + egress webhook
    shared/             # DynamoDB client + API response helpers
test/                   # Jest tests
  route-utils.test.ts   # 43 tests for spatial functions
  mock-data.test.ts     # Tests for simulation
```

## Running

### Prerequisites

- Node.js 18+ (`node --version`)
- npm (`npm --version`)
- Install dependencies: `npm install`

### Mock Mode (no backend required)

When `EXPO_PUBLIC_API_URL` is not set, the app runs in mock mode:
- Sign in with any email/password (stored locally)
- Events created locally with mock data
- Simulated participants move along the Mission Bay route
- PTT records audio locally (no LiveKit connection)

### On a physical device (recommended for GPS)

1. Install **Expo Go** from the App Store (iOS) or Google Play (Android)
2. Run `npx expo start`
3. Scan the QR code with your phone camera (iOS) or Expo Go app (Android)
4. Sign in or create an account
5. Create an event or join one with an invite code
6. Grant location permission when prompted for live GPS tracking

### On iOS Simulator

1. Install Xcode from the Mac App Store
2. Run `npx expo start --ios`
3. Simulator uses a fixed location — the app will use simulated route movement

### Deploying the Backend

1. `cd backend && npm install`
2. Set `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` environment variables
3. `npx cdk deploy`
4. Copy the stack outputs into `.env`:
   ```
   EXPO_PUBLIC_COGNITO_USER_POOL_ID=...
   EXPO_PUBLIC_COGNITO_CLIENT_ID=...
   EXPO_PUBLIC_API_URL=...
   EXPO_PUBLIC_WS_URL=...
   EXPO_PUBLIC_LIVEKIT_URL=...
   ```

### What you'll see

- **Sign In / Sign Up**: Auth screens with email/password
- **Event Home**: Create a new ride event or join with an invite code
- **Map tab**: Route line, your position, participants, navigation HUD, push-to-talk button
- **Group tab**: All riders with relative positions, sub-group management, direct PTT buttons
- **Voice tab**: Archived voice messages with transcripts
- **Settings tab**: Profile, event info, route import (GPX), alert preferences, sign out

## Current State

- Auth flow (Cognito in production, mock locally)
- Event creation with invite codes
- Map with Mission Bay 10 km bike loop (mock route)
- Live GPS tracking (simulated fallback if permission denied)
- 4 simulated participants moving along route
- Push-to-talk with actual audio recording + target picker (all/subgroup/direct)
- Voice message archive screen with mock transcript data
- Sub-group creation and management
- GPX file import
- WebSocket location sharing service (needs deployed backend)
- Full AWS CDK infrastructure (Cognito, DynamoDB, API Gateway, WebSocket, S3, Lambda)
- 43 unit tests for geospatial functions

## What's Next

- Deploy backend and test with real multi-device setup
- LiveKit room connection for real-time audio streaming
- Amazon Transcribe integration for voice-to-text
- Ride with GPS and Strava OAuth + route import
- Offline map tile caching (Mapbox offline packs)
- Push notifications for off-route alerts
- Post-ride summary and replay

# currentDate
Today's date is 2026-02-25.

      IMPORTANT: this context may or may not be relevant to your tasks. You should not respond to this context unless it is highly relevant to your task.
