import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, Tables } from '../shared/dynamodb';
import { ok, notFound, badRequest, getUserId } from '../shared/responses';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const uid = getUserId(event);
  if (!uid) return badRequest('Unauthorized');

  const eventId = event.pathParameters?.eventId;
  if (!eventId) return badRequest('eventId is required');

  // Get event
  const eventResult = await ddb.send(
    new GetCommand({ TableName: Tables.events, Key: { eventId } }),
  );
  if (!eventResult.Item) return notFound('Event not found');

  // Get participants
  const participantResult = await ddb.send(
    new QueryCommand({
      TableName: Tables.participants,
      KeyConditionExpression: 'eventId = :eid',
      ExpressionAttributeValues: { ':eid': eventId },
    }),
  );

  // Get sub-groups
  const subGroupResult = await ddb.send(
    new QueryCommand({
      TableName: Tables.subGroups,
      KeyConditionExpression: 'eventId = :eid',
      ExpressionAttributeValues: { ':eid': eventId },
    }),
  );

  return ok({
    ...eventResult.Item,
    participants: participantResult.Items || [],
    subGroups: subGroupResult.Items || [],
  });
}
