import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { QueryCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, Tables } from '../shared/dynamodb';
import { ok, badRequest, notFound, getUserId } from '../shared/responses';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const uid = getUserId(event);
  if (!uid) return badRequest('Unauthorized');

  let body: { inviteCode?: string };
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return badRequest('Invalid JSON body');
  }

  if (!body.inviteCode) return badRequest('inviteCode is required');

  // Look up event by invite code
  const result = await ddb.send(
    new QueryCommand({
      TableName: Tables.events,
      IndexName: 'inviteCode-index',
      KeyConditionExpression: 'inviteCode = :code',
      ExpressionAttributeValues: { ':code': body.inviteCode.toUpperCase() },
    }),
  );

  const eventItem = result.Items?.[0];
  if (!eventItem) return notFound('Invalid invite code');

  // Add participant (idempotent — won't fail if already joined)
  await ddb.send(
    new PutCommand({
      TableName: Tables.participants,
      Item: {
        eventId: eventItem.eventId,
        uid,
        role: 'participant',
        status: 'active',
        joinedAt: new Date().toISOString(),
      },
      ConditionExpression: 'attribute_not_exists(uid)',
    }),
  ).catch(() => {
    // Already joined — that's fine
  });

  return ok(eventItem);
}
