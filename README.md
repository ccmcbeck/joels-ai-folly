# Joel's AI Folly

A cross-platform mobile app for group event communication, built for group bike rides. Combines push-to-talk voice, live location sharing, turn-by-turn route navigation, and off-route alerts — all in one app.

Built with React Native (Expo) + TypeScript and an AWS serverless backend.

## Features

- **Push-to-talk** — Hold to talk to everyone, a sub-group, or an individual. Voice is transcribed and archived.
- **Route navigation** — Load a GPX, Ride with GPS, or Strava route and get turn-by-turn directions (works offline)
- **Location sharing** — See all participants on the map with relative positions ("10 min behind")
- **Off-route alerts** — Get notified when someone deviates from the planned route

Target scale: 150+ participants per event.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| App | React Native + Expo SDK 54 + TypeScript |
| Navigation | Expo Router (file-based) |
| Maps | react-native-maps (Apple Maps / Google Maps) |
| Audio | expo-audio + LiveKit (real-time PTT rooms) |
| Auth | AWS Cognito via aws-amplify |
| Backend (POC) | AWS API Gateway, Lambda, DynamoDB, S3 — serverless |
| Backend (scale) | EKS — Kubernetes-based at production scale |
| Voice | LiveKit with Amazon Transcribe Streaming |
| Infrastructure | AWS CDK |

## Getting Started

### Prerequisites

- Mac with [Homebrew](https://brew.sh)
- Node.js 20.19.4+ (via nvm)
- [Expo Go](https://expo.dev/go) on your iOS or Android device

### Install dependencies

```bash
# Install Homebrew packages (includes nvm, node, etc.)
bash scripts/install-mac-brew.sh

# Install Node via nvm
nvm install   # reads .nvmrc
nvm use

# Install app dependencies
npm install
```

### Run the app

```bash
npm start
```

Scan the QR code with your phone's Camera app (iOS) or Expo Go (Android).

The app runs in **mock mode** by default — no backend required. Sign in with any email/password.

### Full setup guides

- [Mac setup & shell config](.claude/knowledge/DEVELOPING.md)
- [Running the app](.claude/knowledge/RUNNING.md)
- [Setting up Claude Code](.claude/knowledge/CLAUDING.md)

## Project Structure

```
app/          # Expo Router screens (auth, event, tabs)
components/   # Shared UI components (PushToTalk, etc.)
lib/          # Contexts, services, utilities, types
backend/      # AWS CDK infrastructure + Lambda functions
scripts/      # Dev setup scripts
test/         # Jest tests
```

## Contributing

See [.claude/knowledge/DEVELOPING.md](.claude/knowledge/DEVELOPING.md) for environment setup.
