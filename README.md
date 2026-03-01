# Joel's AI Folly

A cross-platform mobile app for group event communication, built for group bike rides. Combines push-to-talk voice, live location sharing, turn-by-turn route navigation, and off-route alerts — all in one app.

Built with React Native (Expo) + TypeScript. The POC will run on an AWS serverless backend. At scale, it will run on AWS EKS (Kubernetes).

**Plans**: [Requirements](.claude/plans/joels-ai-folly/requirements.md) · [Serverless Plan](.claude/plans/joels-ai-folly/plan.md) · [Kubernetes Plan](.claude/plans/joels-ai-folly/plan-kubernetes.md) · [API Reference](.claude/knowledge/API.md)

<img src="images/Screenshot%202026-02-28%20at%2017.40.38.png" width="300" alt="App Screenshot" style="float: right; margin: 0 0 16px 24px;" />

## About the Name

The project is named after **Joel Johnstone**, whose father **[Jack Johnstone](https://www.missionbaytriathlon.com/san-diego-triathlon-history)** co-invented
the Triathlon in San Diego. Joel, **Chris Beck**, and **Jon Berke** are veteran developers
on a mission to find out whether three experienced engineers can build an entire production
app using nothing but Claude Code — for better or worse.

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

### 1. Clone the repo

```bash
git clone https://github.com/ccmcbeck/joels-ai-folly.git
cd joels-ai-folly
```

### 2. Install Homebrew packages

The script installs Homebrew if missing, then installs all required packages including nvm and node:

```bash
bash scripts/install-mac-brew.sh
```

After it completes, add Homebrew and nvm to your shell by adding this to `~/.zshrc`:

```zsh
eval "$(/opt/homebrew/bin/brew shellenv)"
export NVM_DIR="$HOME/.nvm"
[ -s "/opt/homebrew/opt/nvm/nvm.sh" ] && \. "/opt/homebrew/opt/nvm/nvm.sh"
```

Then reload your shell:

```bash
source ~/.zshrc
```

See [Mac setup & shell config](.claude/knowledge/DEVELOPING.md) for full shell setup details.

### 3. Install Node and app dependencies

```bash
nvm install   # installs Node version from .nvmrc (20.19.4)
nvm use
npm install
```

### 4. Install Expo Go on your phone

- iOS: [App Store](https://apps.apple.com/app/expo-go/id982107779)
- Android: [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)

### 5. Run the app

```bash
npm start
```

Scan the QR code with your phone's Camera app (iOS) or Expo Go (Android).

> **If the QR code doesn't work**: Press `s` in the terminal to switch to Expo Go mode, then scan again.

The app runs in **mock mode** by default — no backend required. Sign in with any email/password.

## Full Setup Guides

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
