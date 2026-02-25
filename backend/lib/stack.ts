import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNode from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigatewayv2Integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import * as path from 'path';

export class JoelsAiFollyStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ---- Cognito User Pool ----
    const userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: 'joels-ai-folly-users',
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      standardAttributes: {
        email: { required: true, mutable: true },
        preferredUsername: { required: false, mutable: true },
      },
      passwordPolicy: {
        minLength: 8,
        requireDigits: false,
        requireLowercase: false,
        requireUppercase: false,
        requireSymbols: false,
      },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const userPoolClient = userPool.addClient('AppClient', {
      userPoolClientName: 'joels-ai-folly-app',
      authFlows: {
        userSrp: true,
      },
    });

    // ---- DynamoDB Tables ----
    const eventsTable = new dynamodb.Table(this, 'EventsTable', {
      tableName: 'jaf-events',
      partitionKey: { name: 'eventId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // GSI for invite code lookups
    eventsTable.addGlobalSecondaryIndex({
      indexName: 'inviteCode-index',
      partitionKey: { name: 'inviteCode', type: dynamodb.AttributeType.STRING },
    });

    const usersTable = new dynamodb.Table(this, 'UsersTable', {
      tableName: 'jaf-users',
      partitionKey: { name: 'uid', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const participantsTable = new dynamodb.Table(this, 'ParticipantsTable', {
      tableName: 'jaf-event-participants',
      partitionKey: { name: 'eventId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'uid', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // GSI to list events for a user
    participantsTable.addGlobalSecondaryIndex({
      indexName: 'uid-index',
      partitionKey: { name: 'uid', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'eventId', type: dynamodb.AttributeType.STRING },
    });

    const subGroupsTable = new dynamodb.Table(this, 'SubGroupsTable', {
      tableName: 'jaf-sub-groups',
      partitionKey: { name: 'eventId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'subGroupId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const locationsTable = new dynamodb.Table(this, 'LocationsTable', {
      tableName: 'jaf-locations',
      partitionKey: { name: 'eventId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'uidTimestamp', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const voiceMessagesTable = new dynamodb.Table(this, 'VoiceMessagesTable', {
      tableName: 'jaf-voice-messages',
      partitionKey: { name: 'eventId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestampSpeaker', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // WebSocket connections tracking
    const connectionsTable = new dynamodb.Table(this, 'ConnectionsTable', {
      tableName: 'jaf-ws-connections',
      partitionKey: { name: 'connectionId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    connectionsTable.addGlobalSecondaryIndex({
      indexName: 'eventId-index',
      partitionKey: { name: 'eventId', type: dynamodb.AttributeType.STRING },
    });

    // ---- S3 Bucket ----
    const storageBucket = new s3.Bucket(this, 'StorageBucket', {
      bucketName: `jaf-storage-${this.account}-${this.region}`,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
        },
      ],
    });

    // ---- Shared Lambda environment variables ----
    const lambdaEnv = {
      EVENTS_TABLE: eventsTable.tableName,
      USERS_TABLE: usersTable.tableName,
      PARTICIPANTS_TABLE: participantsTable.tableName,
      SUB_GROUPS_TABLE: subGroupsTable.tableName,
      LOCATIONS_TABLE: locationsTable.tableName,
      VOICE_MESSAGES_TABLE: voiceMessagesTable.tableName,
      CONNECTIONS_TABLE: connectionsTable.tableName,
      STORAGE_BUCKET: storageBucket.bucketName,
      USER_POOL_ID: userPool.userPoolId,
      LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY || '',
      LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET || '',
    };

    const defaultLambdaProps: lambdaNode.NodejsFunctionProps = {
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: lambdaEnv,
      bundling: {
        minify: true,
        sourceMap: true,
      },
    };

    // ---- Lambda Functions: Auth ----
    const postConfirmation = new lambdaNode.NodejsFunction(this, 'PostConfirmation', {
      ...defaultLambdaProps,
      entry: path.join(__dirname, '../functions/auth/post-confirmation.ts'),
      functionName: 'jaf-post-confirmation',
    });
    usersTable.grantWriteData(postConfirmation);
    userPool.addTrigger(cognito.UserPoolOperation.POST_CONFIRMATION, postConfirmation);

    // ---- Lambda Functions: Events ----
    const createEvent = new lambdaNode.NodejsFunction(this, 'CreateEvent', {
      ...defaultLambdaProps,
      entry: path.join(__dirname, '../functions/events/create.ts'),
      functionName: 'jaf-create-event',
    });
    eventsTable.grantWriteData(createEvent);
    participantsTable.grantWriteData(createEvent);

    const getEvent = new lambdaNode.NodejsFunction(this, 'GetEvent', {
      ...defaultLambdaProps,
      entry: path.join(__dirname, '../functions/events/get.ts'),
      functionName: 'jaf-get-event',
    });
    eventsTable.grantReadData(getEvent);
    participantsTable.grantReadData(getEvent);
    subGroupsTable.grantReadData(getEvent);

    const listEvents = new lambdaNode.NodejsFunction(this, 'ListEvents', {
      ...defaultLambdaProps,
      entry: path.join(__dirname, '../functions/events/list.ts'),
      functionName: 'jaf-list-events',
    });
    eventsTable.grantReadData(listEvents);
    participantsTable.grantReadData(listEvents);

    const joinEvent = new lambdaNode.NodejsFunction(this, 'JoinEvent', {
      ...defaultLambdaProps,
      entry: path.join(__dirname, '../functions/events/join.ts'),
      functionName: 'jaf-join-event',
    });
    eventsTable.grantReadData(joinEvent);
    participantsTable.grantWriteData(joinEvent);

    // ---- Lambda Functions: Voice ----
    const voiceToken = new lambdaNode.NodejsFunction(this, 'VoiceToken', {
      ...defaultLambdaProps,
      entry: path.join(__dirname, '../functions/voice/token.ts'),
      functionName: 'jaf-voice-token',
    });
    participantsTable.grantReadData(voiceToken);

    const egressWebhook = new lambdaNode.NodejsFunction(this, 'EgressWebhook', {
      ...defaultLambdaProps,
      entry: path.join(__dirname, '../functions/voice/egress-webhook.ts'),
      functionName: 'jaf-egress-webhook',
    });
    voiceMessagesTable.grantWriteData(egressWebhook);
    storageBucket.grantReadWrite(egressWebhook);

    // ---- Lambda Functions: WebSocket (Location Sharing) ----
    const wsConnect = new lambdaNode.NodejsFunction(this, 'WsConnect', {
      ...defaultLambdaProps,
      entry: path.join(__dirname, '../functions/locations/connect.ts'),
      functionName: 'jaf-ws-connect',
    });
    connectionsTable.grantWriteData(wsConnect);

    const wsDisconnect = new lambdaNode.NodejsFunction(this, 'WsDisconnect', {
      ...defaultLambdaProps,
      entry: path.join(__dirname, '../functions/locations/disconnect.ts'),
      functionName: 'jaf-ws-disconnect',
    });
    connectionsTable.grantWriteData(wsDisconnect);

    const wsBroadcast = new lambdaNode.NodejsFunction(this, 'WsBroadcast', {
      ...defaultLambdaProps,
      entry: path.join(__dirname, '../functions/locations/broadcast.ts'),
      functionName: 'jaf-ws-broadcast',
    });
    locationsTable.grantWriteData(wsBroadcast);
    connectionsTable.grantReadData(wsBroadcast);

    // ---- REST API (API Gateway) ----
    const api = new apigateway.RestApi(this, 'RestApi', {
      restApiName: 'joels-ai-folly-api',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    // Cognito authorizer
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'ApiAuthorizer', {
      cognitoUserPools: [userPool],
    });

    const authOptions: apigateway.MethodOptions = {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    };

    // /events
    const eventsResource = api.root.addResource('events');
    eventsResource.addMethod('POST', new apigateway.LambdaIntegration(createEvent), authOptions);
    eventsResource.addMethod('GET', new apigateway.LambdaIntegration(listEvents), authOptions);

    // /events/join
    const joinResource = eventsResource.addResource('join');
    joinResource.addMethod('POST', new apigateway.LambdaIntegration(joinEvent), authOptions);

    // /events/{eventId}
    const eventResource = eventsResource.addResource('{eventId}');
    eventResource.addMethod('GET', new apigateway.LambdaIntegration(getEvent), authOptions);

    // /voice/token
    const voiceResource = api.root.addResource('voice');
    const tokenResource = voiceResource.addResource('token');
    tokenResource.addMethod('POST', new apigateway.LambdaIntegration(voiceToken), authOptions);

    // /voice/egress-webhook (no auth — called by LiveKit)
    const egressResource = voiceResource.addResource('egress-webhook');
    egressResource.addMethod('POST', new apigateway.LambdaIntegration(egressWebhook));

    // ---- WebSocket API ----
    const webSocketApi = new apigatewayv2.WebSocketApi(this, 'WebSocketApi', {
      apiName: 'jaf-location-ws',
      connectRouteOptions: {
        integration: new apigatewayv2Integrations.WebSocketLambdaIntegration(
          'ConnectIntegration',
          wsConnect,
        ),
      },
      disconnectRouteOptions: {
        integration: new apigatewayv2Integrations.WebSocketLambdaIntegration(
          'DisconnectIntegration',
          wsDisconnect,
        ),
      },
    });

    webSocketApi.addRoute('broadcast', {
      integration: new apigatewayv2Integrations.WebSocketLambdaIntegration(
        'BroadcastIntegration',
        wsBroadcast,
      ),
    });

    const wsStage = new apigatewayv2.WebSocketStage(this, 'WebSocketStage', {
      webSocketApi,
      stageName: 'prod',
      autoDeploy: true,
    });

    // Grant broadcast Lambda permission to post to WebSocket connections
    wsBroadcast.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['execute-api:ManageConnections'],
        resources: [
          `arn:aws:execute-api:${this.region}:${this.account}:${webSocketApi.apiId}/${wsStage.stageName}/POST/@connections/*`,
        ],
      }),
    );

    // ---- Outputs ----
    new cdk.CfnOutput(this, 'UserPoolId', { value: userPool.userPoolId });
    new cdk.CfnOutput(this, 'UserPoolClientId', { value: userPoolClient.userPoolClientId });
    new cdk.CfnOutput(this, 'ApiUrl', { value: api.url });
    new cdk.CfnOutput(this, 'WebSocketUrl', { value: wsStage.url });
    new cdk.CfnOutput(this, 'StorageBucket', { value: storageBucket.bucketName });
  }
}
