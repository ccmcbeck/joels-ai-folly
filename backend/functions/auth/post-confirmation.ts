import type { PostConfirmationTriggerEvent } from 'aws-lambda';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, Tables } from '../shared/dynamodb';

export async function handler(event: PostConfirmationTriggerEvent): Promise<PostConfirmationTriggerEvent> {
  const { sub, email, preferred_username } = event.request.userAttributes;

  await ddb.send(
    new PutCommand({
      TableName: Tables.users,
      Item: {
        uid: sub,
        email,
        displayName: preferred_username || email.split('@')[0],
        createdAt: new Date().toISOString(),
      },
    }),
  );

  return event;
}
