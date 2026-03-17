/**
 * HanoBus — One-time Firestore Seed Script
 *
 * Writes the full route dataset to Firestore for the live demo.
 * Run with:  npx tsx scripts/seedFirestore.ts
 *
 * IMPORTANT: Before running, temporarily open Firestore rules:
 *   1. Go to Firebase Console → Firestore → Rules
 *   2. Set: allow read, write: if true;
 *   3. Run this script
 *   4. Restore your original rules immediately after
 *
 * Or sign in as admin first by running:
 *   npx tsx scripts/seedFirestore.ts --email gacacagodwin@gmail.com
 *
 * Collections written:
 *   routes    — 27 real RFTC routes with stops, headway, capacity, etc.
 *   busStops  — Deduplicated stops with routeIds arrays
 *   buses     — 3-5 simulated buses per route (112 total)
 *   alerts    — Sample service alerts (bilingual EN/RW)
 *   metadata  — { lastSeeded, routeCount, busCount, alertCount, researchSource }
 *
 * Uses the existing Firebase config from firebase-applet-config.json.
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, collection, getDocs, deleteDoc, Timestamp } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { ALL_ROUTES, SAMPLE_ALERTS } from '../src/data/hanobus_routes';

// ─── Firebase Init (reuse project config) ─────────────────────────
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// ─── Helpers ───────────────────────────────────────────────────────

/** Random integer between min and max (inclusive) */
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Random float between min and max */
function randFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/** Pick a random element from an array */
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Interpolate between two stops based on progress (0-1) */
function interpolatePosition(
  stop1: { lat: number; lng: number },
  stop2: { lat: number; lng: number },
  t: number
): { lat: number; lng: number } {
  return {
    lat: stop1.lat + (stop2.lat - stop1.lat) * t,
    lng: stop1.lng + (stop2.lng - stop1.lng) * t,
  };
}

// ─── Build Routes ──────────────────────────────────────────────────

function buildRoutes() {
  return ALL_ROUTES.map(r => ({
    id: `route-${r.id}`,
    routeName: r.name,
    shortName: r.shortName,
    startLocation: r.stops[0].name,
    endLocation: r.stops[r.stops.length - 1].name,
    distanceKm: r.distanceKm,
    avgTravelTimeMins: Math.round(r.estimatedTravelTimeMin),
    avgHeadwayMin: r.avgHeadwayMin,
    avgBusesPerDay: r.avgBusesPerDay,
    avgBusCapacity: r.avgBusCapacity,
    zone: r.zone,
    color: r.color,
    code: r.code,
    operator: r.operator,
    peakHours: r.peakHours,
    orderedStopIds: r.stops.map((_, i) => `stop-${r.id}-${i}`),
    stops: r.stops.map(s => ({
      name: s.name,
      lat: s.lat,
      lng: s.lng,
      isTerminal: s.isTerminal || false,
    })),
  }));
}

// ─── Build Bus Stops (deduplicated) ────────────────────────────────

function buildBusStops() {
  const stopMap = new Map<string, {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    routeIds: string[];
  }>();

  ALL_ROUTES.forEach(route => {
    route.stops.forEach((stop, i) => {
      const key = `${stop.name}-${stop.lat.toFixed(4)}-${stop.lng.toFixed(4)}`;
      if (stopMap.has(key)) {
        const existing = stopMap.get(key)!;
        const routeId = `route-${route.id}`;
        if (!existing.routeIds.includes(routeId)) {
          existing.routeIds.push(routeId);
        }
      } else {
        stopMap.set(key, {
          id: `stop-${route.id}-${i}`,
          name: stop.name,
          latitude: stop.lat,
          longitude: stop.lng,
          routeIds: [`route-${route.id}`],
        });
      }
    });
  });

  return Array.from(stopMap.values());
}

// ─── Build Buses (3-5 per route) ──────────────────────────────────

function buildBuses() {
  const buses: Array<{
    id: string;
    routeId: string;
    latitude: number;
    longitude: number;
    speedKmH: number;
    lastUpdated: Timestamp;
    nextStop: string;
    isDeviating: boolean;
    capacity: number;
  }> = [];

  ALL_ROUTES.forEach(route => {
    // Place avgBusesPerDay / 3 buses (round, min 3, max 5)
    const count = Math.max(3, Math.min(5, Math.round(route.avgBusesPerDay / 3)));

    for (let i = 0; i < count; i++) {
      // Random progress along the route (0..1)
      const progress = Math.random();
      const totalSegments = route.stops.length - 1;
      const segmentFloat = progress * totalSegments;
      const segmentIndex = Math.min(Math.floor(segmentFloat), totalSegments - 1);
      const segmentProgress = segmentFloat - segmentIndex;

      const stop1 = route.stops[segmentIndex];
      const stop2 = route.stops[Math.min(segmentIndex + 1, route.stops.length - 1)];
      const pos = interpolatePosition(stop1, stop2, segmentProgress);

      // Next stop is the one ahead
      const nextStopIndex = Math.min(segmentIndex + 1, route.stops.length - 1);
      const nextStop = route.stops[nextStopIndex];

      // Derive speed from route distance / travel time (with some variance)
      const baseSpeedKmH = (route.distanceKm / route.estimatedTravelTimeMin) * 60;
      const speedKmH = Math.round(baseSpeedKmH * randFloat(0.7, 1.3));

      // Capacity: randomly pick 29-seat coaster or 70-seat bus
      const capacity = pick([29, 29, 29, 70]); // 75% coasters like in the study

      buses.push({
        id: `bus-${route.id}-${i}`,
        routeId: `route-${route.id}`,
        latitude: pos.lat,
        longitude: pos.lng,
        speedKmH: Math.max(5, Math.min(45, speedKmH)),
        lastUpdated: Timestamp.now(),
        nextStop: nextStop.name,
        isDeviating: Math.random() < 0.1, // 10% chance of deviation
        capacity,
      });
    }
  });

  return buses;
}

// ─── Build Alerts ──────────────────────────────────────────────────

function buildAlerts() {
  return SAMPLE_ALERTS.map(a => ({
    id: a.id,
    message: a.messageEn,
    messageEn: a.messageEn,
    messageRw: a.messageRw,
    titleEn: a.titleEn,
    titleRw: a.titleRw,
    routeId: `route-${a.routeId}`,
    severity: a.severity,
    timestamp: Timestamp.now(),
  }));
}

// ─── Clear a collection ────────────────────────────────────────────

async function clearCollection(collectionName: string) {
  const snap = await getDocs(collection(db, collectionName));
  const deletes = snap.docs.map(d => deleteDoc(d.ref));
  await Promise.all(deletes);
  return snap.size;
}

// ─── Optional Auth ─────────────────────────────────────────────────

async function tryAuth() {
  const emailArg = process.argv.find(a => a.startsWith('--email='));
  const passArg = process.argv.find(a => a.startsWith('--password='));

  if (emailArg) {
    const email = emailArg.split('=')[1];
    const password = passArg ? passArg.split('=')[1] : '';

    if (!password) {
      console.log(`⚠️  No --password provided. Attempting without password auth.`);
      console.log(`   If you get permission errors, either:`);
      console.log(`   1. Temporarily open Firestore rules (allow read, write: if true)`);
      console.log(`   2. Use: npx tsx scripts/seedFirestore.ts --email=you@email.com --password=yourpass`);
      return;
    }

    try {
      const auth = getAuth(app);
      const cred = await signInWithEmailAndPassword(auth, email, password);
      console.log(`🔐 Signed in as: ${cred.user.email}`);
    } catch (err: any) {
      console.log(`⚠️  Auth failed: ${err.message}`);
      console.log(`   Continuing without auth — make sure Firestore rules allow writes.`);
    }
  }
}

// ─── Main Seed Function ────────────────────────────────────────────

async function seed() {
  console.log('🚌 HanoBus Firestore Seeder');
  console.log('═══════════════════════════════════════════');
  console.log(`   Firebase project: ${firebaseConfig.projectId}`);
  console.log(`   Database: ${firebaseConfig.firestoreDatabaseId}`);
  console.log('');

  // Try to authenticate if credentials provided
  await tryAuth();
  console.log('');

  // Build all data
  const routes = buildRoutes();
  const busStops = buildBusStops();
  const buses = buildBuses();
  const alerts = buildAlerts();

  console.log(`📊 Data prepared:`);
  console.log(`   Routes:    ${routes.length}`);
  console.log(`   Bus Stops: ${busStops.length}`);
  console.log(`   Buses:     ${buses.length}`);
  console.log(`   Alerts:    ${alerts.length}`);
  console.log('');

  // Clear existing data
  console.log('🧹 Clearing existing collections...');
  const cleared = {
    routes: await clearCollection('routes'),
    busStops: await clearCollection('busStops'),
    buses: await clearCollection('buses'),
    alerts: await clearCollection('alerts'),
  };
  console.log(`   Cleared: ${cleared.routes} routes, ${cleared.busStops} stops, ${cleared.buses} buses, ${cleared.alerts} alerts`);
  console.log('');

  // Write routes
  console.log('📝 Writing routes...');
  for (const route of routes) {
    await setDoc(doc(db, 'routes', route.id), route);
  }
  console.log(`   ✅ ${routes.length} routes written`);

  // Write bus stops
  console.log('📝 Writing bus stops...');
  for (const stop of busStops) {
    await setDoc(doc(db, 'busStops', stop.id), stop);
  }
  console.log(`   ✅ ${busStops.length} bus stops written`);

  // Write buses
  console.log('📝 Writing buses...');
  for (const bus of buses) {
    await setDoc(doc(db, 'buses', bus.id), bus);
  }
  console.log(`   ✅ ${buses.length} buses written`);

  // Write alerts
  console.log('📝 Writing alerts...');
  for (const alert of alerts) {
    await setDoc(doc(db, 'alerts', alert.id), alert);
  }
  console.log(`   ✅ ${alerts.length} alerts written`);

  // Write metadata
  console.log('📝 Writing metadata...');
  await setDoc(doc(db, 'metadata', 'seedInfo'), {
    lastSeeded: Timestamp.now(),
    lastSeededISO: new Date().toISOString(),
    routeCount: routes.length,
    busStopCount: busStops.length,
    busCount: buses.length,
    alertCount: alerts.length,
    researchSource: 'Mutambuka (2022), University of Rwanda',
    researchTitle: 'Queue and Waiting Time in Public Transport Management in Kigali',
    datasetVersion: '1.0',
    seededBy: 'scripts/seedFirestore.ts',
  });
  console.log('   ✅ Metadata document written');

  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log('🎉 Seed complete! Your Firestore is populated.');
  console.log('');
  console.log('You can verify in the Firebase Console:');
  console.log(`   https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore`);
}

// ─── Run ───────────────────────────────────────────────────────────

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  });
