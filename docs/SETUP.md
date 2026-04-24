# HanoBus — Developer Setup Guide

This guide walks you from a clean machine to a running local copy of HanoBus.

## System Requirements

| Tool             | Version   | Notes                                       |
|------------------|-----------|---------------------------------------------|
| **Node.js**      | ≥ 20.x    | `node -v` to verify. LTS recommended.       |
| **npm**          | ≥ 10.x    | Comes with Node 20. Or use `pnpm` / `yarn`. |
| **Git**          | any       | For cloning and contributing.               |
| **Firebase CLI** | latest    | `npm i -g firebase-tools`                   |
| **Browser**      | Chrome / Edge / Safari / Firefox — any modern evergreen browser |

Optional for deployment: a Google Cloud / Firebase billing-enabled project.

## 1. Firebase Project Setup

### Step 1 — Create a Firebase project
1. Go to [console.firebase.google.com](https://console.firebase.google.com/).
2. Click **Add project** → give it a name (e.g. `hanobus-dev`).
3. Disable Google Analytics (not needed for dev) or enable it if you want.

### Step 2 — Enable the services we use
Inside the new project, enable each of the following:

| Service                       | How to enable                                                                 |
|-------------------------------|-------------------------------------------------------------------------------|
| **Cloud Firestore**           | Build → Firestore Database → **Create database** → Start in **production** mode → pick `europe-west` or `us-central` |
| **Authentication**            | Build → Authentication → **Get started** → enable **Email/Password** and **Google** providers |
| **Cloud Functions**           | Build → Functions → **Get started** (requires Blaze plan for deployment, emulator works on Spark) |
| **Cloud Messaging (FCM)**     | Engage → Messaging → auto-enabled once you register a web app                 |

### Step 3 — Register a Web App
1. Project Overview → **Add app** → **Web** (`</>`).
2. Register the app with nickname `hanobus-web`.
3. Firebase shows you a `firebaseConfig` object — **copy the values**. You'll paste them into `.env.local` in the next step.

> The web SDK's `apiKey` is a public project identifier — not a secret. Security is enforced by your Firestore rules.

### Step 4 — (Optional) Register Android / iOS apps
Only needed if you plan to wrap the PWA in a native shell (e.g. Capacitor or a future React Native build).

- **Android:** Add Android app → package name `rw.hanobus` → download `google-services.json` → place in `android/app/`.
- **iOS:** Add iOS app → bundle ID `rw.hanobus` → download `GoogleService-Info.plist` → add to Xcode project.

Both files are already listed in `.gitignore` and **must never be committed**.

### Step 5 — Configure environment variables
From the project root:

```bash
cp .env.example .env.local
```

Then open `.env.local` and paste the values Firebase gave you in Step 3:

```bash
FIREBASE_API_KEY=AIzaSy…
FIREBASE_AUTH_DOMAIN=hanobus-dev.firebaseapp.com
FIREBASE_PROJECT_ID=hanobus-dev
FIREBASE_STORAGE_BUCKET=hanobus-dev.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789012
FIREBASE_APP_ID=1:123456789012:web:abcdef…
GOOGLE_MAPS_API_KEY=AIzaSy…       # create in Google Cloud Console → APIs & Services
GEMINI_API_KEY=…                  # optional — for AI search
APP_URL=http://localhost:3000
```

## 2. Running Locally

From the project root:

```bash
# Install dependencies
npm install

# Start the Vite dev server
npm run dev
```

The app is served at **http://localhost:3000**.

### Running on a phone for real GPS / map testing

1. Make sure your laptop and phone are on the **same Wi-Fi**.
2. Find your laptop's LAN IP (`ipconfig` on Windows, `ifconfig` on macOS/Linux).
3. Open `http://<laptop-ip>:3000` on your phone's browser.
4. Accept the "allow location" prompt.
5. Install to the home screen from the browser menu to get the full PWA experience.

> The `vite.config.ts` already binds to `0.0.0.0`, so LAN access works without extra config.

## 3. Running Firebase Functions Locally (Emulator)

Cloud Functions are not in the current repo tree, but when you add them (or pull a branch that has them), run them against the local emulator so you don't hit your production project:

```bash
# one-time: log in
firebase login

# start all emulators (Auth, Firestore, Functions, Hosting)
firebase emulators:start
```

The emulator suite UI opens at **http://localhost:4000**. Point the client at the emulators by setting these in `.env.local`:

```bash
VITE_USE_EMULATORS=true
VITE_EMULATOR_HOST=localhost
```

## 4. Seeding Test Data

The repo ships with a Firestore seed script:

```bash
npx tsx scripts/seedFirestore.ts
```

This populates `routes`, `stops`, and a handful of `buses` so the map isn't empty on first run. Run it against the emulator (safe) or your dev project.

## 5. Common Errors & Fixes

| Symptom                                                         | Cause / Fix                                                                                       |
|-----------------------------------------------------------------|---------------------------------------------------------------------------------------------------|
| `Firebase: Error (auth/invalid-api-key)`                        | `.env.local` missing or typo. Re-copy from Firebase console.                                      |
| Map tiles don't load, console says `RefererNotAllowedMapError`  | In Google Cloud Console → Credentials → your Maps key → **Website restrictions** → add `http://localhost:3000/*`. |
| `Missing or insufficient permissions` on Firestore reads        | Firestore rules not deployed, or you're signed out. Deploy with `firebase deploy --only firestore:rules`. |
| `ENOSPC: System limit for number of file watchers reached` (Linux) | `echo fs.inotify.max_user_watches=524288 \| sudo tee -a /etc/sysctl.conf && sudo sysctl -p`       |
| Phone browser won't connect to `http://<laptop-ip>:3000`        | Windows Defender firewall blocking port 3000 — add an inbound rule, or turn off for private network. |
| `tsc --noEmit` fails with missing types                         | `npm install` again; ensure `@types/node` and `@types/leaflet` pulled down.                       |
| Service worker shows stale UI after deploy                      | Bump the app version in `package.json` — `vite-plugin-pwa` uses it to invalidate the cache.       |
| `FirebaseError: Missing or insufficient permissions` only on writes | You need to be an admin for that action. Set a custom claim: `firebase auth:set-custom-user-claims <uid> '{"role":"admin"}'`. |

## 6. Next Steps

- Read [ARCHITECTURE.md](./ARCHITECTURE.md) for how the pieces fit together.
- Read [DATABASE.md](./DATABASE.md) for the Firestore schema.
- Read [CONTRIBUTING.md](../CONTRIBUTING.md) before opening a PR.
