import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { JoelsAiFollyStack } from '../lib/stack';
import { getConfig } from '../lib/config';

function createTemplate(stage: 'dev' | 'prod'): Template {
  const app = new cdk.App();
  const config = getConfig(stage);
  const stack = new JoelsAiFollyStack(app, `JoelsAiFolly-${stage}`, { config });
  return Template.fromStack(stack);
}

describe('JoelsAiFolly Stack', () => {
  describe('dev stage', () => {
    const template = createTemplate('dev');

    test('snapshot', () => {
      expect(template.toJSON()).toMatchSnapshot();
    });

    test('creates DynamoDB tables with stage prefix and DESTROY removal policy', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'jaf-dev-events',
      });
      template.hasResource('AWS::DynamoDB::Table', {
        Properties: { TableName: 'jaf-dev-events' },
        DeletionPolicy: 'Delete',
      });
    });

    test('creates Cognito user pool with stage prefix', () => {
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        UserPoolName: 'jaf-dev-users',
      });
    });

    test('creates S3 bucket with DESTROY removal policy', () => {
      template.hasResource('AWS::S3::Bucket', {
        DeletionPolicy: 'Delete',
      });
    });

    test('creates REST API with stage prefix and throttling', () => {
      template.hasResourceProperties('AWS::ApiGateway::RestApi', {
        Name: 'jaf-dev-api',
      });
      template.hasResourceProperties('AWS::ApiGateway::Stage', {
        MethodSettings: Match.arrayWith([
          Match.objectLike({
            ThrottlingRateLimit: 100,
            ThrottlingBurstLimit: 50,
          }),
        ]),
      });
    });

    test('creates WebSocket API with stage prefix', () => {
      template.hasResourceProperties('AWS::ApiGatewayV2::Api', {
        Name: 'jaf-dev-location-ws',
        ProtocolType: 'WEBSOCKET',
      });
    });

    test('creates all 10 Lambda functions with stage prefix', () => {
      const lambdaNames = [
        'jaf-dev-post-confirmation',
        'jaf-dev-create-event',
        'jaf-dev-get-event',
        'jaf-dev-list-events',
        'jaf-dev-join-event',
        'jaf-dev-voice-token',
        'jaf-dev-egress-webhook',
        'jaf-dev-ws-connect',
        'jaf-dev-ws-disconnect',
        'jaf-dev-ws-broadcast',
      ];
      for (const name of lambdaNames) {
        template.hasResourceProperties('AWS::Lambda::Function', {
          FunctionName: name,
        });
      }
    });

    test('Lambda functions have SSM_PREFIX environment variable', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
          Variables: Match.objectLike({
            SSM_PREFIX: '/jaf-dev',
            STAGE: 'dev',
          }),
        },
      });
    });

    test('creates SNS alarm topic', () => {
      template.hasResourceProperties('AWS::SNS::Topic', {
        TopicName: 'jaf-dev-alarms',
      });
    });

    test('creates CloudWatch alarms for Lambda errors', () => {
      template.resourceCountIs('AWS::CloudWatch::Alarm', 12); // 10 Lambda + API 5xx + API 4xx
    });

    test('stack has project and stage tags', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        Tags: Match.arrayWith([
          Match.objectLike({ Key: 'project', Value: 'joels-ai-folly' }),
          Match.objectLike({ Key: 'stage', Value: 'dev' }),
        ]),
      });
    });

    test('creates expected number of outputs', () => {
      template.hasOutput('UserPoolId', {});
      template.hasOutput('UserPoolClientId', {});
      template.hasOutput('ApiUrl', {});
      template.hasOutput('WebSocketUrl', {});
      template.hasOutput('StorageBucketName', {});
      template.hasOutput('Stage', { Value: 'dev' });
    });
  });

  describe('prod stage', () => {
    const template = createTemplate('prod');

    test('snapshot', () => {
      expect(template.toJSON()).toMatchSnapshot();
    });

    test('creates DynamoDB tables with RETAIN removal policy', () => {
      template.hasResource('AWS::DynamoDB::Table', {
        Properties: { TableName: 'jaf-prod-events' },
        DeletionPolicy: 'Retain',
        UpdateReplacePolicy: 'Retain',
      });
    });

    test('creates S3 bucket with RETAIN removal policy', () => {
      template.hasResource('AWS::S3::Bucket', {
        DeletionPolicy: 'Retain',
        UpdateReplacePolicy: 'Retain',
      });
    });

    test('uses prod stage prefix for all resources', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'jaf-prod-events',
      });
      template.hasResourceProperties('AWS::ApiGateway::RestApi', {
        Name: 'jaf-prod-api',
      });
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        UserPoolName: 'jaf-prod-users',
      });
    });
  });

  describe('config validation', () => {
    test('throws on invalid stage', () => {
      expect(() => getConfig('staging')).toThrow('Invalid stage "staging"');
    });

    test('dev config has DESTROY removal policy', () => {
      const config = getConfig('dev');
      expect(config.removalPolicy).toBe(cdk.RemovalPolicy.DESTROY);
      expect(config.autoDeleteObjects).toBe(true);
    });

    test('prod config has RETAIN removal policy', () => {
      const config = getConfig('prod');
      expect(config.removalPolicy).toBe(cdk.RemovalPolicy.RETAIN);
      expect(config.autoDeleteObjects).toBe(false);
    });
  });
});
