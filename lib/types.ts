export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface RoutePoint extends Coordinate {
  distanceFromStart: number; // meters from route start
}

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

export interface Event {
  id: string;
  name: string;
  route: RoutePoint[];
  participants: Participant[];
  createdAt: number;
}

export interface RelativePosition {
  participantId: string;
  name: string;
  distanceDelta: number; // positive = ahead, negative = behind (meters)
  timeDelta: number; // estimated minutes ahead/behind
  isOffRoute: boolean;
}

export type PTTTarget =
  | { type: "all" }
  | { type: "participant"; id: string; name: string };
