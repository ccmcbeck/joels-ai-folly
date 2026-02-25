import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, Tables } from '../shared/dynamodb';
import { ok, badRequest } from '../shared/responses';

interface EgressInfo {
  egressId: string;
  roomName: string;
  status: string;
  file?: {
    filename: string;
    duration: number;
    size: number;
    location: string;
  };
  track?: {
    sid: string;
  };
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  let body: { event?: string; egressInfo?: EgressInfo };
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return badRequest('Invalid JSON');
  }

  // LiveKit sends webhooks for egress lifecycle events
  if (body.event !== 'egress_ended' || !body.egressInfo?.file) {
    return ok({ status: 'ignored' });
  }

  const egress = body.egressInfo;
  const file = egress.file!;

  // Parse room name to extract eventId
  // Format: event-{eventId} or event-{eventId}-sg-{groupId} or event-{eventId}-dm-{uids}
  const roomParts = egress.roomName.split('-');
  if (roomParts[0] !== 'event' || roomParts.length < 2) {
    return badRequest('Unknown room name format');
  }
  const eventId = roomParts[1];

  const timestamp = new Date().toISOString();

  await ddb.send(
    new PutCommand({
      TableName: Tables.voiceMessages,
      Item: {
        eventId,
        timestampSpeaker: `${timestamp}#${egress.egressId}`,
        s3AudioKey: file.location,
        durationMs: Math.round((file.duration || 0) * 1000),
        egressId: egress.egressId,
        roomName: egress.roomName,
        fileSize: file.size,
        timestamp,
        // Transcript will be added by a separate Transcribe pipeline
      },
    }),
  );

  return ok({ status: 'stored' });
}
