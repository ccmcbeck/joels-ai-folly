import type { APIGatewayProxyWebsocketEventV2 } from 'aws-lambda';
import { PutCommand, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';
import { ddb, Tables } from '../shared/dynamodb';

export async function handler(event: APIGatewayProxyWebsocketEventV2) {
  const connectionId = event.requestContext.connectionId;
  const { domainName, stage } = event.requestContext;
  const callbackUrl = `https://${domainName}/${stage}`;

  let body: {
    eventId?: string;
    latitude?: number;
    longitude?: number;
    speed?: number;
    heading?: number;
    accuracy?: number;
    onRoute?: boolean;
    distanceAlongRoute?: number;
    timestamp?: number;
  };

  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  if (!body.eventId || body.latitude === undefined || body.longitude === undefined) {
    return { statusCode: 400, body: 'Missing required fields' };
  }

  const now = Date.now();
  const uid = connectionId; // In production, resolve from auth token

  // Store location
  await ddb.send(
    new PutCommand({
      TableName: Tables.locations,
      Item: {
        eventId: body.eventId,
        uidTimestamp: `${uid}#${now}`,
        uid,
        latitude: body.latitude,
        longitude: body.longitude,
        speed: body.speed || 0,
        heading: body.heading || 0,
        accuracy: body.accuracy || 0,
        onRoute: body.onRoute ?? true,
        distanceAlongRoute: body.distanceAlongRoute || 0,
        timestamp: now,
        ttl: Math.floor(now / 1000) + 24 * 60 * 60, // 24h TTL
      },
    }),
  );

  // Fan out to other connections in the same event
  const connectionsResult = await ddb.send(
    new QueryCommand({
      TableName: Tables.connections,
      IndexName: 'eventId-index',
      KeyConditionExpression: 'eventId = :eid',
      ExpressionAttributeValues: { ':eid': body.eventId },
    }),
  );

  const connections = connectionsResult.Items || [];
  const apiClient = new ApiGatewayManagementApiClient({ endpoint: callbackUrl });

  const update = {
    type: 'locationUpdates',
    updates: [
      {
        uid,
        latitude: body.latitude,
        longitude: body.longitude,
        speed: body.speed || 0,
        heading: body.heading || 0,
        accuracy: body.accuracy || 0,
        onRoute: body.onRoute ?? true,
        distanceAlongRoute: body.distanceAlongRoute || 0,
        timestamp: now,
      },
    ],
  };

  const payload = Buffer.from(JSON.stringify(update));

  // Send to all connections except the sender
  const sends = connections
    .filter((c: Record<string, unknown>) => c.connectionId !== connectionId)
    .map(async (c: Record<string, unknown>) => {
      try {
        await apiClient.send(
          new PostToConnectionCommand({
            ConnectionId: c.connectionId as string,
            Data: payload,
          }),
        );
      } catch (err: any) {
        // If connection is gone, clean it up
        if (err.statusCode === 410) {
          await ddb.send(
            new DeleteCommand({
              TableName: Tables.connections,
              Key: { connectionId: c.connectionId },
            }),
          );
        }
      }
    });

  await Promise.all(sends);

  return { statusCode: 200, body: 'OK' };
}
