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
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import * as path from 'path';
import { StageConfig } from './config';
import { Monitoring } from './monitoring';

export interface JoelsAiFollyStackProps extends cdk.StackProps {
  config: StageConfig;
}

export class JoelsAiFollyStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: JoelsAiFollyStackProps) {
    super(scope, id, props);

    const { stage, removalPolicy, autoDeleteObjects, logRetention } = props.config;
    const prefix = `jaf-${stage}`;

    // ---- Tags ----
    cdk.Tags.of(this).add('project', 'joels-ai-folly');
    cdk.Tags.of(this).add('stage', stage);

    // ---- SSM Parameters for LiveKit secrets ----
    const livekitApiKey = ssm.StringParameter.fromStringParameterName(
      this,
      'LiveKitApiKey',
      `/${prefix}/livekit/api-key`,
    );
    const livekitApiSecret = ssm.StringParameter.fromSecureStringParameterAttributes(
      this,
      'LiveKitApiSecret',
      { parameterName: `/${prefix}/livekit/api-secret` },
    );
    const livekitUrl = ssm.StringParameter.fromStringParameterName(
      this,
      'LiveKitUrl',
      `/${prefix}/livekit/url`,
    );

    // ---- Cognito User Pool ----
    const userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: `${prefix}-users`,
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
      removalPolicy,
    });

    const userPoolClient = userPool.addClient('AppClient', {
      userPoolClientName: `${prefix}-app`,
      authFlows: {
        userSrp: true,
      },
    });

    // ---- DynamoDB Tables ----
    const eventsTable = new dynamodb.Table(this, 'EventsTable', {
      tableName: `${prefix}-events`,
      partitionKey: { name: 'eventId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy,
    });

    eventsTable.addGlobalSecondaryIndex({
      indexName: 'inviteCode-index',
      partitionKey: { name: 'inviteCode', type: dynamodb.AttributeType.STRING },
    });

    const usersTable = new dynamodb.Table(this, 'UsersTable', {
      tableName: `${prefix}-users`,
      partitionKey: { name: 'uid', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy,
    });

    const participantsTable = new dynamodb.Table(this, 'ParticipantsTable', {
      tableName: `${prefix}-event-participants`,
      partitionKey: { name: 'eventId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'uid', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy,
    });

    participantsTable.addGlobalSecondaryIndex({
      indexName: 'uid-index',
      partitionKey: { name: 'uid', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'eventId', type: dynamodb.AttributeType.STRING },
    });

    const subGroupsTable = new dynamodb.Table(this, 'SubGroupsTable', {
      tableName: `${prefix}-sub-groups`,
      partitionKey: { name: 'eventId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'subGroupId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy,
    });

    const locationsTable = new dynamodb.Table(this, 'LocationsTable', {
      tableName: `${prefix}-locations`,
      partitionKey: { name: 'eventId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'uidTimestamp', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const voiceMessagesTable = new dynamodb.Table(this, 'VoiceMessagesTable', {
      tableName: `${prefix}-voice-messages`,
      partitionKey: { name: 'eventId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestampSpeaker', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy,
    });

    const connectionsTable = new dynamodb.Table(this, 'ConnectionsTable', {
      tableName: `${prefix}-ws-connections`,
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
      bucketName: `${prefix}-storage-${this.account}-${this.region}`,
      removalPolicy,
      autoDeleteObjects: autoDeleteObjects,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
        },
      ],
    });

    // ---- Shared Lambda environment variables ----
    // Base env excludes USER_POOL_ID to avoid circular dep with PostConfirmation trigger
    const baseLambdaEnv = {
      STAGE: stage,
      EVENTS_TABLE: eventsTable.tableName,
      USERS_TABLE: usersTable.tableName,
      PARTICIPANTS_TABLE: participantsTable.tableName,
      SUB_GROUPS_TABLE: subGroupsTable.tableName,
      LOCATIONS_TABLE: locationsTable.tableName,
      VOICE_MESSAGES_TABLE: voiceMessagesTable.tableName,
      CONNECTIONS_TABLE: connectionsTable.tableName,
      STORAGE_BUCKET: storageBucket.bucketName,
      SSM_PREFIX: `/${prefix}`,
    };

    const lambdaEnv = {
      ...baseLambdaEnv,
      USER_POOL_ID: userPool.userPoolId,
    };

    const defaultLambdaProps: lambdaNode.NodejsFunctionProps = {
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: lambdaEnv,
      logRetention: logRetention,
      bundling: {
        minify: true,
        sourceMap: true,
        externalModules: ['@aws-sdk/*'],
      },
    };

    // ---- Lambda Functions: Auth ----
    // PostConfirmation uses baseLambdaEnv (no USER_POOL_ID) to break circular dep
    // with userPool.addTrigger — Cognito triggers receive pool context from the event
    const postConfirmation = new lambdaNode.NodejsFunction(this, 'PostConfirmation', {
      ...defaultLambdaProps,
      environment: baseLambdaEnv,
      entry: path.join(__dirname, '../functions/auth/post-confirmation.ts'),
      functionName: `${prefix}-post-confirmation`,
    });
    usersTable.grantWriteData(postConfirmation);
    userPool.addTrigger(cognito.UserPoolOperation.POST_CONFIRMATION, postConfirmation);

    // ---- Lambda Functions: Events ----
    const createEvent = new lambdaNode.NodejsFunction(this, 'CreateEvent', {
      ...defaultLambdaProps,
      entry: path.join(__dirname, '../functions/events/create.ts'),
      functionName: `${prefix}-create-event`,
    });
    eventsTable.grantWriteData(createEvent);
    participantsTable.grantWriteData(createEvent);

    const getEvent = new lambdaNode.NodejsFunction(this, 'GetEvent', {
      ...defaultLambdaProps,
      entry: path.join(__dirname, '../functions/events/get.ts'),
      functionName: `${prefix}-get-event`,
    });
    eventsTable.grantReadData(getEvent);
    participantsTable.grantReadData(getEvent);
    subGroupsTable.grantReadData(getEvent);

    const listEvents = new lambdaNode.NodejsFunction(this, 'ListEvents', {
      ...defaultLambdaProps,
      entry: path.join(__dirname, '../functions/events/list.ts'),
      functionName: `${prefix}-list-events`,
    });
    eventsTable.grantReadData(listEvents);
    participantsTable.grantReadData(listEvents);

    const joinEvent = new lambdaNode.NodejsFunction(this, 'JoinEvent', {
      ...defaultLambdaProps,
      entry: path.join(__dirname, '../functions/events/join.ts'),
      functionName: `${prefix}-join-event`,
    });
    eventsTable.grantReadData(joinEvent);
    participantsTable.grantWriteData(joinEvent);

    // ---- Lambda Functions: Voice ----
    const voiceToken = new lambdaNode.NodejsFunction(this, 'VoiceToken', {
      ...defaultLambdaProps,
      entry: path.join(__dirname, '../functions/voice/token.ts'),
      functionName: `${prefix}-voice-token`,
    });
    participantsTable.grantReadData(voiceToken);
    livekitApiKey.grantRead(voiceToken);
    livekitApiSecret.grantRead(voiceToken);
    livekitUrl.grantRead(voiceToken);

    const egressWebhook = new lambdaNode.NodejsFunction(this, 'EgressWebhook', {
      ...defaultLambdaProps,
      entry: path.join(__dirname, '../functions/voice/egress-webhook.ts'),
      functionName: `${prefix}-egress-webhook`,
    });
    voiceMessagesTable.grantWriteData(egressWebhook);
    storageBucket.grantReadWrite(egressWebhook);

    // ---- Lambda Functions: WebSocket (Location Sharing) ----
    const wsConnect = new lambdaNode.NodejsFunction(this, 'WsConnect', {
      ...defaultLambdaProps,
      entry: path.join(__dirname, '../functions/locations/connect.ts'),
      functionName: `${prefix}-ws-connect`,
    });
    connectionsTable.grantWriteData(wsConnect);

    const wsDisconnect = new lambdaNode.NodejsFunction(this, 'WsDisconnect', {
      ...defaultLambdaProps,
      entry: path.join(__dirname, '../functions/locations/disconnect.ts'),
      functionName: `${prefix}-ws-disconnect`,
    });
    connectionsTable.grantWriteData(wsDisconnect);

    const wsBroadcast = new lambdaNode.NodejsFunction(this, 'WsBroadcast', {
      ...defaultLambdaProps,
      entry: path.join(__dirname, '../functions/locations/broadcast.ts'),
      functionName: `${prefix}-ws-broadcast`,
    });
    locationsTable.grantWriteData(wsBroadcast);
    connectionsTable.grantReadData(wsBroadcast);

    // ---- REST API (API Gateway) ----
    const api = new apigateway.RestApi(this, 'RestApi', {
      restApiName: `${prefix}-api`,
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
      deployOptions: {
        stageName: stage,
        throttlingRateLimit: 100,
        throttlingBurstLimit: 50,
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
      apiName: `${prefix}-location-ws`,
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
      stageName: stage,
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

    // ---- Monitoring ----
    const lambdaFunctions = [
      postConfirmation,
      createEvent,
      getEvent,
      listEvents,
      joinEvent,
      voiceToken,
      egressWebhook,
      wsConnect,
      wsDisconnect,
      wsBroadcast,
    ];

    new Monitoring(this, 'Monitoring', {
      stage,
      prefix,
      lambdaFunctions,
      restApi: api,
    });

    // ---- Outputs ----
    new cdk.CfnOutput(this, 'UserPoolId', { value: userPool.userPoolId });
    new cdk.CfnOutput(this, 'UserPoolClientId', { value: userPoolClient.userPoolClientId });
    new cdk.CfnOutput(this, 'ApiUrl', { value: api.url });
    new cdk.CfnOutput(this, 'WebSocketUrl', { value: wsStage.url });
    new cdk.CfnOutput(this, 'StorageBucketName', { value: storageBucket.bucketName });
    new cdk.CfnOutput(this, 'Stage', { value: stage });
  }
}
