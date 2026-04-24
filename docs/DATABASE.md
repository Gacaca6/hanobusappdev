# HanoBus — Database Schema

HanoBus uses **Google Cloud Firestore** (in Native mode) as its primary datastore.

## Why Firestore (NoSQL)?

We evaluated both PostgreSQL (SQL) and Firestore (NoSQL) for HanoBus and chose Firestore for the following reasons:

1. **Real-time listeners are built in.** Firestore's `onSnapshot` pushes bus-position updates to every connected client over a persistent channel with ~200 ms latency — exactly the primary interaction of our app. Achieving the same with Postgres would require bolting on Redis Pub/Sub, WebSockets, and a fan-out service.
2. **No server to operate.** Firestore is fully managed and autoscales. For a student-led project targeting tens of thousands of daily commuters, we do not want to run, patch, or back up database servers.
3. **Offline-first out of the box.** The Firestore client SDK caches reads and queues writes when offline, which matches Kigali's reality of patchy 3G/4G coverage.
4. **Tight integration with Auth, Functions, and FCM.** Security rules reference `request.auth.uid` directly, Cloud Functions trigger on document writes without glue code, and FCM tokens live alongside user profiles.
5. **Schema flexibility during a hackathon.** We iterate on fields (e.g. adding `heading` or `capacityPercent` to buses) without writing migrations.

**Trade-offs accepted:** no ad-hoc SQL joins, per-document write limits (~1/sec), cost scales with reads. These trade-offs are acceptable because our access patterns are predictable (lookup by `busId`, query by `routeId`), and we shard hot documents when needed.

## Collection Relationship Diagram

```
         ┌─────────┐
         │  users  │
         └────┬────┘
              │ uid (auth)
              │
              ▼
         ┌─────────┐        ┌─────────┐
         │  trips  │───────►│  buses  │
         └────┬────┘        └────┬────┘
              │                  │ routeId
              │ routeId          │
              ▼                  ▼
         ┌─────────┐        ┌─────────┐
         │ routes  │───────►│  stops  │
         └────┬────┘  stops └─────────┘
              │
              ▼
         ┌─────────┐
         │ alerts  │  (routeId optional — global if null)
         └─────────┘
```

---

## `users`

**Purpose:** One document per signed-in commuter or admin. Holds profile, language preference, and FCM tokens.

| Field        | Type                             | Description                          |
|--------------|----------------------------------|--------------------------------------|
| `uid`        | string (immutable)               | Firebase Auth UID — document ID      |
| `name`       | string                           | Display name                         |
| `email`      | string                           | Sign-in email                        |
| `phone`      | string?                          | Optional phone number                |
| `language`   | `'rw' \| 'fr' \| 'en'`           | Preferred app language               |
| `role`       | `'commuter' \| 'admin'`          | Access role                          |
| `favorites`  | string[]                         | Stop or route IDs                    |
| `fcmTokens`  | string[]                         | Device tokens for push notifications |
| `createdAt`  | timestamp (immutable)            | Account creation time                |

**Example document:**
```json
{
  "uid": "OaK2l9…",
  "name": "Furaha Uwase",
  "email": "furaha@example.com",
  "language": "rw",
  "role": "commuter",
  "favorites": ["stop_gishushu", "route_kicukiro_town"],
  "fcmTokens": ["cWx9…", "p2jF…"],
  "createdAt": "2026-03-11T08:41:02Z"
}
```

**Indexes:** single-field indexes on `role` for admin queries. No composite indexes required.

**Security rules:**
```
match /users/{userId} {
  allow read, write: if request.auth.uid == userId;
}
```

---

## `buses`

**Purpose:** Live position of every bus currently in service. Updated by the `updateBusLocation` Cloud Function.

| Field         | Type                                         | Description                    |
|---------------|----------------------------------------------|--------------------------------|
| `routeId`     | string (FK → `routes`)                       | Route this bus is serving      |
| `currentLat`  | number                                       | Latitude                       |
| `currentLng`  | number                                       | Longitude                      |
| `speedKmH`    | number?                                      | Current speed                  |
| `heading`     | number?                                      | Compass heading 0–359          |
| `lastUpdated` | timestamp                                    | Last GPS ping                  |
| `status`      | `'active' \| 'idle' \| 'offline'`            | Derived from `lastUpdated` age |
| `driverName`  | string?                                      | Driver display name            |
| `nextStop`    | string? (FK → `stops`)                       | Next upcoming stop             |

**Example:**
```json
{
  "routeId": "route_kicukiro_town",
  "currentLat": -1.9501,
  "currentLng": 30.0619,
  "speedKmH": 32,
  "heading": 287,
  "lastUpdated": "2026-04-24T11:42:18Z",
  "status": "active",
  "driverName": "Jean-Paul",
  "nextStop": "stop_gishushu"
}
```

**Indexes:**
- Composite: `(routeId ASC, status ASC, lastUpdated DESC)` — used by the map to list active buses on a route.

**Security rules:**
```
match /buses/{busId} {
  allow read:  if true;                                  // public
  allow write: if false;                                 // only via Cloud Function (admin SDK)
}
```

---

## `routes`

**Purpose:** Static catalogue of bus routes in Kigali.

| Field               | Type                                | Description                             |
|---------------------|-------------------------------------|-----------------------------------------|
| `name`              | string                              | Display name (e.g. "Kicukiro — Town")   |
| `stops`             | string[]                            | Ordered array of stop IDs               |
| `estimatedDuration` | number                              | End-to-end minutes                      |
| `direction`         | `'outbound' \| 'inbound'`           | Direction of travel                     |
| `active`            | boolean                             | Currently in service                    |

**Example:**
```json
{
  "name": "Kicukiro — Town",
  "stops": ["stop_sonatubes", "stop_gishushu", "stop_kisimenti", "stop_town"],
  "estimatedDuration": 45,
  "direction": "inbound",
  "active": true
}
```

**Indexes:** single-field on `active` for the routes list screen.

**Security rules:**
```
match /routes/{routeId} {
  allow read:  if true;                                          // public
  allow write: if request.auth.token.role == 'admin';
}
```

---

## `stops`

**Purpose:** Static catalogue of every bus stop.

| Field      | Type                      | Description                                     |
|------------|---------------------------|-------------------------------------------------|
| `name`     | string                    | Stop name                                       |
| `lat`      | number                    | Latitude                                        |
| `lng`      | number                    | Longitude                                       |
| `routeIds` | string[]                  | Routes that serve this stop                     |
| `order`    | number                    | Position along its primary route (1-indexed)    |
| `landmark` | string?                   | Nearby landmark for Kinyarwanda/French display  |

**Example:**
```json
{
  "name": "Gishushu",
  "lat": -1.9501,
  "lng": 30.0619,
  "routeIds": ["route_kicukiro_town", "route_remera_town"],
  "order": 2,
  "landmark": "KCB Gishushu"
}
```

**Indexes:** array-contains on `routeIds` for per-route stop lookups.

**Security rules:**
```
match /stops/{stopId} {
  allow read:  if true;
  allow write: if request.auth.token.role == 'admin';
}
```

---

## `alerts`

**Purpose:** Delays, disruptions, and announcements. Written by admins via `sendDelayNotification`.

| Field       | Type                                       | Description                            |
|-------------|--------------------------------------------|----------------------------------------|
| `message`   | string                                     | Localised text (max 240 chars)         |
| `routeId`   | string? (FK → `routes`)                    | Route affected; null = global alert    |
| `severity`  | `'low' \| 'medium' \| 'high'`              | Drives icon colour and push priority   |
| `timestamp` | timestamp                                  | When the alert was issued              |
| `expiresAt` | timestamp?                                 | Optional auto-dismiss time             |

**Example:**
```json
{
  "message": "Heavy traffic at Sonatubes — expect 15 min delay",
  "routeId": "route_nyabugogo_remera",
  "severity": "medium",
  "timestamp": "2026-04-24T14:30:00Z",
  "expiresAt": "2026-04-24T16:00:00Z"
}
```

**Indexes:** composite `(routeId ASC, timestamp DESC)` for per-route alert feeds.

**Security rules:**
```
match /alerts/{alertId} {
  allow read:  if true;
  allow write: if request.auth.token.role == 'admin';
}
```

---

## `trips` (future)

Not yet implemented. Will record anonymised boarding/alighting events to power `getUserTrips` and ridership analytics. Schema draft:

```
/trips/{tripId}
  - userId
  - routeId
  - busId
  - boardedAt, alightedAt
  - boardedStopId, alightedStopId
```

Writes will be created by the client after confirming a trip; reads will be restricted to the owning user (`request.auth.uid == resource.data.userId`).
