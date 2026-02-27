#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { JoelsAiFollyStack } from '../lib/stack';
import { getConfig } from '../lib/config';

const app = new cdk.App();

const stage = app.node.tryGetContext('stage') || 'dev';
const config = getConfig(stage);

new JoelsAiFollyStack(app, `JoelsAiFolly-${config.stage}`, {
  env: {
    region: process.env.CDK_DEFAULT_REGION || 'us-west-2',
    account: process.env.CDK_DEFAULT_ACCOUNT,
  },
  config,
});
