# Security Policy

The HanoBus team takes security seriously. This document explains how we protect user data and how to report a vulnerability.

## How We Handle Sensitive Data

- **No secrets in source code.** All API keys, service-account credentials, and tokens live in environment variables (`.env.local` for dev, hosting-provider env vars for production). See [`.env.example`](./.env.example) for the expected shape.
- **`.env*` files are gitignored** (except `.env.example`). Credential files like `google-services.json`, `GoogleService-Info.plist`, and `serviceAccountKey.json` are also gitignored and never committed.
- **The Firebase web API key is not a secret.** It identifies the project and is designed to ship to clients. All real protection is enforced by [`firestore.rules`](./firestore.rules).
- **Server-side secrets** (Gemini API key, admin credentials) live only on Cloud Functions, configured via `firebase functions:config:set`.
- **HTTPS everywhere.** The production site is served over TLS; the service worker refuses to register on plain HTTP.

## Firebase Security Rules Protect User Data

Access to Firestore is gated by rules deployed from [`firestore.rules`](./firestore.rules):

- `/users/{uid}` — only the owning authenticated user can read or write their own document.
- `/buses`, `/routes`, `/stops`, `/alerts` — publicly **readable** (so the map works for first-time visitors) but writes are restricted:
  - `/buses` writes are blocked for clients entirely; only the `updateBusLocation` Cloud Function (running with a service account) can write.
  - `/routes`, `/stops`, `/alerts` writes require `request.auth.token.role == 'admin'`.
- **Rules are validated in CI** against a Firestore emulator before every deployment.

Rules are deployed with `firebase deploy --only firestore:rules` — **always deploy rules before shipping code that depends on new fields.**

## What Data HanoBus Collects and Why

HanoBus is deliberately privacy-minimal. We collect only what the product needs to work.

| Data                                | Purpose                                                          | Stored where                      |
|-------------------------------------|------------------------------------------------------------------|-----------------------------------|
| **Bus GPS positions** (from buses)  | Show live vehicles on the map                                    | `/buses/{busId}` (public read)    |
| **User email + display name**       | Authentication and personalisation                               | `/users/{uid}` (private to user)  |
| **Language preference**             | Localise the UI                                                  | `/users/{uid}`                    |
| **Favourite stops & routes**        | Surface the user's routine on the Home screen                    | `/users/{uid}`                    |
| **FCM device tokens**               | Deliver push notifications about delays and disruptions          | `/users/{uid}`                    |
| **Browser geolocation**             | Centre the map on the user. **Used only while the app is open** — never tracked, never stored, never uploaded. | Client memory only |

### What we do NOT collect

- ❌ Commuter location history (we only centre the map; we do not record where you are)
- ❌ Contacts, photos, microphone, camera
- ❌ Cross-site tracking identifiers
- ❌ Phone numbers (unless a user voluntarily adds one)
- ❌ Payment information

### Data retention

- User profile data is retained for as long as the account exists.
- Bus positions are kept as "latest position" only — we do not build a historical tracking log of vehicles.
- A user can delete their account from the Profile page; this removes their `/users/{uid}` document and revokes all FCM tokens.

## Reporting a Security Vulnerability

If you believe you've found a security issue in HanoBus, **please do not open a public GitHub issue**. Instead, email the team:

📧 **mikelgodwin1234@gmail.com**

Please include:
- A description of the vulnerability
- Steps to reproduce (proof-of-concept if you have one)
- The impact you believe it has
- Any suggested fix

### What to expect

- **Acknowledgement within 48 hours.**
- A fix timeline proportional to severity (critical: days; medium: weeks).
- Credit in the release notes if you'd like it.

We ask that you:
- Give us a reasonable window to fix the issue before public disclosure
- Do not exfiltrate user data, degrade service, or access accounts that are not your own
- Do not run automated scanners against production infrastructure

Thank you for helping keep HanoBus and our commuters safe. 🇷🇼
