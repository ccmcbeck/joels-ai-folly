import {
  SAMPLE_ROUTE,
  ROUTE_TOTAL_DISTANCE,
  createMockParticipants,
  advanceParticipants,
} from "@/lib/mock-data";

describe("SAMPLE_ROUTE", () => {
  it("has at least 10 waypoints", () => {
    expect(SAMPLE_ROUTE.length).toBeGreaterThanOrEqual(10);
  });

  it("starts with distance 0", () => {
    expect(SAMPLE_ROUTE[0].distanceFromStart).toBe(0);
  });

  it("has monotonically increasing distances", () => {
    for (let i = 1; i < SAMPLE_ROUTE.length; i++) {
      expect(SAMPLE_ROUTE[i].distanceFromStart).toBeGreaterThan(
        SAMPLE_ROUTE[i - 1].distanceFromStart
      );
    }
  });

  it("forms a loop (start and end are close)", () => {
    const start = SAMPLE_ROUTE[0];
    const end = SAMPLE_ROUTE[SAMPLE_ROUTE.length - 1];
    const latDiff = Math.abs(start.latitude - end.latitude);
    const lonDiff = Math.abs(start.longitude - end.longitude);
    expect(latDiff).toBeLessThan(0.001);
    expect(lonDiff).toBeLessThan(0.001);
  });

  it("total distance is roughly 10 km", () => {
    expect(ROUTE_TOTAL_DISTANCE).toBeGreaterThan(5000);
    expect(ROUTE_TOTAL_DISTANCE).toBeLessThan(15000);
  });
});

describe("createMockParticipants", () => {
  it("creates 4 simulated participants", () => {
    const participants = createMockParticipants(2000);
    expect(participants).toHaveLength(4);
  });

  it("gives each participant a unique id", () => {
    const participants = createMockParticipants(2000);
    const ids = participants.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives each participant a name and color", () => {
    const participants = createMockParticipants(2000);
    for (const p of participants) {
      expect(p.name).toBeTruthy();
      expect(p.color).toMatch(/^#/);
    }
  });

  it("positions participants relative to the given distance", () => {
    const myDist = 3000;
    const participants = createMockParticipants(myDist);
    // At least one should be ahead, at least one behind
    const ahead = participants.filter((p) => p.distanceAlongRoute > myDist);
    const behind = participants.filter((p) => p.distanceAlongRoute < myDist);
    expect(ahead.length).toBeGreaterThan(0);
    expect(behind.length).toBeGreaterThan(0);
  });

  it("marks exactly one participant as off-route", () => {
    const participants = createMockParticipants(2000);
    const offRoute = participants.filter((p) => p.isOffRoute);
    expect(offRoute).toHaveLength(1);
  });

  it("clamps participants within route bounds", () => {
    // Even with extreme input, distances should stay in bounds
    const participants = createMockParticipants(0);
    for (const p of participants) {
      expect(p.distanceAlongRoute).toBeGreaterThanOrEqual(0);
      expect(p.distanceAlongRoute).toBeLessThanOrEqual(ROUTE_TOTAL_DISTANCE);
    }
  });
});

describe("advanceParticipants", () => {
  it("moves non-off-route participants forward", () => {
    const participants = createMockParticipants(2000);
    const onRoute = participants.filter((p) => !p.isOffRoute);
    const original = onRoute.map((p) => p.distanceAlongRoute);

    const advanced = advanceParticipants(participants, 5);
    const advancedOnRoute = advanced.filter((p) => !p.isOffRoute);

    for (let i = 0; i < advancedOnRoute.length; i++) {
      expect(advancedOnRoute[i].distanceAlongRoute).toBeGreaterThan(
        original[i]
      );
    }
  });

  it("does not move off-route participants", () => {
    const participants = createMockParticipants(2000);
    const offRoute = participants.find((p) => p.isOffRoute)!;
    const originalDist = offRoute.distanceAlongRoute;

    const advanced = advanceParticipants(participants, 10);
    const advancedOffRoute = advanced.find((p) => p.isOffRoute)!;
    expect(advancedOffRoute.distanceAlongRoute).toBe(originalDist);
  });

  it("does not exceed total route distance", () => {
    // Put participants near the end
    const participants = createMockParticipants(ROUTE_TOTAL_DISTANCE - 100);
    const advanced = advanceParticipants(participants, 1000); // huge time step

    for (const p of advanced) {
      expect(p.distanceAlongRoute).toBeLessThanOrEqual(ROUTE_TOTAL_DISTANCE);
    }
  });

  it("updates location coordinates when advancing", () => {
    const participants = createMockParticipants(2000);
    const onRoute = participants.find((p) => !p.isOffRoute)!;
    const origLoc = { ...onRoute.location };

    const advanced = advanceParticipants(participants, 30);
    const advancedP = advanced.find((p) => p.id === onRoute.id)!;

    const moved =
      advancedP.location.latitude !== origLoc.latitude ||
      advancedP.location.longitude !== origLoc.longitude;
    expect(moved).toBe(true);
  });
});
