import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { AccessToken } from 'livekit-server-sdk';
import { ok, badRequest, getUserId } from '../shared/responses';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const uid = getUserId(event);
  if (!uid) return badRequest('Unauthorized');

  let body: { eventId?: string; channelType?: string; channelId?: string };
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return badRequest('Invalid JSON body');
  }

  if (!body.eventId || !body.channelType) {
    return badRequest('eventId and channelType are required');
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!apiKey || !apiSecret) {
    return badRequest('LiveKit not configured');
  }

  // Build room name based on channel type
  let roomName: string;
  switch (body.channelType) {
    case 'all':
      roomName = `event-${body.eventId}`;
      break;
    case 'subgroup':
      if (!body.channelId) return badRequest('channelId required for subgroup');
      roomName = `event-${body.eventId}-sg-${body.channelId}`;
      break;
    case 'direct':
      if (!body.channelId) return badRequest('channelId required for direct');
      // Sort UIDs so both participants get the same room name
      const sorted = [uid, body.channelId].sort().join('-');
      roomName = `event-${body.eventId}-dm-${sorted}`;
      break;
    default:
      return badRequest('Invalid channelType');
  }

  const token = new AccessToken(apiKey, apiSecret, {
    identity: uid,
    ttl: '4h',
  });
  token.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
  });

  return ok({
    token: await token.toJwt(),
    roomName,
    url: process.env.LIVEKIT_URL || '',
  });
}
