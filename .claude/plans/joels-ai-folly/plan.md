# Joel's AI Folly - Implementation Plan

> Revised 2026-02-25 based on Joel's requirements answers.

## Technology Stack

### Framework: React Native with Expo
- Single codebase for iOS and Android
- Expo provides managed workflow for push notifications, location, and audio
- Large ecosystem and community support
- TypeScript for type safety

### Backend: AWS

| Concern | Service | Why |
|---------|---------|-----|
| Auth | Amazon Cognito | Phone/email sign-up, OAuth for Strava/RWGPS, scales to millions |
| Real-time location | API Gateway WebSocket API + Lambda | Handles 150+ concurrent connections per event, server-side fan-out |
| Structured data | DynamoDB | Single-digit ms latency, scales horizontally, pay-per-request |
| Voice (PTT) | LiveKit (self-hosted on ECS or LiveKit Cloud) | Purpose-built audio rooms, sub-group channels, open-source |
| Transcription | Amazon Transcribe Streaming | Real-time STT on live audio, integrates with S3 for archival |
| Voice archival | S3 + DynamoDB | Audio files in S3, transcripts + metadata in DynamoDB |
| Push notifications | Amazon SNS + Expo Push | Off-route alerts, group messages |
| Compute | Lambda (API) + ECS (LiveKit) | Serverless for API/events, containers for stateful audio |
| Route storage | S3 (GPX/GeoJSON files) + DynamoDB (metadata) | Cheap bulk storage + fast lookups |
| CDN / API | CloudFront + API Gateway REST | Static assets, API throttling |

### Voice: LiveKit
- Purpose-built for real-time audio rooms
- Native concept of "rooms" maps to event-wide and sub-group channels
- Open-source with managed cloud option (LiveKit Cloud for MVP, self-hosted ECS for scale)
- Supports server-side audio egress for transcription pipeline
- Better battery/bandwidth than rolling custom WebRTC signaling
- Alternatives considered: Agora (expensive at 150+ users), Twilio (overkill), raw WebRTC (too much plumbing)

### Mapping: Mapbox
- Turn-by-turn navigation SDK with React Native support
- GPX/GeoJSON route import
- Offline map tile caching for spotty coverage areas
- Customizable map styles to show participant positions
- Offline pack download API for pre-caching route corridors

## Architecture Overview

### Three-Layer Design

1. **Client (React Native)** - Map rendering, GPS tracking, audio capture/playback, offline navigation, UI
2. **Real-time layer (WebSocket API + LiveKit)** - Location broadcasts, voice channels, presence
3. **Backend logic (Lambda + DynamoDB)** - Route matching, off-route detection, group management, event lifecycle, transcription pipeline

### Data Flow — Location (150+ participants)

Naive broadcast (every client gets every update) doesn't work at 150 participants. Instead:

1. Client sends GPS position to WebSocket API every 5s
2. Lambda writes to DynamoDB (`locations` table, TTL for auto-cleanup)
3. Lambda publishes to SNS topic partitioned by event
4. Fan-out Lambda computes:
   - Nearby participants (within configurable radius, e.g., 500m)
   - Sub-group members
   - Off-route status
5. Server pushes **filtered updates** back through WebSocket — each client only receives positions for nearby participants + their sub-group (not all 150)
6. Full participant list available on-demand (pull, not push) for the Group tab

This keeps WebSocket payload manageable regardless of event size.

### Data Flow — Push-to-Talk

1. Client joins LiveKit room (one room per event, sub-rooms per sub-group)
2. Hold-to-talk → client unmutes mic → LiveKit streams audio to room participants
3. LiveKit server-side egress captures audio stream
4. Audio egress → Lambda → Amazon Transcribe Streaming → transcript stored in DynamoDB
5. Raw audio stored in S3 (referenced by event + timestamp + speaker)
6. Clients can browse archived voice messages with transcripts in post-ride review

### Data Flow — Offline Turn-by-Turn

1. Before ride: client downloads Mapbox offline pack for route corridor (tiles + route data)
2. Route waypoints + turn instructions cached in local SQLite/AsyncStorage
3. GPS continues in background — turn instructions computed locally against cached route
4. When connectivity returns, location history syncs to server

## Data Model (DynamoDB)

### Tables

**events**
- PK: `eventId`
- Attributes: name, date, status (draft/active/completed), organizerUid, routeS3Key, inviteCode, createdAt

**users**
- PK: `uid`
- Attributes: displayName, email, phone, avatarUrl, createdAt

**event-participants**
- PK: `eventId`, SK: `uid`
- Attributes: role (organizer/participant), subGroupId, joinedAt, status (active/left)

**sub-groups**
- PK: `eventId`, SK: `subGroupId`
- Attributes: name, createdBy, createdAt

**locations** (high-write table, TTL-enabled)
- PK: `eventId`, SK: `uid#timestamp`
- Attributes: lat, lng, speed, heading, accuracy, onRoute (bool), distanceAlongRoute
- TTL: 24h after event ends (keep for post-ride replay, then expire)

**voice-messages**
- PK: `eventId`, SK: `timestamp#speakerUid`
- Attributes: s3AudioKey, transcript, durationMs, targetType (all/subgroup/direct), targetId

## Milestone Plan

Milestones reordered per Joel's priority: **push-to-talk ships first**.

### Milestone 1: Project Scaffold + Auth (Week 1-2)
- Expo + React Native project setup with TypeScript
- AWS account setup (Cognito, API Gateway, DynamoDB, S3)
- CDK or SAM infrastructure-as-code for all AWS resources
- User auth flow (phone number or email via Cognito)
- Basic app shell with tab navigation (Map, Group, Settings)
- CI/CD with EAS Build for both platforms
- Event creation and invite code flow (organizer role)

### Milestone 2: Push-to-Talk MVP (Week 3-6)
- LiveKit Cloud account setup (managed hosting for MVP)
- LiveKit React Native SDK integration
- Event-wide audio room (all participants hear each other)
- Hold-to-talk UI: press-and-hold button, visual feedback
- Sub-group channels: organizer creates groups pre-ride, participants join
- Sub-group editing during ride (add/remove members, create new groups)
- 1:1 direct voice messages (private LiveKit rooms)
- Background audio support (screen off, app backgrounded)
- Target picker: choose all/sub-group/individual before talking
- **This is the MVP delivery** — test with real users on a ride

### Milestone 3: Voice Transcription + Archival (Week 7-8)
- LiveKit egress configuration (server-side audio capture)
- Lambda pipeline: egress audio → Amazon Transcribe Streaming → transcript
- Audio files stored in S3, transcripts in DynamoDB
- In-app voice message history: browse by event, speaker, timestamp
- Transcript search within an event
- Playback of archived voice messages

### Milestone 4: Route Loading + Map Display (Week 9-10)
- GPX file import (load from device storage)
- Ride with GPS API integration (OAuth + route fetch)
- Strava API integration (OAuth + route fetch)
- Parse GPX/route data to GeoJSON and render on Mapbox
- Turn-by-turn direction generation from route waypoints
- Route stored in S3 per event, metadata in DynamoDB
- Offline map tile caching: download Mapbox offline pack for route corridor
- Offline turn-by-turn: cache route + directions locally, compute turns from GPS

### Milestone 5: Location Tracking + Sharing (Week 11-13)
- Background GPS tracking (Expo Location with background permissions)
- WebSocket API connection for location broadcasts
- Server-side filtered fan-out (nearby participants + sub-group members)
- Render participant positions on Mapbox in real-time
- Snap positions to route and compute along-route distance
- Relative positioning: "Joel is 10 min behind" based on route progress
- Full participant list in Group tab (pull-based, not real-time push)
- Battery optimization: adaptive GPS interval based on speed
- Scale testing with 150+ simulated connections

### Milestone 6: Off-Route Detection + Alerts (Week 14-15)
- Lambda computes distance from participant position to nearest route segment
- Configurable threshold (e.g., 100m off-route triggers alert)
- Push notification via SNS + Expo Push to the off-route participant
- Group notification: "Joel is off-route" with last known position
- Visual indicator on map (participant marker changes color)
- Audio ducking during turn-by-turn navigation prompts (when PTT is active)

### Milestone 7: Event Management + Polish (Week 16-18)
- Event creation flow polish (name, date, route, invite link + invite code)
- Organizer dashboard: manage sub-groups, view participant status, start/end event
- Post-ride summary: route replay, voice message archive, participant stats
- Battery usage optimization pass
- UI/UX polish and accessibility
- Performance testing at scale (150+ participants, multiple sub-groups)

### Milestone 8: Testing + Launch (Week 19-20)
- Beta testing with real bike ride groups (target: 50+ participant ride)
- TestFlight (iOS) and Internal Testing (Android) distribution
- Load testing: 150 concurrent users, 10 sub-groups, continuous PTT
- Security audit (auth flows, WebSocket access, S3 permissions)
- App Store and Google Play submission

## Key Technical Decisions

### Why AWS over Firebase
- Joel prefers AWS
- Better fit for scale: 150+ participants means high-write location data, server-side fan-out, and audio processing — all areas where AWS has purpose-built services
- Amazon Transcribe for voice-to-text (no Firebase equivalent)
- Infrastructure-as-code with CDK gives reproducible deployments
- More cost-effective at scale than Firebase RTDB for high-frequency writes
- Trade-off: more setup complexity than Firebase, but more control

### Why LiveKit over alternatives for push-to-talk
- Purpose-built for real-time audio rooms
- Native concept of "rooms" maps to event groups and sub-groups
- Server-side egress enables transcription pipeline without client-side complexity
- Open-source with managed cloud option (LiveKit Cloud for MVP, self-host on ECS later)
- Better battery/bandwidth than rolling custom WebRTC signaling
- Alternatives considered: Agora (expensive at 150+ scale), Twilio (overkill), raw WebRTC (too much plumbing)

### Why Mapbox over Google Maps
- Superior turn-by-turn navigation SDK
- Offline pack download API for pre-caching route corridors (critical requirement)
- GPX/GeoJSON native support
- More customizable styling for participant visualization
- Competitive free tier

### Location fan-out strategy (150+ participants)
- Problem: 150 users x updates every 5s = 30 writes/sec + 150 x 30 = 4,500 messages/sec if naive broadcast
- Solution: server-side filtering — each client receives only nearby participants + sub-group members
- DynamoDB handles the write throughput; Lambda computes filtered views; WebSocket pushes targeted updates
- Group tab uses pull-based full list (acceptable latency for a list view)

### Background execution strategy
- iOS: Background location updates + background audio (LiveKit keeps audio session alive)
- Android: Foreground service with persistent notification
- Both platforms: adaptive GPS interval (frequent when moving, infrequent when stopped)
- Offline: local turn-by-turn continues without connectivity; location history queued for sync

### Transcription architecture
- LiveKit egress streams audio server-side (no client upload needed)
- Amazon Transcribe Streaming processes in near-real-time
- Transcripts stored in DynamoDB alongside audio S3 references
- Trade-off: streaming transcription costs more than batch, but enables near-real-time transcript availability
- Future: could add sentiment analysis or keyword alerts on transcripts

## Cost Estimates (Monthly)

### At MVP scale (~100 active users, 5 events/week)

| Service | Estimated Cost |
|---------|---------------|
| Cognito | Free tier (50k MAU) |
| API Gateway WebSocket | $5-10 |
| DynamoDB (on-demand) | $10-20 |
| Lambda | $5-10 |
| LiveKit Cloud | $50-100 |
| Amazon Transcribe | $20-40 (based on audio hours) |
| S3 (audio storage) | $5-10 |
| Mapbox | Free tier (50k map loads) |
| EAS Build (Expo) | Free tier |
| **Total** | **~$95-190/mo** |

### At target scale (~1,000 active users, 20 events/week)

| Service | Estimated Cost |
|---------|---------------|
| Cognito | Free tier |
| API Gateway WebSocket | $50-100 |
| DynamoDB | $100-200 |
| Lambda | $30-60 |
| LiveKit (self-hosted ECS) | $200-400 |
| Amazon Transcribe | $200-400 |
| S3 | $20-50 |
| Mapbox | $100-200 |
| **Total** | **~$700-1,400/mo** |

Transcription is the largest variable cost — could be reduced with batch processing (transcribe after ride instead of real-time) at the expense of immediacy.

## Open Questions

- **LiveKit hosting**: Start with LiveKit Cloud (simpler) or self-host on ECS from day one (cheaper at scale)?
- **Transcription timing**: Real-time streaming transcription during ride, or batch after ride ends? (Cost vs immediacy trade-off)
- **Route computation**: "Computed by the app" — does this mean routing between waypoints (needs a routing engine like OSRM/Mapbox Directions API)?
- **Event size tiers**: Should the app behave differently for small rides (10 people, everyone sees everyone) vs large events (150+, filtered views)? Or one model for all?
- **Post-ride review UX**: How important is the voice archive? Simple chronological list, or searchable/filterable with speaker attribution?
