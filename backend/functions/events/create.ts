import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { randomBytes } from 'crypto';
import { ddb, Tables } from '../shared/dynamodb';
import { created, badRequest, getUserId } from '../shared/responses';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const uid = getUserId(event);
  if (!uid) return badRequest('Unauthorized');

  let body: { name?: string; date?: string };
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return badRequest('Invalid JSON body');
  }

  if (!body.name) return badRequest('Event name is required');

  const eventId = randomBytes(12).toString('hex');
  const inviteCode = generateInviteCode();
  const now = new Date().toISOString();

  const eventItem = {
    eventId,
    name: body.name,
    date: body.date || now,
    status: 'draft',
    organizerUid: uid,
    inviteCode,
    createdAt: now,
  };

  // Create event
  await ddb.send(new PutCommand({ TableName: Tables.events, Item: eventItem }));

  // Add organizer as participant
  await ddb.send(
    new PutCommand({
      TableName: Tables.participants,
      Item: {
        eventId,
        uid,
        role: 'organizer',
        status: 'active',
        joinedAt: now,
      },
    }),
  );

  return created(eventItem);
}

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  const bytes = randomBytes(6);
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}
