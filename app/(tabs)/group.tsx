import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  SAMPLE_ROUTE,
  ROUTE_TOTAL_DISTANCE,
  createMockParticipants,
  advanceParticipants,
} from "@/lib/mock-data";
import {
  computeRelativePositions,
  formatRelativePosition,
} from "@/lib/route-utils";
import { Participant } from "@/lib/types";

export default function GroupScreen() {
  const [participants, setParticipants] = useState<Participant[]>(
    createMockParticipants(2000)
  );

  // Simulate participant movement
  useEffect(() => {
    const timer = setInterval(() => {
      setParticipants((prev) => advanceParticipants(prev, 2));
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  const meParticipant: Participant = {
    id: "me",
    name: "You",
    color: "#4ECDC4",
    location: SAMPLE_ROUTE[5],
    heading: 0,
    speed: 4.5,
    distanceAlongRoute: 2000,
    isOffRoute: false,
    lastUpdate: Date.now(),
  };

  const allParticipants = [meParticipant, ...participants];
  const relatives = computeRelativePositions(meParticipant, participants);

  const renderParticipant = ({ item }: { item: Participant }) => {
    const rel = relatives.find((r) => r.participantId === item.id);
    const isMe = item.id === "me";

    return (
      <View style={styles.participantRow}>
        <View
          style={[styles.avatar, { backgroundColor: item.color }]}
        >
          <Text style={styles.avatarText}>
            {item.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.participantInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.participantName}>
              {item.name}
              {isMe && " (You)"}
            </Text>
            {item.isOffRoute && (
              <View style={styles.offRouteBadge}>
                <Text style={styles.offRouteText}>OFF ROUTE</Text>
              </View>
            )}
          </View>
          <Text style={styles.participantDetail}>
            {isMe
              ? `${(item.distanceAlongRoute / 1000).toFixed(1)} km into route`
              : rel
              ? formatRelativePosition(rel)
              : "..."}
          </Text>
          <Text style={styles.participantSpeed}>
            {(item.speed * 3.6).toFixed(0)} km/h
          </Text>
        </View>
        {!isMe && (
          <TouchableOpacity style={styles.pttButton}>
            <Ionicons name="mic" size={20} color="#4ECDC4" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.eventName}>Mission Bay Bike Loop</Text>
        <Text style={styles.eventMeta}>
          {allParticipants.length} riders &middot;{" "}
          {(ROUTE_TOTAL_DISTANCE / 1000).toFixed(1)} km route
        </Text>
      </View>

      <View style={styles.subgroupHeader}>
        <Text style={styles.subgroupTitle}>All Riders</Text>
        <TouchableOpacity style={styles.subgroupAction}>
          <Ionicons name="add-circle-outline" size={20} color="#4ECDC4" />
          <Text style={styles.subgroupActionText}>Create Sub-group</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={allParticipants}
        keyExtractor={(item) => item.id}
        renderItem={renderParticipant}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f23",
  },
  header: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  eventName: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
  },
  eventMeta: {
    color: "#888",
    fontSize: 14,
    marginTop: 4,
  },
  subgroupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  subgroupTitle: {
    color: "#ccc",
    fontSize: 16,
    fontWeight: "600",
  },
  subgroupAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  subgroupActionText: {
    color: "#4ECDC4",
    fontSize: 13,
  },
  list: {
    paddingHorizontal: 16,
  },
  participantRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a2e",
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  participantInfo: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  participantName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  offRouteBadge: {
    backgroundColor: "rgba(255, 165, 0, 0.2)",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  offRouteText: {
    color: "#FFA500",
    fontSize: 10,
    fontWeight: "700",
  },
  participantDetail: {
    color: "#4ECDC4",
    fontSize: 13,
    marginTop: 2,
  },
  participantSpeed: {
    color: "#666",
    fontSize: 12,
    marginTop: 1,
  },
  pttButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(78, 205, 196, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
});
