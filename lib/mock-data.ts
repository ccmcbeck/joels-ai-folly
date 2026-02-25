import { Coordinate, Participant, RoutePoint } from "./types";
import { buildRoutePoints, snapToRoute, isOffRoute } from "./route-utils";

// Mission Bay, San Diego bike loop (~10 km)
const MISSION_BAY_COORDS: Coordinate[] = [
  { latitude: 32.7872, longitude: -117.235 },   // Bahia Point (start)
  { latitude: 32.7855, longitude: -117.2385 },   // West along bay
  { latitude: 32.7825, longitude: -117.2415 },
  { latitude: 32.7795, longitude: -117.2435 },   // Bonita Cove
  { latitude: 32.776, longitude: -117.244 },
  { latitude: 32.773, longitude: -117.2425 },    // Ventura Cove
  { latitude: 32.77, longitude: -117.24 },
  { latitude: 32.768, longitude: -117.2365 },    // Belmont Park area
  { latitude: 32.767, longitude: -117.232 },
  { latitude: 32.768, longitude: -117.228 },     // South shore
  { latitude: 32.77, longitude: -117.224 },
  { latitude: 32.773, longitude: -117.221 },
  { latitude: 32.776, longitude: -117.2195 },    // Fiesta Island bridge
  { latitude: 32.779, longitude: -117.219 },
  { latitude: 32.782, longitude: -117.2195 },    // East shore
  { latitude: 32.785, longitude: -117.221 },
  { latitude: 32.7875, longitude: -117.224 },    // De Anza Cove
  { latitude: 32.7895, longitude: -117.2275 },
  { latitude: 32.79, longitude: -117.231 },
  { latitude: 32.7888, longitude: -117.234 },    // Back to start area
  { latitude: 32.7872, longitude: -117.235 },    // Loop complete
];

export const SAMPLE_ROUTE: RoutePoint[] = buildRoutePoints(MISSION_BAY_COORDS);

export const ROUTE_TOTAL_DISTANCE =
  SAMPLE_ROUTE[SAMPLE_ROUTE.length - 1].distanceFromStart;

// Simulated participants at various points along the route
const PARTICIPANT_COLORS = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7"];

const PARTICIPANT_NAMES = ["Joel", "Vito", "Maria", "Alex", "Sam"];

export function createMockParticipants(
  myDistanceAlongRoute: number
): Participant[] {
  const offsets = [800, -1200, 2500, -400]; // meters ahead/behind user
  const now = Date.now();

  return offsets.map((offset, i) => {
    const dist = Math.max(
      0,
      Math.min(ROUTE_TOTAL_DISTANCE, myDistanceAlongRoute + offset)
    );

    // Find the coordinate at this distance along the route
    const coord = coordinateAtDistance(dist);

    // Make one participant off-route for demo
    const isOff = i === 2;
    const location = isOff
      ? {
          latitude: coord.latitude + 0.002,
          longitude: coord.longitude + 0.002,
        }
      : coord;

    return {
      id: `participant-${i}`,
      name: PARTICIPANT_NAMES[i],
      color: PARTICIPANT_COLORS[i],
      location,
      heading: 0,
      speed: 3.5 + Math.random() * 2,
      distanceAlongRoute: dist,
      isOffRoute: isOff,
      lastUpdate: now - Math.random() * 5000,
    };
  });
}

// Interpolate coordinate at a given distance along the route
function coordinateAtDistance(distance: number): Coordinate {
  for (let i = 0; i < SAMPLE_ROUTE.length - 1; i++) {
    const a = SAMPLE_ROUTE[i];
    const b = SAMPLE_ROUTE[i + 1];

    if (distance >= a.distanceFromStart && distance <= b.distanceFromStart) {
      const segLen = b.distanceFromStart - a.distanceFromStart;
      const t = segLen > 0 ? (distance - a.distanceFromStart) / segLen : 0;

      return {
        latitude: a.latitude + t * (b.latitude - a.latitude),
        longitude: a.longitude + t * (b.longitude - a.longitude),
      };
    }
  }

  // Past the end, return last point
  const last = SAMPLE_ROUTE[SAMPLE_ROUTE.length - 1];
  return { latitude: last.latitude, longitude: last.longitude };
}

// Advance simulated participants along the route (call each tick)
export function advanceParticipants(
  participants: Participant[],
  deltaSeconds: number
): Participant[] {
  return participants.map((p) => {
    if (p.isOffRoute) return p; // off-route participant stays put

    const newDist = Math.min(
      ROUTE_TOTAL_DISTANCE,
      p.distanceAlongRoute + p.speed * deltaSeconds
    );
    const newCoord = coordinateAtDistance(newDist);

    return {
      ...p,
      location: newCoord,
      distanceAlongRoute: newDist,
      lastUpdate: Date.now(),
    };
  });
}
