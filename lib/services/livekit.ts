import { api } from './api';
import { config } from '../config';
import type { PTTTarget, VoiceMessage } from '../types';

export interface LiveKitToken {
  token: string;
  roomName: string;
  url: string;
}

export const livekitService = {
  /** Get a LiveKit access token for a specific channel */
  async getToken(
    eventId: string,
    target: PTTTarget,
  ): Promise<LiveKitToken> {
    const channelType = target.type;
    const channelId =
      target.type === 'subgroup'
        ? target.subGroupId
        : target.type === 'direct'
          ? target.uid
          : undefined;

    return api.post<LiveKitToken>('/voice/token', {
      eventId,
      channelType,
      channelId,
    });
  },

  /** Get the LiveKit server URL */
  getServerUrl(): string {
    return config.livekit.url;
  },

  /** List archived voice messages for an event */
  async listMessages(
    eventId: string,
    opts?: { limit?: number; before?: string },
  ): Promise<VoiceMessage[]> {
    const params = new URLSearchParams();
    if (opts?.limit) params.set('limit', String(opts.limit));
    if (opts?.before) params.set('before', opts.before);
    const qs = params.toString();
    return api.get<VoiceMessage[]>(
      `/events/${eventId}/voice${qs ? `?${qs}` : ''}`,
    );
  },
};
