# Platform Infrastructure

Joel's AI Folly uses AWS CDK for infrastructure-as-code. A single parameterized stack is instantiated per stage (`dev` and `prod`) in a single AWS account.

## Architecture

- **Single stack, multi-stage**: `JoelsAiFolly-dev` and `JoelsAiFolly-prod` as separate CloudFormation stacks
- **Stage-aware naming**: All resources prefixed `jaf-{stage}-` (e.g., `jaf-dev-events`, `jaf-prod-users`)
- **Secrets in SSM Parameter Store**: LiveKit credentials stored as SSM parameters, not environment variables
- **CloudWatch monitoring**: Lambda error alarms and API Gateway 5xx/4xx alarms with SNS notifications

## First-time Setup

### 1. AWS credentials

Configure CLI access to your AWS account:

```bash
aws configure
# Verify access
aws sts get-caller-identity
```

### 2. CDK bootstrap

CDK needs a staging bucket and IAM roles in the target account+region. Run once per account+region:

```bash
cd backend
npx cdk bootstrap aws://ACCOUNT_ID/us-west-2
```

Replace `ACCOUNT_ID` with the output from `aws sts get-caller-identity --query Account --output text`.

### 3. Install dependencies

```bash
cd backend
npm install
```

### 4. Create SSM parameters

LiveKit secrets must exist before the stack deploys (see [SSM Parameters](#ssm-parameters) below). If you don't have LiveKit credentials yet, use placeholder values — the app runs in mock mode without them:

```bash
aws ssm put-parameter --name /jaf-dev/livekit/api-key --value placeholder --type String
aws ssm put-parameter --name /jaf-dev/livekit/api-secret --value placeholder --type SecureString
aws ssm put-parameter --name /jaf-dev/livekit/url --value wss://placeholder.example.com --type String
```

### 5. Deploy dev

```bash
npm run deploy:dev
```

CDK will show a changeset and prompt for confirmation. After deployment, the outputs (API URL, WebSocket URL, Cognito pool IDs) are printed to the terminal and available in the CloudFormation console.

### 6. Point the app at the backend

Copy the stack outputs into the app's environment:

```bash
# In the project root, create .env.local
EXPO_PUBLIC_API_URL=https://xxxxxxxxxx.execute-api.us-west-2.amazonaws.com/dev
EXPO_PUBLIC_WS_URL=wss://xxxxxxxxxx.execute-api.us-west-2.amazonaws.com/dev
EXPO_PUBLIC_USER_POOL_ID=us-west-2_xxxxxxxxx
EXPO_PUBLIC_USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Quick Reference

```bash
cd backend

# Synthesize (validate templates)
npm run synth:dev
npm run synth:prod

# Deploy
npm run deploy:dev
npm run deploy:prod        # requires --require-approval broadening

# Diff (preview changes)
npm run diff:dev
npm run diff:prod

# Destroy (dev only)
npm run destroy:dev

# Tests
npm test
```

## Stages

| Property | dev | prod |
|----------|-----|------|
| Stack name | `JoelsAiFolly-dev` | `JoelsAiFolly-prod` |
| Removal policy | DESTROY | RETAIN |
| S3 auto-delete | Yes | No |
| Log retention | 3 days | 1 month |
| API throttle | 100 req/s, 50 burst | 100 req/s, 50 burst |

## SSM Parameters

Before deploying, create these SSM parameters in your AWS account:

```bash
# Dev
aws ssm put-parameter --name /jaf-dev/livekit/api-key --value YOUR_KEY --type String
aws ssm put-parameter --name /jaf-dev/livekit/api-secret --value YOUR_SECRET --type SecureString
aws ssm put-parameter --name /jaf-dev/livekit/url --value wss://your-livekit.example.com --type String

# Prod
aws ssm put-parameter --name /jaf-prod/livekit/api-key --value YOUR_KEY --type String
aws ssm put-parameter --name /jaf-prod/livekit/api-secret --value YOUR_SECRET --type SecureString
aws ssm put-parameter --name /jaf-prod/livekit/url --value wss://your-livekit.example.com --type String
```

## Monitoring

Each stage creates:
- **10 Lambda error alarms** (threshold: 3 errors in 5 minutes)
- **1 API Gateway 5xx alarm** (threshold: 5 errors in 5 minutes)
- **1 API Gateway 4xx alarm** (threshold: 50 errors in 10 minutes)
- **1 SNS topic** (`jaf-{stage}-alarms`) for alarm notifications

Subscribe to the SNS topic to receive alerts:

```bash
aws sns subscribe \
  --topic-arn arn:aws:sns:us-west-2:ACCOUNT_ID:jaf-dev-alarms \
  --protocol email \
  --notification-endpoint your@email.com
```

## Cost Estimate (MVP)

At 5-10 users with 2-3 rides/month: **~$0.50/month** for both stacks combined. Nearly everything falls within AWS Free Tier. Post-free-tier: ~$0.70/month.

## Files

| File | Purpose |
|------|---------|
| `backend/bin/app.ts` | CDK app entry — reads stage from context, loads config |
| `backend/lib/config.ts` | Stage configuration (removal policies, log retention) |
| `backend/lib/stack.ts` | Main infrastructure stack |
| `backend/lib/monitoring.ts` | CloudWatch alarms construct |
| `backend/functions/voice/token.ts` | LiveKit token handler (reads secrets from SSM) |
| `backend/test/stack.test.ts` | CDK snapshot + assertion tests |
