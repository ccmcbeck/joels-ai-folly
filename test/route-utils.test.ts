import {
  haversineDistance,
  snapToRoute,
  isOffRoute,
  computeRelativePositions,
  buildRoutePoints,
  formatRelativePosition,
  bearing,
  turnDirection,
} from "@/lib/route-utils";
import { Coordinate, Participant, RelativePosition, RoutePoint } from "@/lib/types";

// Simple 3-point route for testing: a straight line heading east
const SIMPLE_COORDS: Coordinate[] = [
  { latitude: 32.78, longitude: -117.24 },
  { latitude: 32.78, longitude: -117.23 },
  { latitude: 32.78, longitude: -117.22 },
];

const SIMPLE_ROUTE: RoutePoint[] = buildRoutePoints(SIMPLE_COORDS);

// L-shaped route for turn detection
const L_COORDS: Coordinate[] = [
  { latitude: 32.78, longitude: -117.24 },  // start heading east
  { latitude: 32.78, longitude: -117.23 },  // turn north
  { latitude: 32.79, longitude: -117.23 },  // end
];

const L_ROUTE: RoutePoint[] = buildRoutePoints(L_COORDS);

function makeParticipant(overrides: Partial<Participant>): Participant {
  return {
    id: "p1",
    name: "Test",
    color: "#fff",
    location: { latitude: 32.78, longitude: -117.23 },
    heading: 0,
    speed: 4.5,
    distanceAlongRoute: 0,
    isOffRoute: false,
    lastUpdate: Date.now(),
    ...overrides,
  };
}

describe("haversineDistance", () => {
  it("returns 0 for identical points", () => {
    const p = { latitude: 32.78, longitude: -117.23 };
    expect(haversineDistance(p, p)).toBe(0);
  });

  it("computes a known distance approximately", () => {
    // ~1 degree longitude at 32.78°N ≈ 93.5 km
    const a = { latitude: 32.78, longitude: -117.24 };
    const b = { latitude: 32.78, longitude: -117.23 };
    const dist = haversineDistance(a, b);
    expect(dist).toBeGreaterThan(800);
    expect(dist).toBeLessThan(1000);
  });

  it("is symmetric", () => {
    const a = { latitude: 32.78, longitude: -117.24 };
    const b = { latitude: 32.79, longitude: -117.23 };
    expect(haversineDistance(a, b)).toBeCloseTo(haversineDistance(b, a), 5);
  });
});

describe("buildRoutePoints", () => {
  it("sets first point distance to 0", () => {
    expect(SIMPLE_ROUTE[0].distanceFromStart).toBe(0);
  });

  it("computes cumulative distances", () => {
    for (let i = 1; i < SIMPLE_ROUTE.length; i++) {
      expect(SIMPLE_ROUTE[i].distanceFromStart).toBeGreaterThan(
        SIMPLE_ROUTE[i - 1].distanceFromStart
      );
    }
  });

  it("total distance is roughly double the first segment for a uniform route", () => {
    const seg1 = SIMPLE_ROUTE[1].distanceFromStart;
    const total = SIMPLE_ROUTE[2].distanceFromStart;
    // Both segments are ~0.01° longitude at same latitude, so roughly equal
    expect(total / seg1).toBeCloseTo(2, 0);
  });
});

describe("snapToRoute", () => {
  it("snaps an on-route point with zero perpendicular distance", () => {
    const onRoute = { latitude: 32.78, longitude: -117.235 };
    const { perpendicularDistance } = snapToRoute(onRoute, SIMPLE_ROUTE);
    expect(perpendicularDistance).toBeLessThan(1); // < 1 meter
  });

  it("returns correct along-route distance for the midpoint", () => {
    const mid = SIMPLE_ROUTE[1]; // middle point
    const { distanceAlongRoute } = snapToRoute(mid, SIMPLE_ROUTE);
    expect(distanceAlongRoute).toBeCloseTo(mid.distanceFromStart, -1);
  });

  it("detects perpendicular distance for an off-route point", () => {
    const offRoute = { latitude: 32.785, longitude: -117.235 }; // ~550m north
    const { perpendicularDistance } = snapToRoute(offRoute, SIMPLE_ROUTE);
    expect(perpendicularDistance).toBeGreaterThan(400);
    expect(perpendicularDistance).toBeLessThan(700);
  });

  it("snaps to start for a point before the route", () => {
    const before = { latitude: 32.78, longitude: -117.25 };
    const { distanceAlongRoute } = snapToRoute(before, SIMPLE_ROUTE);
    expect(distanceAlongRoute).toBe(0);
  });
});

describe("isOffRoute", () => {
  it("returns false for an on-route point", () => {
    const onRoute = { latitude: 32.78, longitude: -117.235 };
    expect(isOffRoute(onRoute, SIMPLE_ROUTE, 100)).toBe(false);
  });

  it("returns true for a point far from the route", () => {
    const far = { latitude: 32.79, longitude: -117.235 };
    expect(isOffRoute(far, SIMPLE_ROUTE, 100)).toBe(true);
  });

  it("respects custom threshold", () => {
    const slightly = { latitude: 32.7805, longitude: -117.235 }; // ~55m north
    expect(isOffRoute(slightly, SIMPLE_ROUTE, 50)).toBe(true);
    expect(isOffRoute(slightly, SIMPLE_ROUTE, 200)).toBe(false);
  });
});

describe("computeRelativePositions", () => {
  it("returns correct ahead/behind deltas", () => {
    const me = makeParticipant({ id: "me", distanceAlongRoute: 1000 });
    const ahead = makeParticipant({ id: "p1", name: "Ahead", distanceAlongRoute: 1500 });
    const behind = makeParticipant({ id: "p2", name: "Behind", distanceAlongRoute: 500 });

    const relatives = computeRelativePositions(me, [ahead, behind]);

    const relAhead = relatives.find((r) => r.participantId === "p1")!;
    expect(relAhead.distanceDelta).toBe(500);
    expect(relAhead.timeDelta).toBeGreaterThan(0);

    const relBehind = relatives.find((r) => r.participantId === "p2")!;
    expect(relBehind.distanceDelta).toBe(-500);
    expect(relBehind.timeDelta).toBeLessThan(0);
  });

  it("returns zero delta for same position", () => {
    const me = makeParticipant({ id: "me", distanceAlongRoute: 1000 });
    const same = makeParticipant({ id: "p1", distanceAlongRoute: 1000 });

    const [rel] = computeRelativePositions(me, [same]);
    expect(rel.distanceDelta).toBe(0);
    expect(rel.timeDelta).toBe(0);
  });

  it("includes off-route status", () => {
    const me = makeParticipant({ id: "me", distanceAlongRoute: 1000 });
    const offRoute = makeParticipant({ id: "p1", isOffRoute: true, distanceAlongRoute: 1200 });

    const [rel] = computeRelativePositions(me, [offRoute]);
    expect(rel.isOffRoute).toBe(true);
  });
});

describe("formatRelativePosition", () => {
  it("shows 'right with you' for very close participants", () => {
    const rel: RelativePosition = {
      participantId: "p1",
      name: "Joel",
      distanceDelta: 30,
      timeDelta: 0.1,
      isOffRoute: false,
    };
    expect(formatRelativePosition(rel)).toBe("right with you");
  });

  it("shows meters for short distances", () => {
    const rel: RelativePosition = {
      participantId: "p1",
      name: "Joel",
      distanceDelta: 500,
      timeDelta: 1.8,
      isOffRoute: false,
    };
    const result = formatRelativePosition(rel);
    expect(result).toContain("500m");
    expect(result).toContain("ahead");
  });

  it("shows km and minutes for long distances", () => {
    const rel: RelativePosition = {
      participantId: "p1",
      name: "Joel",
      distanceDelta: -2500,
      timeDelta: -9.3,
      isOffRoute: false,
    };
    const result = formatRelativePosition(rel);
    expect(result).toContain("2.5 km");
    expect(result).toContain("behind");
    expect(result).toContain("9 min");
  });
});

describe("bearing", () => {
  it("returns ~90° for due east", () => {
    const a = { latitude: 32.78, longitude: -117.24 };
    const b = { latitude: 32.78, longitude: -117.23 };
    const b1 = bearing(a, b);
    expect(b1).toBeGreaterThan(85);
    expect(b1).toBeLessThan(95);
  });

  it("returns ~0° for due north", () => {
    const a = { latitude: 32.78, longitude: -117.23 };
    const b = { latitude: 32.79, longitude: -117.23 };
    const b1 = bearing(a, b);
    expect(b1).toBeLessThan(5); // 0° = due north
  });

  it("returns ~180° for due south", () => {
    const a = { latitude: 32.79, longitude: -117.23 };
    const b = { latitude: 32.78, longitude: -117.23 };
    const b1 = bearing(a, b);
    expect(b1).toBeGreaterThan(175);
    expect(b1).toBeLessThan(185);
  });
});

describe("turnDirection", () => {
  it("detects straight ahead", () => {
    expect(turnDirection(90, 95)).toBe("Continue straight");
  });

  it("detects right turn", () => {
    expect(turnDirection(90, 180)).toBe("Turn right");
  });

  it("detects left turn", () => {
    expect(turnDirection(180, 90)).toBe("Turn left");
  });

  it("detects sharp right", () => {
    expect(turnDirection(0, 150)).toBe("Sharp right");
  });

  it("detects sharp left", () => {
    expect(turnDirection(150, 0)).toBe("Sharp left");
  });

  it("handles wrap-around at 360°", () => {
    // 350° to 10° = 20° right turn (at boundary, classified as right turn)
    expect(turnDirection(350, 10)).toBe("Turn right");
    // 350° to 5° = 15° change, within straight threshold
    expect(turnDirection(350, 5)).toBe("Continue straight");
  });
});
