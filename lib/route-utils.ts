import { Coordinate, RoutePoint, RelativePosition, Participant } from "./types";

// Haversine distance between two coordinates in meters
export function haversineDistance(a: Coordinate, b: Coordinate): number {
  const R = 6371000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

// Find the closest point on the route to a given coordinate.
// Returns the distance along the route (meters) and perpendicular distance (meters).
export function snapToRoute(
  point: Coordinate,
  route: RoutePoint[]
): { distanceAlongRoute: number; perpendicularDistance: number } {
  let bestDist = Infinity;
  let bestAlongRoute = 0;

  for (let i = 0; i < route.length - 1; i++) {
    const a = route[i];
    const b = route[i + 1];
    const segLen = haversineDistance(a, b);
    if (segLen === 0) continue;

    // Project point onto segment [a, b]
    const t = Math.max(
      0,
      Math.min(
        1,
        ((point.latitude - a.latitude) * (b.latitude - a.latitude) +
          (point.longitude - a.longitude) * (b.longitude - a.longitude)) /
          ((b.latitude - a.latitude) ** 2 + (b.longitude - a.longitude) ** 2)
      )
    );

    const projected: Coordinate = {
      latitude: a.latitude + t * (b.latitude - a.latitude),
      longitude: a.longitude + t * (b.longitude - a.longitude),
    };

    const dist = haversineDistance(point, projected);
    if (dist < bestDist) {
      bestDist = dist;
      bestAlongRoute = a.distanceFromStart + t * segLen;
    }
  }

  return { distanceAlongRoute: bestAlongRoute, perpendicularDistance: bestDist };
}

// Check if a participant is off-route (> threshold meters from route)
export function isOffRoute(
  point: Coordinate,
  route: RoutePoint[],
  thresholdMeters: number = 100
): boolean {
  const { perpendicularDistance } = snapToRoute(point, route);
  return perpendicularDistance > thresholdMeters;
}

// Compute relative positions of all participants relative to a reference participant
export function computeRelativePositions(
  me: Participant,
  others: Participant[],
  avgSpeedMps: number = 4.5 // ~16 km/h cycling average
): RelativePosition[] {
  return others.map((other) => {
    const distanceDelta = other.distanceAlongRoute - me.distanceAlongRoute;
    const timeDelta = avgSpeedMps > 0 ? distanceDelta / avgSpeedMps / 60 : 0;

    return {
      participantId: other.id,
      name: other.name,
      distanceDelta,
      timeDelta,
      isOffRoute: other.isOffRoute,
    };
  });
}

// Build route points with cumulative distance
export function buildRoutePoints(coords: Coordinate[]): RoutePoint[] {
  const points: RoutePoint[] = [];
  let cumDist = 0;

  for (let i = 0; i < coords.length; i++) {
    if (i > 0) {
      cumDist += haversineDistance(coords[i - 1], coords[i]);
    }
    points.push({ ...coords[i], distanceFromStart: cumDist });
  }

  return points;
}

// Format relative position as human-readable string
export function formatRelativePosition(rel: RelativePosition): string {
  const absDist = Math.abs(rel.distanceDelta);
  const absTime = Math.abs(rel.timeDelta);
  const direction = rel.distanceDelta >= 0 ? "ahead" : "behind";

  if (absDist < 50) return "right with you";

  if (absDist < 1000) {
    return `${Math.round(absDist)}m ${direction}`;
  }

  const km = (absDist / 1000).toFixed(1);
  const min = Math.round(absTime);

  if (min < 1) return `${km} km ${direction}`;
  return `${km} km ${direction} (~${min} min)`;
}

// Bearing from point A to point B in degrees
export function bearing(a: Coordinate, b: Coordinate): number {
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

// Simple turn direction from bearing change
export function turnDirection(
  prevBearing: number,
  nextBearing: number
): string {
  let diff = ((nextBearing - prevBearing) % 360 + 540) % 360 - 180;

  if (Math.abs(diff) < 20) return "Continue straight";
  if (diff > 0 && diff <= 90) return "Turn right";
  if (diff > 90) return "Sharp right";
  if (diff < 0 && diff >= -90) return "Turn left";
  return "Sharp left";
}
