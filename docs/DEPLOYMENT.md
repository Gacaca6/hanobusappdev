# HanoBus — Deployment Guide

HanoBus is primarily a **PWA** (Vite + React), with optional future native-shell builds. This document covers every production deployment target.

## 1. Web / PWA (primary target)

### Build for production
```bash
npm run build
```
The static bundle is emitted to `dist/`. This is what you ship.

### Deploy to Firebase Hosting (recommended)
```bash
# one-time: initialise hosting
firebase init hosting
# accept dist/ as the public directory, configure as SPA (rewrite all to /index.html)

# deploy
firebase deploy --only hosting
```

### Deploy to Vercel / Netlify / Cloudflare Pages
- **Build command:** `npm run build`
- **Output directory:** `dist`
- **Node version:** `20`
- Set all env vars from `.env.example` in the host's dashboard.

### Deploy to Lovable (current demo)
The live demo at [hano-route-reveal.lovable.app](https://hano-route-reveal.lovable.app/) is deployed via Lovable's GitHub integration — pushing to `main` triggers a redeploy automatically.

## 2. Firebase Cloud Functions

```bash
# Deploy all functions
firebase deploy --only functions

# Deploy a specific function (faster)
firebase deploy --only functions:updateBusLocation

# Rollback to the previous revision
firebase functions:rollback <functionName>
```

Functions require the **Blaze (pay-as-you-go)** plan. Costs for Kigali-scale traffic are well within the free tier of Blaze (no monthly fee, just metered usage).

## 3. Firestore Rules & Indexes

```bash
# Deploy security rules
firebase deploy --only firestore:rules

# Deploy composite indexes
firebase deploy --only firestore:indexes
```

**Always deploy rules before deploying code that depends on new fields** — otherwise clients will start writing fields the rules reject.

## 4. Android Builds (future — when we ship a native shell)

The current codebase is a PWA, which Android users can install from the browser. When we add a Capacitor or React Native wrapper, the build path will be:

```bash
# APK for testing / sideloading
cd android
./gradlew assembleRelease
# output: android/app/build/outputs/apk/release/app-release.apk

# AAB for Google Play Store
./gradlew bundleRelease
# output: android/app/build/outputs/bundle/release/app-release.aab
```

Before uploading to Play Console:
- Bump `versionCode` and `versionName` in `android/app/build.gradle`
- Sign with the upload keystore (never commit the keystore)
- Provide the `google-services.json` for the **production** Firebase project

## 5. iOS Builds (future)

Requires a Mac with Xcode 15+ and a paid Apple Developer account.

```bash
cd ios
pod install
# open ios/HanoBus.xcworkspace in Xcode
# Product → Archive → Distribute App → App Store Connect
```

- Use the **production** `GoogleService-Info.plist`
- Bump `CFBundleShortVersionString` and `CFBundleVersion`
- Submit via Transporter or directly from Xcode

## 6. Environment Variables in Production

Production env vars are managed by the hosting provider, **never committed**.

| Variable                          | Web (Firebase Hosting)                  | Vercel / Netlify         |
|-----------------------------------|-----------------------------------------|--------------------------|
| `FIREBASE_*`                      | baked into the build at CI time         | Project → Env variables  |
| `GOOGLE_MAPS_API_KEY`             | same                                    | same                     |
| `GEMINI_API_KEY`                  | **server-side only** — put in Cloud Function config | Vercel serverless env |

Use `firebase functions:config:set` for function-side secrets:

```bash
firebase functions:config:set gemini.key="$GEMINI_API_KEY"
```

## 7. Pre-Launch Checklist

- [ ] All env vars set in the hosting provider (no defaults leaking)
- [ ] `firebase-applet-config.json` points to the **production** Firebase project
- [ ] Firestore rules deployed (`firebase deploy --only firestore:rules`)
- [ ] Composite indexes deployed and status **Ready** in the Firebase console
- [ ] `google-services.json` and `GoogleService-Info.plist` confirmed **not** in the repo
- [ ] `npm run build` succeeds with no TypeScript errors
- [ ] `npm run lint` passes
- [ ] PWA installs to the home screen and launches full-screen
- [ ] Service worker caches the app shell (verify in DevTools → Application)
- [ ] Offline test: disable network, reload — core UI still works
- [ ] Google Maps key has **HTTP referrer restrictions** for your production domain
- [ ] Firebase Auth **authorized domains** include the production domain
- [ ] FCM web push VAPID key configured
- [ ] Language switcher verified in **Kinyarwanda, French, and English**
- [ ] Google Sign-In verified on a real mobile device
- [ ] Monitor set up: Firebase console → Crashlytics + Performance
- [ ] `CHANGELOG.md` updated with the release version and date
- [ ] Git tag created: `git tag v1.0.0 && git push --tags`
