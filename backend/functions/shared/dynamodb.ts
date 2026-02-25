import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
export const ddb = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

export const Tables = {
  events: process.env.EVENTS_TABLE!,
  users: process.env.USERS_TABLE!,
  participants: process.env.PARTICIPANTS_TABLE!,
  subGroups: process.env.SUB_GROUPS_TABLE!,
  locations: process.env.LOCATIONS_TABLE!,
  voiceMessages: process.env.VOICE_MESSAGES_TABLE!,
  connections: process.env.CONNECTIONS_TABLE!,
};
