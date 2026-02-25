# CLAUDE.md

## Overview

Joel's AI Folly is a cross-platform mobile app for group event communication, primarily targeting group bike rides. Built with React Native (Expo) and TypeScript.

The app combines four core capabilities:
1. **Route navigation** - Load a route, get turn-by-turn directions
2. **Location sharing** - See where all participants are, with relative positioning ("10 min behind")
3. **Off-route alerts** - Notifications when someone deviates from the route
4. **Push-to-talk** - Real-time voice messages to individuals or sub-groups

## Tech Stack

- **Framework**: React Native with Expo (SDK 52) + TypeScript
- **Navigation**: Expo Router (file-based routing)
- **Maps**: react-native-maps (Apple Maps on iOS, Google Maps on Android)
- **Location**: expo-location (foreground + background GPS)
- **Audio**: expo-av (recording), LiveKit planned for real-time voice
- **Backend**: Firebase planned (currently all mock data)

## Project Structure

```
app/                    # Expo Router screens
  _layout.tsx           # Root layout
  (tabs)/
    _layout.tsx         # Tab navigator (Map, Group, Settings)
    index.tsx           # Map screen - route, participants, nav HUD
    group.tsx           # Participant list with relative positions
    settings.tsx        # Config and profile
components/
  PushToTalk.tsx        # Hold-to-talk button with target picker modal
lib/
  types.ts              # Core types (Participant, RoutePoint, PTTTarget)
  route-utils.ts        # Haversine distance, snap-to-route, turn directions
  mock-data.ts          # Mission Bay bike loop + simulated riders
  location.ts           # GPS permission and watch wrapper
```

## Running

### Prerequisites

- Node.js 18+ (`node --version`)
- npm (`npm --version`)
- Install dependencies: `npm install`

### On a physical device (recommended for GPS)

1. Install **Expo Go** from the App Store (iOS) or Google Play (Android)
2. Run `npx expo start`
3. Scan the QR code with your phone camera (iOS) or Expo Go app (Android)
4. Grant location permission when prompted for live GPS tracking
5. If location permission is denied, the app falls back to simulated movement along the route

### On iOS Simulator

1. Install Xcode from the Mac App Store
2. Run `npx expo start --ios`
3. Simulator uses a fixed location (Apple HQ by default) - the app will use simulated route movement
4. To set a custom location: Simulator menu > Features > Location > Custom Location

### On Android Emulator

1. Install Android Studio and create an AVD (Android Virtual Device)
2. Run `npx expo start --android`
3. To simulate GPS: emulator extended controls > Location

### What you'll see

- **Map tab**: Mission Bay bike loop with route line, your position (blue pin or native dot), 4 simulated riders moving along the route, navigation HUD at top, participant chips at bottom, and push-to-talk button
- **Group tab**: List of all riders with relative positions, speeds, and direct PTT buttons
- **Settings tab**: Profile, alert preferences, GPS config, invite link

## Current State (POC)

- Map with hardcoded Mission Bay 10 km bike loop
- Live GPS tracking (simulated fallback if permission denied)
- 4 simulated participants moving along route
- Relative position display and off-route detection
- Push-to-talk UI (button + target picker, no actual audio transmission)
- No backend - all data is local mock data

## What's Next

- Firebase integration (auth, real-time location sharing, event management)
- LiveKit integration (actual push-to-talk audio)
- GPX file import
- Background location tracking
- Push notifications for off-route alerts
- Event creation and invite flow
