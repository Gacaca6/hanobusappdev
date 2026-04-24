# HanoBus — System Architecture

## Overview

HanoBus is a real-time public-transport tracking system for Kigali. The client is a **Vite + React + TypeScript** Progressive Web App that runs in any modern browser and installs to the home screen on Android and iOS. Live bus positions, routes, stops, and alerts are stored in **Cloud Firestore**, which streams changes to every connected client through its real-time listeners. **Firebase Authentication** handles commuter and admin sign-in, **Firebase Cloud Messaging (FCM)** delivers delay and disruption push notifications, and **Firebase Cloud Functions** host the server-side logic that accepts GPS updates from buses, sanitises them, and fans out notifications. Maps are rendered with the **Google Maps JavaScript API** (with **Leaflet** as a fallback) and the browser's **Geolocation API** is used to centre the map on the commuter's current position.

## System Architecture Diagram

```
 ┌─────────────────────────────────────────────────────────────┐
 │  Client — Vite + React + TypeScript PWA                      │
 │  (Chrome / Safari / Android / iOS — installable)             │
 │                                                              │
 │  React Router ─ Zustand state ─ Tailwind UI ─ i18n (RW/FR/EN)│
 └───────────────┬─────────────────────────────┬────────────────┘
                 │                             │
       ┌─────────▼──────────┐        ┌─────────▼──────────┐
       │ Google Maps JS API │        │ Browser Geolocation│
       │   + Leaflet        │        │   (commuter GPS)   │
       └────────────────────┘        └────────────────────┘
                 │
                 ▼
 ┌─────────────────────────────────────────────────────────────┐
 │                  Firebase Cloud Functions                    │
 │    updateBusLocation · getArrivalEstimate · getRouteDetails  │
 │    sendDelayNotification · getUserTrips                      │
 └───┬─────────────────────┬───────────────────────┬────────────┘
     │                     │                       │
     ▼                     ▼                       ▼
┌──────────┐        ┌──────────────┐         ┌──────────────┐
│Firestore │◄──────►│ Firebase Auth│         │ FCM (push)   │
│ (realtime│        │  (Email +    │         │ notifications│
│   sync)  │        │  Google)     │         │              │
└────▲─────┘        └──────────────┘         └──────────────┘
     │
     │ GPS updates every 10s
     │
┌────┴─────────────────┐
│ Bus GPS Devices      │
│ (on-board trackers)  │
└──────────────────────┘
```

## Component Breakdown

### Presentation Layer — React components and pages
- **`src/pages/`** — route-level screens (`Home`, `RoutesPage`, `RouteDetailPage`, `AlertsPage`, `FavoritesPage`, `ProfilePage`, `AdminPage`, `Login`).
- **`src/components/`** — reusable building blocks (`Map`, `BottomNav`, `BottomSheet`, `Onboarding`, `SplashScreen`, `OfflineIndicator`, `ErrorBoundary`).
- **Routing** is handled by **React Router v7**.
- **Styling** is done with **Tailwind CSS v4** utilities plus a few semantic component classes.
- **i18n** lives in `src/i18n/` with dictionaries for **Kinyarwanda, French, and English**.

### State Management — Zustand
- A small number of **Zustand** stores in `src/store/` hold user session, selected route, map viewport, and notification state.
- Server state (buses, routes, stops, alerts) is not duplicated in the store — components subscribe directly to Firestore snapshot listeners, which makes the UI automatically reactive.
- Derived data (ETA, nearest stop) is computed from the live snapshot in selectors, not cached.

### Business Logic — Cloud Functions + Security Rules
- **Firebase Cloud Functions** validate incoming GPS pings, recompute ETAs, and trigger FCM broadcasts on delay events.
- **Firestore Security Rules** (`firestore.rules`) are the authoritative access-control layer — the client cannot bypass them.
- Client-side helpers in **`src/services/`** (`transitService.ts`, `notificationService.ts`, `geminiService.ts`, `busSimulation.ts`) wrap Firestore queries and external APIs behind typed interfaces.

### Data Layer — Cloud Firestore
- Each collection is described in [DATABASE.md](./DATABASE.md).
- Clients use `onSnapshot` listeners for anything that needs to update live (bus positions, alerts).
- One-shot reads are used for static reference data (routes, stops) and cached aggressively by the service worker.

### External Services
- **Google Maps JavaScript API** — map rendering, tile serving, and place search.
- **Leaflet** — lightweight fallback map used when Google Maps is unavailable or for offline tile caching.
- **Browser Geolocation API** — the commuter's current position (requested on demand, never tracked).
- **Firebase Cloud Messaging (FCM)** — push notifications for delays and disruptions.
- **Google Gemini (GenAI)** — natural-language assistant for stop/route search.

## Firestore Data Structure

```
/users/{userId}
  - name:        string
  - phone:       string
  - email:       string
  - language:    'rw' | 'fr' | 'en'
  - role:        'commuter' | 'admin'
  - createdAt:   timestamp

/buses/{busId}
  - routeId:     string            // FK → /routes/{routeId}
  - currentLat:  number
  - currentLng:  number
  - speedKmH:    number
  - lastUpdated: timestamp
  - status:      'active' | 'idle' | 'offline'
  - driverName:  string
  - nextStop:    string

/routes/{routeId}
  - name:               string
  - stops:              string[]   // ordered FKs → /stops/{stopId}
  - estimatedDuration:  number     // minutes end-to-end
  - direction:          'outbound' | 'inbound'
  - active:             boolean

/stops/{stopId}
  - name:      string
  - lat:       number
  - lng:       number
  - routeIds:  string[]            // FKs → /routes/{routeId}
  - order:     number              // position along its primary route
  - landmark:  string              // human-readable nearby landmark

/alerts/{alertId}
  - message:   string
  - routeId:   string              // optional — global if omitted
  - severity:  'low' | 'medium' | 'high'
  - timestamp: timestamp
```

## Real-time Data Flow

The end-to-end flow of a single GPS ping becoming a moving map marker on a commuter's phone:

1. **GPS device on the bus** sends latitude/longitude coordinates every **10 seconds** to a Cloud Function HTTPS endpoint.
2. The **Cloud Function** (`updateBusLocation`) validates the payload (shape, bounds, driver token), optionally smooths the position, and writes the new document to `/buses/{busId}`.
3. **Firestore** propagates the write to every open listener over a persistent WebSocket-like channel — typically in under 200 ms.
4. The **mobile app**'s `onSnapshot` listener on `/buses/{busId}` fires with the updated document.
5. The **map marker** for that bus animates to the new coordinates, and the selected route's polyline highlights the bus's progress.
6. The **arrival time** for each upstream stop is recalculated client-side from the new position, current speed, and remaining route distance, and the ETA labels on the UI refresh.

## Security Architecture

### Firebase Security Rules (authoritative)
- Defined in [`firestore.rules`](../firestore.rules) and deployed with `firebase deploy --only firestore:rules`.
- All writes require a valid Firebase Auth token. Reads are scoped per collection (see below).

### What authenticated users can do
- **Read:** their own `/users/{userId}` document, all `/routes`, `/stops`, `/buses`, and `/alerts`.
- **Write:** their own `/users/{userId}` document (profile, language preference, favourites).

### What is publicly readable
- `/routes`, `/stops`, `/buses`, and `/alerts` are readable by anyone (even signed-out users) so the map works for first-time visitors. These collections contain **no personal data**.

### What is protected
- `/users/{userId}` — readable and writable only by the owner.
- `/buses/{busId}` writes — restricted to Cloud Functions with a service account (rules block direct client writes).
- **Admin-only actions** (creating routes, editing stops, broadcasting alerts) — require `request.auth.token.role == 'admin'`.

### Client-side hardening
- Secrets live in `.env.local`, never in source. The Firebase **web** API key is client-safe by design (it identifies the project; security is enforced by rules).
- The service worker caches only public, non-sensitive data.
- All user-facing strings are localised — no English-only error messages can leak to Kinyarwanda users.

## Scalability Considerations

- **Horizontal scaling is automatic.** Firestore is a globally distributed, sharded key-value store; it scales reads and writes transparently up to thousands of ops/second per collection without operator intervention.
- **Cloud Functions autoscale** from zero to thousands of concurrent instances. Cold starts are mitigated by keeping functions small and using `minInstances: 1` on hot paths (`updateBusLocation`).
- **Connection fan-out.** Each active commuter maintains one persistent Firestore listener connection; Firestore's backend is optimised for millions of such listeners. At Kigali's scale (≤100k DAU target) this is well within free-tier capacity.
- **Cost controls.** Bus GPS pings are rate-limited to one every 10 seconds per bus. Stop/route data is cached in the service worker and re-fetched only when the `schemaVersion` document changes.
- **Offline-first strategy.**
  - Firestore's built-in offline persistence keeps the last-known bus positions and routes available without a network.
  - `vite-plugin-pwa` + Workbox precache the app shell and static tiles.
  - Writes made offline (e.g. favouriting a stop) are queued and replay when connectivity returns.
- **Future growth path.** If bus density grows beyond Firestore's per-document 1 write/second soft limit, the plan is to shard positions into `/buses/{busId}/pings/{pingId}` subcollections and materialise latest-position views via Cloud Functions.
