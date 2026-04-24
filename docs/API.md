# HanoBus — API Reference

This document describes every **Firebase Cloud Function** HanoBus exposes. Functions fall into three trigger types:

- **HTTPS** — callable by clients over HTTPS (`functions.https.onCall` or `onRequest`).
- **Firestore trigger** — runs automatically when a document is created/updated/deleted.
- **Scheduled** — runs on a cron schedule (`functions.pubsub.schedule`).

All callable functions require a valid Firebase Auth token unless explicitly marked public. Request/response payloads are JSON.

---

## 1. `updateBusLocation`

- **Trigger:** HTTPS (onRequest) — POST endpoint called by on-board GPS devices
- **Auth:** Device JWT (signed by admin SDK at device provisioning)
- **Description:** Accepts a GPS ping from a bus, validates it, and writes the new position to `/buses/{busId}`.

**Parameters (request body):**

| Field       | Type     | Required | Description                                    |
|-------------|----------|----------|------------------------------------------------|
| `busId`     | string   | yes      | Document ID of the bus                         |
| `lat`       | number   | yes      | Latitude  (−90 … 90)                           |
| `lng`       | number   | yes      | Longitude (−180 … 180)                         |
| `speedKmH`  | number   | no       | Current speed in km/h                          |
| `heading`   | number   | no       | Compass heading 0–359                          |
| `timestamp` | number   | yes      | Unix ms — rejected if > 30s skew from server   |

**Returns:**
```json
{ "ok": true, "busId": "bus_012", "writtenAt": 1714153600123 }
```

**Example:**
```bash
curl -X POST https://<region>-<project>.cloudfunctions.net/updateBusLocation \
  -H "Authorization: Bearer $DEVICE_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "busId": "bus_012",
    "lat": -1.9501,
    "lng": 30.0619,
    "speedKmH": 32,
    "timestamp": 1714153600000
  }'
```

---

## 2. `getArrivalEstimate`

- **Trigger:** HTTPS callable (`onCall`)
- **Auth:** Required (any authenticated user)
- **Description:** Returns the ETA for every bus currently on a given route to a given stop.

**Parameters:**

| Field     | Type   | Required | Description                          |
|-----------|--------|----------|--------------------------------------|
| `routeId` | string | yes      | The route to query                   |
| `stopId`  | string | yes      | The stop the commuter is waiting at  |

**Returns:**
```json
{
  "stopId": "stop_gishushu",
  "estimates": [
    { "busId": "bus_012", "etaMinutes": 4,  "distanceMeters": 1850 },
    { "busId": "bus_031", "etaMinutes": 12, "distanceMeters": 5200 }
  ]
}
```

**Example (JS client):**
```ts
import { getFunctions, httpsCallable } from 'firebase/functions';

const fn = httpsCallable(getFunctions(), 'getArrivalEstimate');
const { data } = await fn({ routeId: 'route_kicukiro_town', stopId: 'stop_gishushu' });
```

---

## 3. `getRouteDetails`

- **Trigger:** HTTPS callable (`onCall`)
- **Auth:** Public (no token required)
- **Description:** Returns a full route document with all its stops hydrated (in order) and a polyline ready for map rendering.

**Parameters:**

| Field     | Type   | Required | Description        |
|-----------|--------|----------|--------------------|
| `routeId` | string | yes      | Route document ID  |

**Returns:**
```json
{
  "id": "route_kicukiro_town",
  "name": "Kicukiro — Town",
  "direction": "inbound",
  "estimatedDuration": 45,
  "stops": [
    { "id": "stop_sonatubes", "name": "Sonatubes", "lat": -1.9723, "lng": 30.1009, "order": 1 },
    { "id": "stop_gishushu",  "name": "Gishushu",  "lat": -1.9501, "lng": 30.0619, "order": 2 }
  ],
  "polyline": "u~nvBi_~uL..."
}
```

---

## 4. `sendDelayNotification`

- **Trigger:** HTTPS callable (`onCall`) — admin only
- **Auth:** Required, `request.auth.token.role == 'admin'`
- **Description:** Publishes a delay/disruption alert, writes it to `/alerts`, and fans out an FCM push to every user subscribed to the affected route.

**Parameters:**

| Field      | Type                          | Required | Description                          |
|------------|-------------------------------|----------|--------------------------------------|
| `routeId`  | string                        | yes      | Route the delay applies to           |
| `message`  | string                        | yes      | Localised message (max 240 chars)    |
| `severity` | `"low" \| "medium" \| "high"` | yes      | Used for icon + push priority        |

**Returns:**
```json
{
  "ok": true,
  "alertId": "alert_20260424_1430",
  "recipients": 1284
}
```

**Example:**
```ts
await httpsCallable(getFunctions(), 'sendDelayNotification')({
  routeId: 'route_nyabugogo_remera',
  message: 'Heavy traffic at Sonatubes — expect 15 min delay',
  severity: 'medium'
});
```

---

## 5. `getUserTrips`

- **Trigger:** HTTPS callable (`onCall`)
- **Auth:** Required — user can only query their own trips
- **Description:** Returns the caller's last 20 trips (boarded bus, route taken, timestamps).

**Parameters:**

| Field   | Type   | Required | Description                              |
|---------|--------|----------|------------------------------------------|
| `limit` | number | no       | Max trips to return (default 20, max 50) |

**Returns:**
```json
{
  "userId": "user_abc",
  "trips": [
    {
      "tripId": "trip_00981",
      "routeId": "route_kicukiro_town",
      "busId": "bus_012",
      "boardedAt":  "2026-04-23T07:12:04Z",
      "alightedAt": "2026-04-23T07:48:17Z",
      "boardedStopId":  "stop_sonatubes",
      "alightedStopId": "stop_town"
    }
  ]
}
```

---

## Error Shape

All functions return errors in the standard Firebase `HttpsError` format:

```json
{
  "error": {
    "code": "permission-denied",
    "message": "Only admins may broadcast alerts"
  }
}
```

Common codes: `unauthenticated`, `permission-denied`, `invalid-argument`, `not-found`, `resource-exhausted`, `internal`.

## Rate Limits

| Function                | Limit                                  |
|-------------------------|----------------------------------------|
| `updateBusLocation`     | 1 req / 5 s per `busId`                |
| `getArrivalEstimate`    | 60 req / min per user                  |
| `getRouteDetails`       | 120 req / min per IP (public)          |
| `sendDelayNotification` | 30 req / min per admin                 |
| `getUserTrips`          | 30 req / min per user                  |

Exceeding a limit returns `resource-exhausted`.
