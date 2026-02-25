#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { JoelsAiFollyStack } from '../lib/stack';

const app = new cdk.App();

new JoelsAiFollyStack(app, 'JoelsAiFollyStack', {
  env: {
    region: process.env.CDK_DEFAULT_REGION || 'us-west-2',
    account: process.env.CDK_DEFAULT_ACCOUNT,
  },
});
