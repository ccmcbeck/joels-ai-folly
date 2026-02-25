import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, StyleSheet, Alert, Dimensions } from "react-native";
import MapView, { Polyline, Marker, PROVIDER_DEFAULT } from "react-native-maps";
import {
  SAMPLE_ROUTE,
  ROUTE_TOTAL_DISTANCE,
  createMockParticipants,
  advanceParticipants,
} from "@/lib/mock-data";
import {
  snapToRoute,
  isOffRoute,
  computeRelativePositions,
  formatRelativePosition,
  bearing,
  turnDirection,
} from "@/lib/route-utils";
import { requestLocationPermission, watchLocation } from "@/lib/location";
import { Participant, Coordinate } from "@/lib/types";
import PushToTalk from "@/components/PushToTalk";

const TICK_INTERVAL = 2000; // ms between simulation ticks
const OFF_ROUTE_THRESHOLD = 100; // meters

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const [myLocation, setMyLocation] = useState<Coordinate | null>(null);
  const [myDistanceAlongRoute, setMyDistanceAlongRoute] = useState(0);
  const [myIsOffRoute, setMyIsOffRoute] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [nextTurn, setNextTurn] = useState<string>("Follow the route");
  const [useSimulatedLocation, setUseSimulatedLocation] = useState(false);
  const simulatedDistance = useRef(0);

  // Request location permission and start tracking
  useEffect(() => {
    let locationWatcher: { remove: () => void } | null = null;

    (async () => {
      const granted = await requestLocationPermission();
      if (!granted) {
        // Fall back to simulated location on the route
        setUseSimulatedLocation(true);
        const start = SAMPLE_ROUTE[0];
        setMyLocation({ latitude: start.latitude, longitude: start.longitude });
        return;
      }

      locationWatcher = watchLocation((coord) => {
        setMyLocation(coord);
      });
    })();

    return () => {
      locationWatcher?.remove();
    };
  }, []);

  // Snap my location to route and check off-route status
  useEffect(() => {
    if (!myLocation) return;

    const { distanceAlongRoute, perpendicularDistance } = snapToRoute(
      myLocation,
      SAMPLE_ROUTE
    );
    setMyDistanceAlongRoute(distanceAlongRoute);
    setMyIsOffRoute(perpendicularDistance > OFF_ROUTE_THRESHOLD);

    // Compute next turn direction
    const routeIndex = SAMPLE_ROUTE.findIndex(
      (p) => p.distanceFromStart >= distanceAlongRoute
    );
    if (routeIndex > 0 && routeIndex < SAMPLE_ROUTE.length - 1) {
      const prev = SAMPLE_ROUTE[routeIndex - 1];
      const curr = SAMPLE_ROUTE[routeIndex];
      const next = SAMPLE_ROUTE[routeIndex + 1];
      const prevBearing = bearing(prev, curr);
      const nextBearing = bearing(curr, next);
      const distToTurn = curr.distanceFromStart - distanceAlongRoute;

      if (distToTurn < 200) {
        const dir = turnDirection(prevBearing, nextBearing);
        setNextTurn(`${dir} in ${Math.round(distToTurn)}m`);
      } else {
        setNextTurn(`Continue for ${Math.round(distToTurn)}m`);
      }
    }
  }, [myLocation]);

  // Initialize and tick simulated participants
  useEffect(() => {
    setParticipants(createMockParticipants(myDistanceAlongRoute));
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      // Advance simulated participants
      setParticipants((prev) =>
        advanceParticipants(prev, TICK_INTERVAL / 1000)
      );

      // Advance simulated self-location if no real GPS
      if (useSimulatedLocation) {
        simulatedDistance.current = Math.min(
          ROUTE_TOTAL_DISTANCE,
          simulatedDistance.current + 4.5 * (TICK_INTERVAL / 1000)
        );
        const idx = SAMPLE_ROUTE.findIndex(
          (p) => p.distanceFromStart >= simulatedDistance.current
        );
        if (idx > 0) {
          const a = SAMPLE_ROUTE[idx - 1];
          const b = SAMPLE_ROUTE[idx];
          const segLen = b.distanceFromStart - a.distanceFromStart;
          const t =
            segLen > 0
              ? (simulatedDistance.current - a.distanceFromStart) / segLen
              : 0;
          setMyLocation({
            latitude: a.latitude + t * (b.latitude - a.latitude),
            longitude: a.longitude + t * (b.longitude - a.longitude),
          });
        }
      }
    }, TICK_INTERVAL);

    return () => clearInterval(timer);
  }, [useSimulatedLocation]);

  // Compute relative positions for the HUD
  const myParticipant: Participant = {
    id: "me",
    name: "You",
    color: "#fff",
    location: myLocation ?? SAMPLE_ROUTE[0],
    heading: 0,
    speed: 4.5,
    distanceAlongRoute: myDistanceAlongRoute,
    isOffRoute: myIsOffRoute,
    lastUpdate: Date.now(),
  };

  const relatives = computeRelativePositions(myParticipant, participants);
  const progress = Math.round(
    (myDistanceAlongRoute / ROUTE_TOTAL_DISTANCE) * 100
  );

  const routeCoords = SAMPLE_ROUTE.map((p) => ({
    latitude: p.latitude,
    longitude: p.longitude,
  }));

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={{
          latitude: 32.78,
          longitude: -117.23,
          latitudeDelta: 0.035,
          longitudeDelta: 0.035,
        }}
        mapType="standard"
        showsUserLocation={!useSimulatedLocation}
        showsMyLocationButton
      >
        {/* Route line */}
        <Polyline
          coordinates={routeCoords}
          strokeColor="#4ECDC4"
          strokeWidth={4}
        />

        {/* Start/end marker */}
        <Marker coordinate={routeCoords[0]} title="Start / Finish" pinColor="green" />

        {/* Simulated self marker (when no real GPS) */}
        {useSimulatedLocation && myLocation && (
          <Marker coordinate={myLocation} title="You" pinColor="blue" />
        )}

        {/* Participant markers */}
        {participants.map((p) => (
          <Marker
            key={p.id}
            coordinate={p.location}
            title={p.name}
            description={
              p.isOffRoute
                ? "OFF ROUTE"
                : `${formatRelativePosition(
                    relatives.find((r) => r.participantId === p.id)!
                  )}`
            }
            pinColor={p.isOffRoute ? "orange" : p.color}
          />
        ))}
      </MapView>

      {/* Navigation HUD */}
      <View style={styles.navHud}>
        <Text style={styles.navDirection}>{nextTurn}</Text>
        <Text style={styles.navProgress}>
          {(myDistanceAlongRoute / 1000).toFixed(1)} km / {(ROUTE_TOTAL_DISTANCE / 1000).toFixed(1)} km ({progress}%)
        </Text>
      </View>

      {/* Off-route warning */}
      {myIsOffRoute && (
        <View style={styles.offRouteWarning}>
          <Text style={styles.offRouteText}>YOU ARE OFF ROUTE</Text>
        </View>
      )}

      {/* Participant off-route alerts */}
      {participants
        .filter((p) => p.isOffRoute)
        .map((p) => (
          <View key={p.id} style={styles.participantAlert}>
            <Text style={styles.participantAlertText}>
              {p.name} is off route!
            </Text>
          </View>
        ))}

      {/* Nearby participants strip */}
      <View style={styles.participantStrip}>
        {relatives.map((rel) => (
          <View key={rel.participantId} style={styles.participantChip}>
            <Text
              style={[
                styles.participantName,
                rel.isOffRoute && styles.offRouteName,
              ]}
            >
              {rel.name}
            </Text>
            <Text style={styles.participantDist}>
              {formatRelativePosition(rel)}
            </Text>
          </View>
        ))}
      </View>

      {/* Push-to-talk */}
      <PushToTalk participants={participants} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f23",
  },
  map: {
    flex: 1,
  },
  navHud: {
    position: "absolute",
    top: 60,
    left: 16,
    right: 16,
    backgroundColor: "rgba(26, 26, 46, 0.92)",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  navDirection: {
    color: "#4ECDC4",
    fontSize: 18,
    fontWeight: "700",
  },
  navProgress: {
    color: "#aaa",
    fontSize: 13,
    marginTop: 4,
  },
  offRouteWarning: {
    position: "absolute",
    top: 130,
    left: 16,
    right: 16,
    backgroundColor: "rgba(255, 59, 48, 0.9)",
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
  },
  offRouteText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
  participantAlert: {
    position: "absolute",
    top: 170,
    left: 16,
    right: 16,
    backgroundColor: "rgba(255, 165, 0, 0.85)",
    borderRadius: 8,
    padding: 8,
    alignItems: "center",
  },
  participantAlertText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  participantStrip: {
    position: "absolute",
    bottom: 110,
    left: 8,
    right: 8,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  participantChip: {
    backgroundColor: "rgba(26, 26, 46, 0.9)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: "center",
    minWidth: 70,
  },
  participantName: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  offRouteName: {
    color: "#FFA500",
  },
  participantDist: {
    color: "#4ECDC4",
    fontSize: 10,
    marginTop: 2,
  },
});
