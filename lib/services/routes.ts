import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import type { RoutePoint } from '../types';
import { buildRoutePoints } from '../route-utils';

export const routeService = {
  /** Let user pick a GPX file and parse it */
  async importGPX(): Promise<RoutePoint[] | null> {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/gpx+xml', 'application/xml', 'text/xml'],
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets?.[0]) return null;

    const fileUri = result.assets[0].uri;
    const xml = await FileSystem.readAsStringAsync(fileUri);
    return parseGPX(xml);
  },

  /** Parse GPX XML string into RoutePoints */
  parseGPX,

  /** Import from Ride with GPS (requires OAuth token) */
  async importFromRideWithGPS(
    routeId: string,
    accessToken: string,
  ): Promise<RoutePoint[]> {
    const res = await fetch(
      `https://ridewithgps.com/routes/${routeId}.json?version=2`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!res.ok) throw new Error(`RWGPS API error: ${res.status}`);

    const data = await res.json();
    const coords = data.track_points.map(
      (tp: { x: number; y: number }) => ({
        latitude: tp.y,
        longitude: tp.x,
      }),
    );
    return buildRoutePoints(coords);
  },

  /** Import from Strava (requires OAuth token) */
  async importFromStrava(
    routeId: string,
    accessToken: string,
  ): Promise<RoutePoint[]> {
    const res = await fetch(
      `https://www.strava.com/api/v3/routes/${routeId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!res.ok) throw new Error(`Strava API error: ${res.status}`);

    const data = await res.json();
    // Strava returns a polyline — decode it
    const coords = decodePolyline(data.map.polyline);
    return buildRoutePoints(coords);
  },
};

/** Parse GPX XML into RoutePoint array */
function parseGPX(xml: string): RoutePoint[] {
  // Extract <trkpt> or <rtept> elements with lat/lon attributes
  const pointRegex = /<(?:trkpt|rtept)\s+lat="([^"]+)"\s+lon="([^"]+)"/g;
  const coords: { latitude: number; longitude: number }[] = [];

  let match: RegExpExecArray | null;
  while ((match = pointRegex.exec(xml)) !== null) {
    coords.push({
      latitude: parseFloat(match[1]),
      longitude: parseFloat(match[2]),
    });
  }

  if (coords.length === 0) {
    throw new Error('No track points found in GPX file');
  }

  return buildRoutePoints(coords);
}

/** Decode a Google-encoded polyline into coordinates */
function decodePolyline(
  encoded: string,
): { latitude: number; longitude: number }[] {
  const coords: { latitude: number; longitude: number }[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    lng += result & 1 ? ~(result >> 1) : result >> 1;

    coords.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }

  return coords;
}
