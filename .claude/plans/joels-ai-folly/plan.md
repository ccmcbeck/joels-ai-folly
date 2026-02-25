# Joel's AI Folly - Implementation Plan

## Technology Stack

### Framework: React Native with Expo
- Single codebase for iOS and Android
- Expo provides managed workflow for push notifications, location, and audio
- Large ecosystem and community support
- TypeScript for type safety

### Backend: Firebase + WebRTC
- **Firebase Realtime Database** - Real-time location sharing (low-latency, optimized for frequent small writes)
- **Firebase Auth** - User authentication (phone number or email)
- **Firebase Cloud Functions** - Event management, off-route detection, group logic
- **Firebase Cloud Messaging** - Push notifications for off-route alerts
- **WebRTC via LiveKit** - Real-time push-to-talk audio (open-source, self-hostable, handles rooms/channels natively)

### Mapping: Mapbox
- Turn-by-turn navigation SDK with React Native support
- GPX/GeoJSON route import
- Offline map tile caching for spotty coverage areas
- Customizable map styles to show participant positions

## Architecture Overview

### Three-Layer Design

1. **Client (React Native)** - Map rendering, GPS tracking, audio capture/playback, UI
2. **Real-time layer (Firebase RTDB + LiveKit)** - Location broadcasts, voice channels
3. **Backend logic (Firebase Cloud Functions)** - Route matching, off-route detection, group management, event lifecycle

### Data Flow

- GPS positions broadcast to Firebase RTDB every 3-5 seconds
- Cloud Functions compute relative positions (distance/time along route) and off-route status
- LiveKit manages audio rooms with sub-group channels
- Clients subscribe to location updates and render on Mapbox

## Milestone Plan

### Milestone 1: Project Scaffold + Auth (Week 1-2)
- Expo + React Native project setup with TypeScript
- Firebase project creation and configuration
- User auth flow (phone number sign-up/login)
- Basic app shell with tab navigation (Map, Group, Settings)
- CI/CD with EAS Build for both platforms

### Milestone 2: Route Loading + Map Display (Week 3-4)
- GPX file import (load from device or URL)
- Parse GPX to GeoJSON and render route on Mapbox
- Basic turn-by-turn direction generation from route waypoints
- Offline map tile caching for the route corridor
- Route stored in Firebase per event

### Milestone 3: Location Tracking + Sharing (Week 5-6)
- Background GPS tracking (Expo Location with background permissions)
- Broadcast position to Firebase RTDB at configurable interval
- Render all participant pins on the map in real-time
- Snap participant positions to route and compute along-route distance
- Relative positioning: "Joel is 10 min behind you" based on average pace
- Battery optimization: adaptive GPS interval based on speed

### Milestone 4: Off-Route Detection + Alerts (Week 7-8)
- Cloud Function to compute distance from participant position to nearest route segment
- Configurable threshold (e.g., 100m off-route triggers alert)
- Push notification to the off-route participant
- Group notification: "Joel is off-route" with their last known position
- Visual indicator on map (participant pin changes color)

### Milestone 5: Push-to-Talk Voice (Week 9-12)
- LiveKit integration for real-time audio
- Event-wide channel (all participants)
- Sub-group channels (organizer creates, participants join)
- 1:1 direct voice messages
- Push-to-talk UI: hold-to-talk button, tap-to-toggle mode
- Background audio support (screen off, app backgrounded)
- Audio ducking during turn-by-turn navigation prompts

### Milestone 6: Event Management + Polish (Week 13-14)
- Event creation flow (name, date, route, invite link)
- Organizer role: create sub-groups, manage participants, start/end event
- Participant join via invite link or code
- Event history and replay
- Battery usage optimization pass
- UI/UX polish and accessibility

### Milestone 7: Testing + Launch (Week 15-16)
- Beta testing with real bike ride groups
- TestFlight (iOS) and Internal Testing (Android) distribution
- Performance testing with 20+ simultaneous participants
- App Store and Google Play submission

## Key Technical Decisions

### Why LiveKit over alternatives for push-to-talk
- Purpose-built for real-time audio/video rooms
- Native concept of "rooms" maps to event groups and sub-groups
- Open-source with managed cloud option (flexibility on cost)
- Better battery/bandwidth than rolling custom WebRTC signaling
- Alternatives considered: Agora (expensive at scale), Twilio (overkill), raw WebRTC (too much plumbing)

### Why Firebase RTDB over Firestore for location
- Optimized for high-frequency small writes (GPS every 3-5s)
- Lower latency than Firestore for real-time sync
- Cheaper for this write pattern
- Firestore better for structured event/user data (use both)

### Why Mapbox over Google Maps
- Superior turn-by-turn navigation SDK
- Better offline support
- GPX/GeoJSON native support
- More customizable styling for participant visualization
- Competitive free tier

### Background execution strategy
- iOS: Background location updates + background audio (LiveKit keeps audio session alive)
- Android: Foreground service with persistent notification
- Both platforms: adaptive GPS interval (frequent when moving, infrequent when stopped)

## MVP Recommendation

Ship Milestones 1-3 first (route + location tracking) as the MVP. This gives immediate value (see where everyone is on the ride) with the least technical risk. Push-to-talk (Milestone 5) is the hardest feature and benefits from having the location foundation stable first.

**MVP feature set:**
1. Create event, load GPX route
2. Join event via invite link
3. See all participants on map with turn-by-turn directions
4. Relative position indicators ("10 min behind")

**Post-MVP priority:** Push-to-talk voice, then off-route alerts.

## Cost Estimates (Monthly, 100 active users)

| Service | Estimated Cost |
|---------|---------------|
| Firebase (Auth + RTDB + Functions) | $25-50 |
| LiveKit Cloud | $50-100 |
| Mapbox | Free tier (50k map loads) |
| EAS Build (Expo) | Free tier |
| **Total** | **~$75-150/mo** |

Scales linearly. At 1,000 active users, expect ~$500-800/mo.

## Phase 2: Firebase Backend

Phase 2 builds the real-time backend to replace mock data. This is a prerequisite for multi-device testing and all server-side test coverage.

### Firebase Services

1. **Firebase Auth** - Phone number or email sign-up/login
2. **Firebase Realtime Database** - Location broadcasts (GPS position every 3-5s per participant)
3. **Cloud Firestore** - Structured data (events, users, groups, routes)
4. **Cloud Functions** - Server-side logic:
   - Off-route detection (compare participant position to route, push alerts)
   - Relative position computation (distance/time along route)
   - Event lifecycle (create, join, start, end)
   - Sub-group management
5. **Firebase Cloud Messaging** - Push notifications for off-route alerts and group messages

### Data Model

- `events/{eventId}` - Event metadata (name, route, status, organizer)
- `events/{eventId}/participants/{uid}` - Participant profile and settings
- `locations/{eventId}/{uid}` - Real-time location (RTDB, not Firestore - optimized for frequent writes)
- `users/{uid}` - User profile, event history

### Server-Side Test Coverage

With the Firebase backend in place, server-side tests can cover:
- Cloud Functions unit tests (off-route detection, relative positioning, event lifecycle)
- Security rules tests (Firestore and RTDB access control)
- Integration tests (event creation flow, participant join, location broadcast)

### Deliverables

- Firebase project setup and configuration
- Auth flow integrated into the app
- Real-time location sharing between devices
- Cloud Functions for off-route detection and alerts
- Server-side test suite
- Client updated to use Firebase instead of mock data
