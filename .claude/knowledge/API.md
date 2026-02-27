# API Reference

The frontend communicates with the backend over two channels:
- **REST API** — event/auth/voice management (`EXPO_PUBLIC_API_URL`)
- **WebSocket** — real-time location broadcast (`EXPO_PUBLIC_WS_URL`)

All REST endpoints require `Authorization: Bearer <CognitoIdToken>`.

---

## Authentication

### Token Flow

1. User signs in via AWS Cognito (aws-amplify)
2. Cognito returns an IdToken (JWT)
3. REST calls: `Authorization: Bearer <idToken>` header
4. WebSocket: `?token=<idToken>` query param (API Gateway limitation)
5. A `POST_CONFIRMATION` Lambda trigger creates the user record in DynamoDB on first sign-up

### Cognito User Pool
- Sign-in: email + password (SRP flow)
- Password policy: 8+ characters
- Auto-verified email on sign-up (dev convenience)

---

## REST Endpoints

### Events

**`POST /events`** — Create event

Request:
```json
{ "name": "string", "date": "ISO timestamp (optional)" }
```

Response (201):
```json
{
  "eventId": "string",
  "name": "string",
  "date": "ISO timestamp",
  "status": "draft",
  "organizerUid": "string",
  "inviteCode": "string (6-char, no I/O/1/l)",
  "createdAt": "ISO timestamp"
}
```

---

**`GET /events`** — List user's events

Response (200): `EventData[]` sorted by `createdAt` desc

---

**`GET /events/{eventId}`** — Get event with participants and sub-groups

Response (200):
```json
{
  "eventId": "string",
  "name": "string",
  "date": "string",
  "status": "draft | active | completed",
  "organizerUid": "string",
  "inviteCode": "string",
  "createdAt": "string",
  "participants": "EventParticipant[]",
  "subGroups": "SubGroup[]"
}
```

Errors: 400 (missing eventId), 404 (not found)

---

**`POST /events/join`** — Join event by invite code

Request:
```json
{ "inviteCode": "string" }
```

Response (200): `EventData`

Behavior: Idempotent — rejoining an event you're already in does not fail.

Errors: 400 (missing code), 404 (invalid code)

---

### Voice (Push-to-Talk)

**`POST /voice/token`** — Get LiveKit room token

Request:
```json
{
  "eventId": "string",
  "channelType": "all | subgroup | direct",
  "channelId": "string (required for subgroup/direct)"
}
```

Response (200):
```json
{
  "token": "JWT string",
  "roomName": "string",
  "url": "LiveKit server URL"
}
```

**Room name mapping:**

| channelType | roomName |
|-------------|----------|
| `all` | `event-{eventId}` |
| `subgroup` | `event-{eventId}-sg-{subGroupId}` |
| `direct` | `event-{eventId}-dm-{uid1}-{uid2}` (UIDs sorted so both sides reach the same room) |

Token TTL: 4 hours. Grants: `canPublish`, `canSubscribe`, `roomJoin`.

Errors: 400 (missing fields, invalid channelType, LiveKit not configured), 401

---

**`POST /voice/egress-webhook`** — LiveKit egress completion webhook

No auth required. Called by LiveKit when a room recording finishes.

Request:
```json
{
  "event": "egress_ended",
  "egressInfo": {
    "egressId": "string",
    "roomName": "string",
    "status": "string",
    "file": {
      "filename": "string",
      "duration": 60,
      "size": 1024,
      "location": "s3://bucket/path"
    }
  }
}
```

Response (200): `{ "status": "stored | ignored" }`

Behavior: Parses `roomName` to extract `eventId`, stores `VoiceMessage` record with S3 audio location. Transcript field reserved for future Transcribe integration.

---

### Endpoints Not Yet Implemented

Frontend service stubs exist but backend handlers not yet deployed:

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/events/{eventId}/start` | Start event |
| `POST` | `/events/{eventId}/end` | End event |
| `POST` | `/events/{eventId}/leave` | Leave event |
| `POST` | `/events/{eventId}/route` | Upload parsed route |
| `POST` | `/events/{eventId}/subgroups` | Create sub-group |
| `PUT` | `/events/{eventId}/subgroups/{id}` | Update sub-group members |
| `DELETE` | `/events/{eventId}/subgroups/{id}` | Delete sub-group |
| `GET` | `/events/{eventId}/voice` | List archived voice messages |

---

## WebSocket (Location Sharing)

**Connect:** `wss://{EXPO_PUBLIC_WS_URL}?token={idToken}&eventId={eventId}`

Connection records stored in DynamoDB with 4-hour TTL.

### Client → Server: Location broadcast

```json
{
  "action": "broadcast",
  "eventId": "string",
  "latitude": 32.7,
  "longitude": -117.2,
  "speed": 5.0,
  "heading": 270.0,
  "accuracy": 10.0,
  "onRoute": true,
  "distanceAlongRoute": 1200
}
```

### Server → All other clients in same event

```json
{
  "type": "locationUpdates",
  "updates": [
    {
      "uid": "string",
      "latitude": 32.7,
      "longitude": -117.2,
      "speed": 5.0,
      "heading": 270.0,
      "accuracy": 10.0,
      "onRoute": true,
      "distanceAlongRoute": 1200,
      "timestamp": 1700000000000
    }
  ]
}
```

Stale connections (410 status from API Gateway) are automatically removed from DynamoDB.

---

## DynamoDB Tables

| Table | PK | SK | Notes |
|-------|----|----|-------|
| `jaf-events` | `eventId` | — | GSI: `inviteCode-index` |
| `jaf-users` | `uid` | — | Created by Cognito trigger |
| `jaf-event-participants` | `eventId` | `uid` | GSI: `uid-index` |
| `jaf-sub-groups` | `eventId` | `subGroupId` | |
| `jaf-locations` | `eventId` | `uid#timestamp` | TTL: 24h |
| `jaf-voice-messages` | `eventId` | `timestamp#egressId` | |
| `jaf-ws-connections` | `connectionId` | — | GSI: `eventId-index`, TTL: 4h |

---

## Frontend Service Layer

| Service | File | Responsibility |
|---------|------|---------------|
| `authService` | `lib/services/auth.ts` | Cognito sign-in/up/out, token extraction |
| `api` | `lib/services/api.ts` | Generic REST client, injects auth header |
| `eventService` | `lib/services/events.ts` | Event CRUD wrappers |
| `livekitService` | `lib/services/livekit.ts` | PTT token fetch, room management |
| `locationSharing` | `lib/services/location-sharing.ts` | WebSocket connect/broadcast/reconnect |
| `routeService` | `lib/services/routes.ts` | GPX/Strava/RWGPS import |
