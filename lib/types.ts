// ---- Geo / Route types ----

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface RoutePoint extends Coordinate {
  distanceFromStart: number; // meters from route start
}

// ---- User / Auth types ----

export interface User {
  uid: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
}

// ---- Event types ----

export type EventStatus = 'draft' | 'active' | 'completed';

export interface EventData {
  id: string;
  name: string;
  date: string;
  status: EventStatus;
  organizerUid: string;
  routeS3Key?: string;
  inviteCode: string;
  createdAt: string;
}

export interface EventParticipant {
  uid: string;
  displayName: string;
  role: 'organizer' | 'participant';
  subGroupId?: string;
  status: 'active' | 'left';
}

export interface SubGroup {
  subGroupId: string;
  name: string;
  memberUids: string[];
  createdBy: string;
}

// ---- Participant (map/tracking) types ----

export interface Participant {
  id: string;
  name: string;
  color: string;
  location: Coordinate;
  heading: number;
  speed: number; // m/s
  distanceAlongRoute: number; // meters from route start
  isOffRoute: boolean;
  lastUpdate: number; // timestamp
}

export interface RelativePosition {
  participantId: string;
  name: string;
  distanceDelta: number; // positive = ahead, negative = behind (meters)
  timeDelta: number; // estimated minutes ahead/behind
  isOffRoute: boolean;
}

// ---- Location sharing types ----

export interface LocationUpdate {
  uid: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  accuracy: number;
  onRoute: boolean;
  distanceAlongRoute: number;
  timestamp: number;
}

// ---- Push-to-talk types ----

export type PTTTarget =
  | { type: 'all' }
  | { type: 'subgroup'; subGroupId: string; name: string }
  | { type: 'direct'; uid: string; name: string };

export interface VoiceMessage {
  id: string;
  eventId: string;
  speakerUid: string;
  speakerName: string;
  transcript?: string;
  durationMs: number;
  targetType: 'all' | 'subgroup' | 'direct';
  targetId?: string;
  audioUrl?: string;
  timestamp: string;
}

// ---- Legacy Event type (for mock data compatibility) ----

export interface Event {
  id: string;
  name: string;
  route: RoutePoint[];
  participants: Participant[];
  createdAt: number;
}
