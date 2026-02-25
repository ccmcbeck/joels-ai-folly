import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function SettingsScreen() {
  const [name, setName] = useState("Chris");
  const [offRouteAlerts, setOffRouteAlerts] = useState(true);
  const [groupAlerts, setGroupAlerts] = useState(true);
  const [offRouteThreshold, setOffRouteThreshold] = useState("100");
  const [gpsInterval, setGpsInterval] = useState("3");
  const [keepScreenOn, setKeepScreenOn] = useState(true);

  return (
    <ScrollView style={styles.container}>
      {/* Profile */}
      <Text style={styles.sectionTitle}>Profile</Text>
      <View style={styles.row}>
        <Text style={styles.label}>Display Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholderTextColor="#666"
        />
      </View>

      {/* Event */}
      <Text style={styles.sectionTitle}>Current Event</Text>
      <View style={styles.infoRow}>
        <Ionicons name="bicycle" size={18} color="#4ECDC4" />
        <Text style={styles.infoText}>Mission Bay Bike Loop</Text>
      </View>
      <View style={styles.infoRow}>
        <Ionicons name="people" size={18} color="#4ECDC4" />
        <Text style={styles.infoText}>5 participants</Text>
      </View>
      <View style={styles.infoRow}>
        <Ionicons name="map" size={18} color="#4ECDC4" />
        <Text style={styles.infoText}>10.2 km route</Text>
      </View>

      {/* Alerts */}
      <Text style={styles.sectionTitle}>Alerts</Text>
      <View style={styles.switchRow}>
        <Text style={styles.label}>Off-route warnings</Text>
        <Switch
          value={offRouteAlerts}
          onValueChange={setOffRouteAlerts}
          trackColor={{ true: "#4ECDC4", false: "#333" }}
          thumbColor="#fff"
        />
      </View>
      <View style={styles.switchRow}>
        <Text style={styles.label}>Group member alerts</Text>
        <Switch
          value={groupAlerts}
          onValueChange={setGroupAlerts}
          trackColor={{ true: "#4ECDC4", false: "#333" }}
          thumbColor="#fff"
        />
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Off-route threshold (m)</Text>
        <TextInput
          style={styles.inputSmall}
          value={offRouteThreshold}
          onChangeText={setOffRouteThreshold}
          keyboardType="numeric"
          placeholderTextColor="#666"
        />
      </View>

      {/* GPS */}
      <Text style={styles.sectionTitle}>GPS</Text>
      <View style={styles.row}>
        <Text style={styles.label}>Update interval (sec)</Text>
        <TextInput
          style={styles.inputSmall}
          value={gpsInterval}
          onChangeText={setGpsInterval}
          keyboardType="numeric"
          placeholderTextColor="#666"
        />
      </View>
      <View style={styles.switchRow}>
        <Text style={styles.label}>Keep screen on</Text>
        <Switch
          value={keepScreenOn}
          onValueChange={setKeepScreenOn}
          trackColor={{ true: "#4ECDC4", false: "#333" }}
          thumbColor="#fff"
        />
      </View>

      {/* Join / Share */}
      <Text style={styles.sectionTitle}>Share Event</Text>
      <TouchableOpacity style={styles.shareButton}>
        <Ionicons name="share-outline" size={18} color="#fff" />
        <Text style={styles.shareText}>Invite Link: jaf.app/mb-loop-2026</Text>
      </TouchableOpacity>

      {/* About */}
      <Text style={styles.sectionTitle}>About</Text>
      <Text style={styles.aboutText}>Joel's AI Folly v0.1.0</Text>
      <Text style={styles.aboutSubtext}>
        Group event communication for cyclists
      </Text>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f23",
    paddingHorizontal: 16,
  },
  sectionTitle: {
    color: "#4ECDC4",
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 24,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a2e",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a2e",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  label: {
    color: "#ccc",
    fontSize: 15,
  },
  infoText: {
    color: "#ccc",
    fontSize: 15,
  },
  input: {
    color: "#fff",
    fontSize: 15,
    backgroundColor: "#1a1a2e",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 120,
    textAlign: "right",
  },
  inputSmall: {
    color: "#fff",
    fontSize: 15,
    backgroundColor: "#1a1a2e",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    width: 60,
    textAlign: "center",
  },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#1a1a2e",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "#333",
  },
  shareText: {
    color: "#aaa",
    fontSize: 14,
  },
  aboutText: {
    color: "#888",
    fontSize: 14,
  },
  aboutSubtext: {
    color: "#555",
    fontSize: 13,
    marginTop: 4,
  },
});
