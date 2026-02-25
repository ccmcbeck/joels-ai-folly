# Joel's AI Folly

## Context

Joel Johnstone wants a group event communication app, primarily for group bike rides. The app helps groups of people stay connected during a shared activity (like a bike ride) by combining navigation, location awareness, and real-time voice communication into a single experience.

## Goals

### Core Features

1. **Route-based turn-by-turn directions** - Load a route and provide participants with navigation guidance throughout the event
2. **Participant location tracking** - Show where all participants are on the route, including relative positioning (e.g., "10 minutes behind you", "2 miles ahead")
3. **Off-route alerts** - Notify participants when they or others have deviated from the planned route
4. **Real-time push-to-talk communication** - Send voice messages to individuals and sub-groups (the most important feature)

### Platform Requirements

- Cross-platform (iPhone and Android) from a single codebase
- Must work reliably in outdoor/cellular conditions

## Constraints

- Must use a cross-platform framework (React Native, Flutter, etc.) to support both iOS and Android
- Real-time voice requires low-latency networking and background audio capabilities
- GPS tracking must work reliably in background mode on both platforms
- Cellular connectivity may be spotty during outdoor events (needs offline/degraded mode consideration)
- Battery consumption is a concern with continuous GPS + audio + networking

## Answers (from Joel, 2026-02-25)

### Group Size
- **Typical: ~150 participants, no theoretical limit**
- Must support large organized events (e.g., Susan G. Komen scale)
- This is a major architectural driver — rules out naive broadcast patterns

### Route Loading
- Primary import from **Ride with GPS** and **Strava**
- Also support **GPX file import**
- App should also be able to **compute routes** natively

### Push-to-Talk
- **Live streaming** (not recorded clips)
- Voice messages must be **transcribed and archived** for later review
- This adds speech-to-text and storage requirements beyond just real-time audio

### Sub-Groups
- Defined **online before the event** (pre-configured)
- Must be **editable during the ride** as well (ad hoc changes)

### Offline Support
- Features that can work offline **should** work offline
- Specifically: **turn-by-turn directions** must work without connectivity
- Implies route data and map tiles must be cached locally before the ride

### MVP Scope
- **Push-to-talk ships first** — this is the highest priority feature
- This reverses the current plan's recommendation of route+location as MVP

### Backend / Infrastructure
- **AWS preferred**, open to suggestions
- This changes the plan from Firebase to AWS-native services

### Organizer Role
- **Yes** — organizer creates the event, loads the route, sends invites
- Organizer can provide an **invite code** as an alternative to direct invites

## Architectural Implications

Joel's answers significantly change several assumptions in the current plan:

1. **Scale (150+ participants)** — Firebase RTDB broadcasting GPS every 3-5s for 150 users won't work with naive fan-out. Need geospatial clustering, server-side aggregation, or a purpose-built location service. At Susan G. Komen scale (thousands), this becomes a distributed systems problem.

2. **AWS instead of Firebase** — The plan currently centers on Firebase (RTDB, Auth, Cloud Functions, FCM). Moving to AWS means re-evaluating with services like:
   - **Amazon Cognito** (auth)
   - **AWS AppSync or API Gateway + WebSockets** (real-time location)
   - **DynamoDB** (location data, event data)
   - **Lambda** (server-side logic)
   - **Amazon SNS/SQS** (notifications)
   - **Amazon Transcribe** (speech-to-text for PTT archival)
   - **S3** (voice message storage, route files)

3. **PTT as MVP** — Push-to-talk is the most technically complex feature (LiveKit/WebRTC, background audio, transcription). Shipping it first means the hardest problem gets solved first, but also means slower time-to-first-usable-app. The plan's milestones need reordering.

4. **Transcription + archival** — Adds a whole pipeline: capture audio → stream to STT service → store transcript + audio file → make searchable/reviewable. This is non-trivial infrastructure.

5. **Route import from Ride with GPS / Strava** — Need API integrations (OAuth flows, route fetch) beyond just GPX file parsing.

6. **Offline turn-by-turn** — Requires pre-caching map tiles along the route corridor and storing route/direction data locally. Mapbox supports this well.
