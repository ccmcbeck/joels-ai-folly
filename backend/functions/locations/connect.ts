import type { APIGatewayProxyWebsocketEventV2 } from 'aws-lambda';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, Tables } from '../shared/dynamodb';

export async function handler(event: APIGatewayProxyWebsocketEventV2) {
  const connectionId = event.requestContext.connectionId;
  const eventId = (event as unknown as { queryStringParameters?: Record<string, string> }).queryStringParameters?.eventId || 'unknown';

  // Store connection with 4-hour TTL
  await ddb.send(
    new PutCommand({
      TableName: Tables.connections,
      Item: {
        connectionId,
        eventId,
        connectedAt: new Date().toISOString(),
        ttl: Math.floor(Date.now() / 1000) + 4 * 60 * 60,
      },
    }),
  );

  return { statusCode: 200, body: 'Connected' };
}
