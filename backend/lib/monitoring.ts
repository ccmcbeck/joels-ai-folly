import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudwatchActions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export interface MonitoringProps {
  stage: string;
  prefix: string;
  lambdaFunctions: lambda.IFunction[];
  restApi: apigateway.RestApi;
}

export class Monitoring extends Construct {
  public readonly alarmTopic: sns.Topic;

  constructor(scope: Construct, id: string, props: MonitoringProps) {
    super(scope, id);

    const { stage, prefix, lambdaFunctions, restApi } = props;

    this.alarmTopic = new sns.Topic(this, 'AlarmTopic', {
      topicName: `${prefix}-alarms`,
      displayName: `JAF ${stage} Alarms`,
    });

    // Lambda error alarms
    for (const fn of lambdaFunctions) {
      const alarm = new cloudwatch.Alarm(this, `${fn.node.id}Errors`, {
        alarmName: `${prefix}-${fn.node.id}-errors`,
        metric: fn.metricErrors({
          period: cdk.Duration.minutes(5),
          statistic: 'Sum',
        }),
        threshold: 3,
        evaluationPeriods: 1,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      });
      alarm.addAlarmAction(new cloudwatchActions.SnsAction(this.alarmTopic));
    }

    // API Gateway 5xx alarm
    const api5xxAlarm = new cloudwatch.Alarm(this, 'Api5xxErrors', {
      alarmName: `${prefix}-api-5xx`,
      metric: restApi.metricServerError({
        period: cdk.Duration.minutes(5),
        statistic: 'Sum',
      }),
      threshold: 5,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    });
    api5xxAlarm.addAlarmAction(new cloudwatchActions.SnsAction(this.alarmTopic));

    // API Gateway 4xx alarm (elevated threshold — some 4xx is normal)
    const api4xxAlarm = new cloudwatch.Alarm(this, 'Api4xxErrors', {
      alarmName: `${prefix}-api-4xx`,
      metric: restApi.metricClientError({
        period: cdk.Duration.minutes(5),
        statistic: 'Sum',
      }),
      threshold: 50,
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    });
    api4xxAlarm.addAlarmAction(new cloudwatchActions.SnsAction(this.alarmTopic));
  }
}
