import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { QueryCommand, BatchGetCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, Tables } from '../shared/dynamodb';
import { ok, badRequest, getUserId } from '../shared/responses';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const uid = getUserId(event);
  if (!uid) return badRequest('Unauthorized');

  // Get event IDs the user participates in
  const participantResult = await ddb.send(
    new QueryCommand({
      TableName: Tables.participants,
      IndexName: 'uid-index',
      KeyConditionExpression: 'uid = :uid',
      ExpressionAttributeValues: { ':uid': uid },
    }),
  );

  const eventIds = (participantResult.Items || []).map((p: Record<string, unknown>) => p.eventId as string);
  if (eventIds.length === 0) return ok([]);

  // Batch get events
  const eventResult = await ddb.send(
    new BatchGetCommand({
      RequestItems: {
        [Tables.events]: {
          Keys: eventIds.map((eid: string) => ({ eventId: eid })),
        },
      },
    }),
  );

  const events = eventResult.Responses?.[Tables.events] || [];
  // Sort by date descending
  events.sort((a: Record<string, unknown>, b: Record<string, unknown>) => (b.createdAt as string).localeCompare(a.createdAt as string));

  return ok(events);
}
