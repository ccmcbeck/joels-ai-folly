# Joel's AI Folly - Kubernetes Implementation Plan

> Alternate plan: same requirements, running on Kubernetes instead of serverless AWS.

## Why Kubernetes

The serverless plan (API Gateway + Lambda + DynamoDB) optimizes for zero ops overhead at small scale. This Kubernetes plan optimizes for:

- **Persistent connections** — WebSockets and LiveKit are long-lived; Lambda's 15-min timeout and cold starts are awkward fits. K8s pods hold connections natively.
- **Predictable costs at scale** — Lambda + API Gateway pricing is per-request. At 150 users broadcasting GPS every 5s, per-request costs add up fast. K8s pods have fixed compute costs regardless of request volume.
- **Colocation** — LiveKit, the API server, and the WebSocket server can run in the same cluster, reducing network hops and latency.
- **Portability** — Not locked into AWS-specific services. Could run on GCP, Azure, or bare metal.
- **Operational control** — Autoscaling, resource limits, rolling deploys, observability all handled by K8s primitives.

## Technology Stack

### Client: React Native with Expo (unchanged)
Same as the serverless plan. The client doesn't care what the backend runs on.

### Backend: Kubernetes on EKS

| Concern | Service | Why |
|---------|---------|-----|
| Auth | Keycloak (K8s deployment) | Open-source IAM, phone/email sign-up, OAuth for Strava/RWGPS, OIDC tokens |
| API | Node.js + Fastify (K8s deployment) | Single API server handles REST + WebSocket, no cold starts |
| Real-time location | Same Fastify server (WebSocket upgrade) | Persistent connections, in-memory event rooms, no API Gateway costs |
| Structured data | PostgreSQL (RDS or in-cluster) | Relational model fits events/users/participants/subgroups well |
| High-write location data | Redis (ElastiCache or in-cluster) | In-memory pub/sub for location fan-out, TTL for auto-expiry |
| Voice (PTT) | LiveKit (K8s deployment) | Self-hosted from day one, same cluster = low latency |
| Transcription | Whisper (K8s job) or Amazon Transcribe | Self-hosted Whisper for cost control, or Transcribe for simplicity |
| Voice archival | S3 (or MinIO in-cluster) | Audio files + transcript metadata |
| Push notifications | Expo Push API (direct HTTP) | No SNS needed — Fastify calls Expo Push directly |
| Route storage | S3 / MinIO + PostgreSQL | Files in object storage, metadata in Postgres |
| Ingress | NGINX Ingress Controller + cert-manager | TLS termination, WebSocket support, path-based routing |
| Observability | Prometheus + Grafana (K8s native) | Metrics, dashboards, alerting |

### Voice: LiveKit on Kubernetes
- Official Helm chart for K8s deployment
- Runs in the same cluster as the API server
- TURN server colocated for NAT traversal
- Egress service writes audio to S3 and triggers transcription jobs
- No external LiveKit Cloud dependency — full control over scaling

### Transcription: Whisper on Kubernetes
- OpenAI Whisper (open-source) runs as a K8s job or deployment
- Process audio files from S3 after egress completes
- GPU node pool for fast transcription (or CPU with slower throughput)
- Alternative: Amazon Transcribe if GPU nodes aren't worth the cost at small scale
- Stores transcripts in PostgreSQL alongside voice message metadata

## Architecture Overview

### Cluster Layout

```
EKS Cluster
├── Namespace: jaf-app
│   ├── Deployment: api-server (Fastify — REST + WebSocket)
│   ├── Deployment: livekit-server
│   ├── Deployment: livekit-egress
│   ├── Deployment: keycloak
│   ├── Deployment: whisper-worker (GPU node pool)
│   ├── StatefulSet: postgresql (or RDS external)
│   ├── StatefulSet: redis (or ElastiCache external)
│   ├── CronJob: location-cleanup (TTL sweep)
│   └── Job: transcribe-{id} (on-demand per egress)
├── Namespace: ingress
│   └── Deployment: nginx-ingress-controller
├── Namespace: monitoring
│   ├── Deployment: prometheus
│   └── Deployment: grafana
```

### Three-Layer Design

1. **Client (React Native)** — Map rendering, GPS tracking, audio capture/playback, offline navigation, UI
2. **Real-time layer (Fastify WebSocket + LiveKit)** — Location broadcasts, voice channels, presence
3. **Backend logic (Fastify API + PostgreSQL + Redis)** — Route matching, off-route detection, group management, event lifecycle, transcription pipeline

### Data Flow — Location (150+ participants)

1. Client opens WebSocket to `wss://api.jaf.app/ws?token=...&eventId=...`
2. Fastify WebSocket handler authenticates via JWT, joins an in-memory event room
3. Client sends GPS position every 5s over the WebSocket
4. Server writes to Redis hash `locations:{eventId}` (key = uid, value = location JSON, TTL 30s)
5. Server publishes to Redis pub/sub channel `event:{eventId}:locations`
6. All API pods subscribed to that channel receive the update
7. Each pod filters for its connected clients: nearby participants + sub-group members
8. Filtered updates pushed to each client over their WebSocket

**Why this beats Lambda for location:**
- No cold starts — connections are persistent
- In-memory rooms avoid a DynamoDB read/write per update
- Redis pub/sub handles cross-pod fan-out with sub-ms latency
- No per-message API Gateway charges

### Data Flow — Push-to-Talk

1. Client requests LiveKit token from API server (`POST /voice/token`)
2. API server generates token using LiveKit server SDK
3. Client connects to LiveKit (same cluster, low latency)
4. Hold-to-talk → unmute → LiveKit streams to room participants
5. LiveKit egress service captures audio → writes to S3
6. Egress completion triggers a Kubernetes Job running Whisper
7. Whisper transcribes → stores transcript in PostgreSQL
8. Client polls or receives push notification that transcript is ready

### Data Flow — Offline Turn-by-Turn

Same as serverless plan — this is entirely client-side.

## Data Model (PostgreSQL)

```sql
-- Users (from Keycloak, synced on first login)
CREATE TABLE users (
  uid         UUID PRIMARY KEY,
  email       TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Events
CREATE TABLE events (
  event_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  date        TIMESTAMPTZ,
  status      TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed')),
  organizer_uid UUID REFERENCES users(uid),
  route_s3_key TEXT,
  invite_code TEXT UNIQUE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_events_invite ON events(invite_code);

-- Participants
CREATE TABLE event_participants (
  event_id    UUID REFERENCES events(event_id),
  uid         UUID REFERENCES users(uid),
  role        TEXT DEFAULT 'participant' CHECK (role IN ('organizer', 'participant')),
  sub_group_id UUID,
  status      TEXT DEFAULT 'active' CHECK (status IN ('active', 'left')),
  joined_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (event_id, uid)
);
CREATE INDEX idx_participants_uid ON event_participants(uid);

-- Sub-groups
CREATE TABLE sub_groups (
  sub_group_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID REFERENCES events(event_id),
  name        TEXT NOT NULL,
  created_by  UUID REFERENCES users(uid),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Voice messages (transcripts + metadata, audio in S3)
CREATE TABLE voice_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID REFERENCES events(event_id),
  speaker_uid UUID REFERENCES users(uid),
  s3_audio_key TEXT,
  transcript  TEXT,
  duration_ms INTEGER,
  target_type TEXT CHECK (target_type IN ('all', 'subgroup', 'direct')),
  target_id   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_voice_event ON voice_messages(event_id, created_at);

-- Location history (for post-ride replay; live data is in Redis)
CREATE TABLE location_history (
  event_id    UUID,
  uid         UUID,
  latitude    DOUBLE PRECISION,
  longitude   DOUBLE PRECISION,
  speed       REAL,
  heading     REAL,
  on_route    BOOLEAN,
  distance_along_route REAL,
  recorded_at TIMESTAMPTZ,
  PRIMARY KEY (event_id, uid, recorded_at)
) PARTITION BY RANGE (recorded_at);
-- Auto-create monthly partitions, drop after 30 days
```

**Redis structures (live data, ephemeral):**

```
# Current location per participant (hash, 30s TTL on each field via app logic)
locations:{eventId} → { uid1: "{lat,lng,speed,...}", uid2: "..." }

# Pub/sub for real-time fan-out across pods
CHANNEL event:{eventId}:locations

# WebSocket connection tracking
ws:connections:{eventId} → SET of connectionIds
```

## Kubernetes Manifests

Infrastructure-as-code via Helm charts:

- **api-server** — Custom Helm chart. Deployment with HPA (2-10 replicas based on WebSocket connection count). Service type ClusterIP. Health checks on `/healthz`.
- **livekit** — Official LiveKit Helm chart. Configured with TURN, egress enabled, S3 output.
- **keycloak** — Bitnami Helm chart. PostgreSQL backend (shared instance). Realm pre-configured with email/phone providers.
- **postgresql** — Bitnami Helm chart (or RDS if preferring managed). 2 replicas with streaming replication.
- **redis** — Bitnami Helm chart (or ElastiCache). Sentinel for HA.
- **whisper-worker** — Custom Helm chart. Deployment with 0 min replicas (scales from zero via KEDA based on S3 queue).
- **nginx-ingress** — Standard ingress-nginx Helm chart. WebSocket timeout set to 1 hour.

## Milestone Plan

Same milestones and timeline as the serverless plan. Differences noted below.

### Milestone 1: Project Scaffold + Auth (Week 1-2)
- EKS cluster setup (or existing cluster if available)
- **Helm chart creation** for api-server, Keycloak, PostgreSQL, Redis
- **Keycloak** setup instead of Cognito (realm, client, email verification)
- API server scaffold: Fastify + TypeScript + Prisma (PostgreSQL ORM)
- CI/CD: GitHub Actions → Docker build → Helm deploy
- Same client work (Expo, tabs, auth screens)

### Milestone 2: Push-to-Talk MVP (Week 3-6)
- **LiveKit Helm chart deployed** in-cluster instead of LiveKit Cloud
- TURN server configured for NAT traversal
- Same client work (LiveKit SDK, hold-to-talk, sub-groups)

### Milestone 3: Voice Transcription + Archival (Week 7-8)
- **Whisper deployment** instead of Amazon Transcribe
- KEDA scaler triggers Whisper jobs when audio lands in S3
- GPU node pool (or CPU-only with slower processing)
- Same client work (voice archive screen)

### Milestones 4-8: Same scope
- Route loading, location sharing, off-route detection, polish, testing
- WebSocket is native Fastify (no API Gateway)
- Location fan-out via Redis pub/sub (no DynamoDB + SNS)
- Off-route detection runs in the API server process (no separate Lambda)

## Key Technical Decisions

### Why Kubernetes over serverless

| Dimension | Serverless (Lambda) | Kubernetes |
|-----------|-------------------|------------|
| WebSocket support | API Gateway WebSocket (managed, per-message cost) | Native in Fastify (free after compute) |
| Cold starts | Yes (100-500ms) | No (pods always warm) |
| LiveKit hosting | Separate ECS cluster or LiveKit Cloud | Same cluster, same network |
| Cost at 150 users | ~$700-1,400/mo (per-request pricing) | ~$400-800/mo (fixed compute) |
| Cost at 1,000 users | ~$2,000-4,000/mo | ~$600-1,200/mo |
| Operational complexity | Low (AWS manages everything) | Medium (need K8s expertise) |
| Vendor lock-in | High (Cognito, DynamoDB, API Gateway) | Low (all open-source, portable) |
| Transcription | Amazon Transcribe ($$$) | Whisper (self-hosted, GPU cost only) |

### Why Fastify for the API server
- Fastest Node.js framework (2x Express throughput)
- Native WebSocket support via `@fastify/websocket`
- TypeScript-first with schema validation
- Single process handles REST + WebSocket — no separate services
- Prisma ORM for type-safe PostgreSQL access

### Why PostgreSQL over DynamoDB
- Relational queries (JOIN participants with events, sub-groups) are natural in SQL
- Event data is relational, not key-value
- PostgreSQL handles the write throughput fine (location history is partitioned)
- Live location data goes through Redis, not Postgres (Postgres is for durable storage)
- Avoids DynamoDB's single-table design complexity

### Why Redis for location fan-out
- In-memory pub/sub with sub-millisecond latency
- Hash data structure perfect for "current location per user" with natural TTL
- Handles the 150-user broadcast problem without per-message costs
- Cross-pod fan-out via Redis pub/sub channels
- Alternative considered: NATS (faster, but Redis already needed for caching)

### Why Keycloak over Cognito
- Open-source, runs in the cluster
- No per-MAU pricing
- Full OAuth2/OIDC — works with Strava and RWGPS OAuth flows out of the box
- Customizable login pages
- Trade-off: more ops overhead than Cognito, but no vendor lock-in

### Why Whisper over Amazon Transcribe
- Open-source, no per-minute pricing
- Better accuracy for noisy outdoor audio (Whisper handles wind/traffic well)
- Runs on GPU nodes in the cluster — cost is fixed compute, not per-audio-hour
- At 1,000 users doing 20 events/week, Transcribe costs $200-400/mo; Whisper GPU node costs ~$100/mo
- Trade-off: need GPU node pool (or accept slower CPU transcription)

## Cost Estimates (Monthly)

### At MVP scale (~100 active users, 5 events/week)

| Resource | Spec | Estimated Cost |
|----------|------|---------------|
| EKS control plane | 1 cluster | $73 |
| API server nodes | 2x t3.medium (on-demand) | $60 |
| LiveKit + Redis nodes | 2x t3.medium | $60 |
| Keycloak + PostgreSQL node | 1x t3.medium | $30 |
| GPU node (Whisper) | 1x g4dn.xlarge (spot, scales to 0) | $40 |
| S3 (audio storage) | ~50 GB | $1 |
| Load Balancer (NLB) | 1 | $16 |
| Mapbox | Free tier | $0 |
| EAS Build (Expo) | Free tier | $0 |
| **Total** | | **~$280/mo** |

### At target scale (~1,000 active users, 20 events/week)

| Resource | Spec | Estimated Cost |
|----------|------|---------------|
| EKS control plane | 1 cluster | $73 |
| API server nodes | 4x t3.large (HPA) | $240 |
| LiveKit nodes | 3x c5.xlarge | $300 |
| Redis (ElastiCache) | r6g.large | $90 |
| PostgreSQL (RDS) | db.r6g.large | $140 |
| GPU node (Whisper) | 2x g4dn.xlarge (spot) | $160 |
| S3 | ~500 GB | $12 |
| Load Balancer (NLB) | 1 | $16 |
| Mapbox | $100-200 |
| **Total** | | **~$1,130-1,230/mo** |

### Cost Comparison vs Serverless

| Scale | Serverless | Kubernetes | Savings |
|-------|-----------|------------|---------|
| MVP (100 users) | $95-190/mo | ~$280/mo | Serverless cheaper by ~$100 |
| Target (1,000 users) | $700-1,400/mo | ~$1,130-1,230/mo | Comparable |
| Large (5,000+ users) | $3,500-7,000/mo | ~$2,000-3,000/mo | K8s saves 40-60% |

**Crossover point: ~500-800 active users.** Below that, serverless wins on cost. Above that, K8s wins on cost and performance.

## Hybrid Option

A practical middle ground: **start serverless, migrate to K8s when scale justifies it.**

The API server code (Fastify + Prisma) works in both environments:
- **Phase 1** — Run Fastify in a single ECS Fargate task or even Lambda via adapter. Use RDS PostgreSQL and ElastiCache Redis. Use LiveKit Cloud. Use Amazon Transcribe.
- **Phase 2** — When hitting 500+ users, migrate to EKS. Deploy LiveKit in-cluster. Add Whisper. Drop Cognito for Keycloak.

The client code doesn't change at all — it talks to the same REST + WebSocket API regardless of what's behind the load balancer.

## Open Questions

- **Managed vs in-cluster databases**: RDS + ElastiCache (less ops, more cost) vs PostgreSQL + Redis in K8s (more ops, less cost)?
- **GPU for Whisper**: Dedicated GPU nodes or CPU-only transcription (slower but cheaper)?
- **Existing cluster**: Does Joel have an existing K8s cluster, or does this need a fresh EKS setup?
- **Ops expertise**: Who manages the cluster? K8s requires ongoing maintenance (upgrades, node rotation, monitoring).
- **Hybrid start**: Start with the serverless implementation (already built) and migrate to K8s when scale demands it?
