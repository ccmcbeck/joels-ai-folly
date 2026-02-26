# Running the App

## Prerequisites

### iOS Simulator Setup (first time only)
1. Open Xcode → **Settings (⌘,)** → **Components** tab
2. Download an iOS runtime (e.g. iOS 18)
3. Open **Xcode → Window → Devices and Simulators → Simulators** tab
4. Click `+` and create a simulator (e.g. iPhone 16, iOS 18)

### Expo Go (for physical device)
1. Create a free account at [expo.dev](https://expo.dev)
2. Install **Expo Go** from the App Store
3. Sign in to Expo Go with your account
4. Use Expo Go's built-in scanner to scan the QR code (the regular iOS camera won't work)

## Starting the App

```bash
npm start
```

Then press:
- `i` — open in iOS simulator
- `a` — open in Android emulator
- `w` — open in web browser
- Scan QR code with Expo Go on a physical device

## Notes
- Uses `legacy-peer-deps=true` in `.npmrc` due to peer dependency conflicts between `@aws-amplify/react-native` and `react-native-get-random-values` (v2.0.0)
- Backend is a separate CDK app in `backend/` — see `backend/` for deployment instructions
