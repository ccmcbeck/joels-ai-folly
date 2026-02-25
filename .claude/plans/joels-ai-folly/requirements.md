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

## Questions

- What is the target group size? (5 people vs 50 people changes the architecture significantly)
- How are routes loaded? (GPX files, drawn on map, imported from Strava/Komoot/etc.)
- Is push-to-talk live streaming or recorded-and-sent voice clips?
- How are sub-groups defined? (pre-configured, ad hoc during ride, skill-based?)
- Does the app need to work without cellular coverage (mesh networking, pre-cached routes)?
- What's the MVP scope vs full vision? Which of the four features ships first?
- Is there a backend/infrastructure budget or preference (AWS, Firebase, etc.)?
- Who hosts the events - is there an organizer role with special permissions?
