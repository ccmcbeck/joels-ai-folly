import type { APIGatewayProxyWebsocketEventV2 } from 'aws-lambda';
import { DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, Tables } from '../shared/dynamodb';

export async function handler(event: APIGatewayProxyWebsocketEventV2) {
  const connectionId = event.requestContext.connectionId;

  await ddb.send(
    new DeleteCommand({
      TableName: Tables.connections,
      Key: { connectionId },
    }),
  );

  return { statusCode: 200, body: 'Disconnected' };
}
