import * as cdk from 'aws-cdk-lib';
import * as logs from 'aws-cdk-lib/aws-logs';

export type Stage = 'dev' | 'prod';

export interface StageConfig {
  stage: Stage;
  removalPolicy: cdk.RemovalPolicy;
  autoDeleteObjects: boolean;
  logRetention: logs.RetentionDays;
}

const configs: Record<Stage, StageConfig> = {
  dev: {
    stage: 'dev',
    removalPolicy: cdk.RemovalPolicy.DESTROY,
    autoDeleteObjects: true,
    logRetention: logs.RetentionDays.THREE_DAYS,
  },
  prod: {
    stage: 'prod',
    removalPolicy: cdk.RemovalPolicy.RETAIN,
    autoDeleteObjects: false,
    logRetention: logs.RetentionDays.ONE_MONTH,
  },
};

export function getConfig(stage: string): StageConfig {
  if (stage !== 'dev' && stage !== 'prod') {
    throw new Error(`Invalid stage "${stage}". Must be "dev" or "prod".`);
  }
  return configs[stage];
}
