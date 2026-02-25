import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapView, { Polyline, Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import {
  SAMPLE_ROUTE,
  ROUTE_TOTAL_DISTANCE,
  createMockParticipants,
  advanceParticipants,
} from '@/lib/mock-data';
import {
  snapToRoute,
  computeRelativePositions,
  formatRelativePosition,
  bearing,
  turnDirection,
} from '@/lib/route-utils';
import { requestLocationPermission, watchLocation } from '@/lib/location';
import type { Participant, Coordinate, RoutePoint } from '@/lib/types';
import { useEvent } from '@/lib/contexts/EventContext';
import { config } from '@/lib/config';
import { locationSharing } from '@/lib/services/location-sharing';
import PushToTalk from '@/components/PushToTalk';

const TICK_INTERVAL = 2000;
const OFF_ROUTE_THRESHOLD = 100;

export default function MapScreen() {
  const { activeEvent } = useEvent();
  const mapRef = useRef<MapView>(null);
  const [myLocation, setMyLocation] = useState<Coordinate | null>(null);
  const [myDistanceAlongRoute, setMyDistanceAlongRoute] = useState(0);
  const [myIsOffRoute, setMyIsOffRoute] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [nextTurn, setNextTurn] = useState<string>('Follow the route');
  const [useSimulatedLocation, setUseSimulatedLocation] = useState(false);
  const simulatedDistance = useRef(0);

  const route: RoutePoint[] = activeEvent?.route ?? SAMPLE_ROUTE;
  const routeTotal = route.length > 0
    ? route[route.length - 1].distanceFromStart
    : ROUTE_TOTAL_DISTANCE;

  // Request location permission and start tracking
  useEffect(() => {
    let locationWatcher: { remove: () => void } | null = null;

    (async () => {
      const granted = await requestLocationPermission();
      if (!granted) {
        setUseSimulatedLocation(true);
        setMyLocation({ latitude: route[0].latitude, longitude: route[0].longitude });
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

  // Connect to real-time location sharing when backend is available
  useEffect(() => {
    if (config.useMockData || !activeEvent) return;

    locationSharing.connect(activeEvent.id, (updates) => {
      // Convert location updates to Participant objects for the map
      setParticipants((prev) => {
        const updated = [...prev];
        for (const update of updates) {
          const existing = updated.findIndex((p) => p.id === update.uid);
          const participant: Participant = {
            id: update.uid,
            name: update.uid, // TODO: resolve display names
            color: '#4ECDC4',
            location: { latitude: update.latitude, longitude: update.longitude },
            heading: update.heading,
            speed: update.speed,
            distanceAlongRoute: update.distanceAlongRoute,
            isOffRoute: !update.onRoute,
            lastUpdate: update.timestamp,
          };
          if (existing >= 0) {
            updated[existing] = participant;
          } else {
            updated.push(participant);
          }
        }
        return updated;
      });
    });

    return () => {
      locationSharing.disconnect();
    };
  }, [activeEvent]);

  // Snap my location to route and check off-route status
  useEffect(() => {
    if (!myLocation) return;

    const { distanceAlongRoute, perpendicularDistance } = snapToRoute(myLocation, route);
    setMyDistanceAlongRoute(distanceAlongRoute);
    setMyIsOffRoute(perpendicularDistance > OFF_ROUTE_THRESHOLD);

    // Broadcast location to backend
    if (!config.useMockData && activeEvent) {
      locationSharing.broadcast({
        latitude: myLocation.latitude,
        longitude: myLocation.longitude,
        speed: 4.5,
        heading: 0,
        accuracy: 10,
        onRoute: perpendicularDistance <= OFF_ROUTE_THRESHOLD,
        distanceAlongRoute,
      });
    }

    // Compute next turn direction
    const routeIndex = route.findIndex((p) => p.distanceFromStart >= distanceAlongRoute);
    if (routeIndex > 0 && routeIndex < route.length - 1) {
      const prev = route[routeIndex - 1];
      const curr = route[routeIndex];
      const next = route[routeIndex + 1];
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

  // Initialize and tick simulated participants (mock mode only)
  useEffect(() => {
    if (config.useMockData) {
      setParticipants(createMockParticipants(myDistanceAlongRoute));
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      if (config.useMockData) {
        setParticipants((prev) => advanceParticipants(prev, TICK_INTERVAL / 1000));
      }

      if (useSimulatedLocation) {
        simulatedDistance.current = Math.min(
          routeTotal,
          simulatedDistance.current + 4.5 * (TICK_INTERVAL / 1000),
        );
        const idx = route.findIndex((p) => p.distanceFromStart >= simulatedDistance.current);
        if (idx > 0) {
          const a = route[idx - 1];
          const b = route[idx];
          const segLen = b.distanceFromStart - a.distanceFromStart;
          const t = segLen > 0 ? (simulatedDistance.current - a.distanceFromStart) / segLen : 0;
          setMyLocation({
            latitude: a.latitude + t * (b.latitude - a.latitude),
            longitude: a.longitude + t * (b.longitude - a.longitude),
          });
        }
      }
    }, TICK_INTERVAL);

    return () => clearInterval(timer);
  }, [useSimulatedLocation]);

  const myParticipant: Participant = {
    id: 'me',
    name: 'You',
    color: '#fff',
    location: myLocation ?? route[0],
    heading: 0,
    speed: 4.5,
    distanceAlongRoute: myDistanceAlongRoute,
    isOffRoute: myIsOffRoute,
    lastUpdate: Date.now(),
  };

  const relatives = computeRelativePositions(myParticipant, participants);
  const progress = Math.round((myDistanceAlongRoute / routeTotal) * 100);

  const routeCoords = route.map((p) => ({
    latitude: p.latitude,
    longitude: p.longitude,
  }));

  const initialRegion = route.length > 0
    ? {
        latitude: route[0].latitude,
        longitude: route[0].longitude,
        latitudeDelta: 0.035,
        longitudeDelta: 0.035,
      }
    : {
        latitude: 32.78,
        longitude: -117.23,
        latitudeDelta: 0.035,
        longitudeDelta: 0.035,
      };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={initialRegion}
        mapType="standard"
        showsUserLocation={!useSimulatedLocation}
        showsMyLocationButton
      >
        <Polyline coordinates={routeCoords} strokeColor="#4ECDC4" strokeWidth={4} />
        <Marker coordinate={routeCoords[0]} title="Start / Finish" pinColor="green" />

        {useSimulatedLocation && myLocation && (
          <Marker coordinate={myLocation} title="You" pinColor="blue" />
        )}

        {participants.map((p) => (
          <Marker
            key={p.id}
            coordinate={p.location}
            title={p.name}
            description={
              p.isOffRoute
                ? 'OFF ROUTE'
                : formatRelativePosition(relatives.find((r) => r.participantId === p.id)!)
            }
            pinColor={p.isOffRoute ? 'orange' : p.color}
          />
        ))}
      </MapView>

      {/* Navigation HUD */}
      <View style={styles.navHud}>
        <Text style={styles.navDirection}>{nextTurn}</Text>
        <Text style={styles.navProgress}>
          {(myDistanceAlongRoute / 1000).toFixed(1)} km / {(routeTotal / 1000).toFixed(1)} km ({progress}%)
        </Text>
      </View>

      {myIsOffRoute && (
        <View style={styles.offRouteWarning}>
          <Text style={styles.offRouteText}>YOU ARE OFF ROUTE</Text>
        </View>
      )}

      {participants
        .filter((p) => p.isOffRoute)
        .map((p) => (
          <View key={p.id} style={styles.participantAlert}>
            <Text style={styles.participantAlertText}>{p.name} is off route!</Text>
          </View>
        ))}

      <View style={styles.participantStrip}>
        {relatives.map((rel) => (
          <View key={rel.participantId} style={styles.participantChip}>
            <Text style={[styles.participantName, rel.isOffRoute && styles.offRouteName]}>
              {rel.name}
            </Text>
            <Text style={styles.participantDist}>{formatRelativePosition(rel)}</Text>
          </View>
        ))}
      </View>

      <PushToTalk participants={participants} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f23' },
  map: { flex: 1 },
  navHud: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(26, 26, 46, 0.92)',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  navDirection: { color: '#4ECDC4', fontSize: 18, fontWeight: '700' },
  navProgress: { color: '#aaa', fontSize: 13, marginTop: 4 },
  offRouteWarning: {
    position: 'absolute',
    top: 130,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255, 59, 48, 0.9)',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  offRouteText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  participantAlert: {
    position: 'absolute',
    top: 170,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255, 165, 0, 0.85)',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
  },
  participantAlertText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  participantStrip: {
    position: 'absolute',
    bottom: 110,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  participantChip: {
    backgroundColor: 'rgba(26, 26, 46, 0.9)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
    minWidth: 70,
  },
  participantName: { color: '#fff', fontSize: 12, fontWeight: '600' },
  offRouteName: { color: '#FFA500' },
  participantDist: { color: '#4ECDC4', fontSize: 10, marginTop: 2 },
});
