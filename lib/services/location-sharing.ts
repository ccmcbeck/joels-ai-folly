import { config } from '../config';
import { authService } from './auth';
import type { LocationUpdate } from '../types';

type LocationCallback = (updates: LocationUpdate[]) => void;

class LocationSharingService {
  private ws: WebSocket | null = null;
  private eventId: string | null = null;
  private onUpdate: LocationCallback | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private connected = false;

  async connect(eventId: string, onUpdate: LocationCallback): Promise<void> {
    this.eventId = eventId;
    this.onUpdate = onUpdate;

    const token = await authService.getToken();
    if (!token || !config.aws.apiGateway.websocketUrl) return;

    const url = `${config.aws.apiGateway.websocketUrl}?token=${encodeURIComponent(token)}&eventId=${eventId}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.connected = true;
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'locationUpdates' && this.onUpdate) {
          this.onUpdate(data.updates as LocationUpdate[]);
        }
      } catch {
        // Ignore malformed messages
      }
    };

    this.ws.onclose = () => {
      this.connected = false;
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      this.connected = false;
    };
  }

  broadcast(location: Omit<LocationUpdate, 'uid' | 'timestamp'>): void {
    if (!this.ws || !this.connected) return;
    this.ws.send(
      JSON.stringify({
        action: 'broadcast',
        eventId: this.eventId,
        ...location,
        timestamp: Date.now(),
      }),
    );
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.onclose = null; // Prevent reconnect on intentional close
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
    this.eventId = null;
    this.onUpdate = null;
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.eventId && this.onUpdate) {
        this.connect(this.eventId, this.onUpdate);
      }
    }, 3000);
  }

  isConnected(): boolean {
    return this.connected;
  }
}

export const locationSharing = new LocationSharingService();
