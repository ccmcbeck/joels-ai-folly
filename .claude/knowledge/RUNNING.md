# Running the App

## Prerequisites

### 1. Node.js (via nvm)

Install nvm if not already installed:

```bash
brew install nvm
```

Then add to your shell profile (`~/.zshrc` or `~/.bashrc`):

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "/opt/homebrew/opt/nvm/nvm.sh" ] && \. "/opt/homebrew/opt/nvm/nvm.sh"
```

Restart your terminal, then:

```bash
nvm install   # reads .nvmrc, installs Node 20.19.4
nvm use       # switches to the correct version
```

Required: **Node 20.19.4+** (SDK 54 requirement)

### 2. npm dependencies

```bash
npm install
```

Uses `legacy-peer-deps=true` (set in `.npmrc`) due to peer dependency conflicts between
`@aws-amplify/react-native` and `react-native-get-random-values`.

### 3. Expo Go (physical device)

1. Create a free account at [expo.dev](https://expo.dev)
2. Install **Expo Go** from the App Store (iOS) or Google Play (Android)
3. Sign in to Expo Go with your expo.dev account

**Note**: On iOS, scan the QR code with the built-in Camera app — it will show a notification
to open in Expo Go. Tap it. On Android, use the built-in QR scanner inside Expo Go.

### 4. iOS Simulator (optional, Mac only)

1. Install Xcode from the Mac App Store
2. Open **Xcode → Settings (⌘, ) → Platforms** → download iOS runtime (e.g. iOS 18)
3. Open **Xcode → Window → Devices and Simulators → Simulators** tab
4. Click `+` and create a device (e.g. iPhone 16, iOS 18)

## Starting the App

```bash
npm start
```

Then press:
- `i` — open in iOS simulator
- `a` — open in Android emulator
- `w` — open in web browser
- Scan QR code with Expo Go on a physical device

If the QR code shows a dev client error, press `s` to switch to Expo Go mode.

### Fast Refresh (hot reload)

Expo uses **Fast Refresh** — most code changes (components, styles, logic) automatically
reload on the device without re-scanning the QR code. Just save the file and the app updates
in place.

**Exception**: Changes to `app.json` or native config require restarting the dev server and
re-scanning the QR code.

**iPhone hotspot**: If your laptop is connected to your iPhone's personal hotspot, LAN mode
works fine — both devices are on the same network and no tunnel is needed.

If the device can't connect over LAN, use tunnel mode:

```bash
npx expo start --tunnel
```

## Backend

The backend is a separate CDK app in `backend/`. See [PLATFORM.md](PLATFORM.md) for deployment
instructions, AWS account details, and stack outputs.

The app runs in mock mode (no backend required) when `EXPO_PUBLIC_API_URL` is not set.
When `.env.local` exists with the stack outputs, the app connects to the real AWS backend.

## Expo Go Limitations

**Amplify SRP auth does not work in Expo Go.** The `@aws-amplify/react-native` package requires
native module linking (`pod install` + native rebuild), which Expo Go doesn't support. The app
uses `USER_PASSWORD_AUTH` flow instead (configured in `lib/services/auth.ts` and on the Cognito
client). This is safe over HTTPS for development.

When building for production with `eas build` or `expo run:ios`, native modules are linked and
the auth flow can be switched back to SRP (`USER_SRP_AUTH`) by removing the `authFlowType`
option from `signIn()` and importing `@aws-amplify/react-native` in `app/_layout.tsx`.