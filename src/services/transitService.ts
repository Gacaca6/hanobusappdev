import { collection, doc, setDoc, getDocs, deleteDoc, onSnapshot, query, Timestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { handleFirestoreError, OperationType } from '../utils/errorHandler';
import { ALL_ROUTES, SAMPLE_ALERTS } from '../data/hanobus_routes';
import type { Route as DataRoute } from '../data/hanobus_routes';

// Types
export interface Route {
  id: string;
  routeName: string;
  shortName: string;
  startLocation: string;
  endLocation: string;
  distanceKm?: number;
  avgTravelTimeMins?: number;
  avgHeadwayMin?: number;
  avgBusesPerDay?: number;
  avgBusCapacity?: number;
  zone?: number;
  color?: string;
  code?: string;
  operator?: string;
  peakHours?: string[];
  orderedStopIds?: string[];
  stops?: { name: string; lat: number; lng: number; isTerminal?: boolean }[];
}

export interface Bus {
  id: string;
  routeId: string;
  latitude: number;
  longitude: number;
  speedKmH?: number;
  lastUpdated: Timestamp;
  nextStop?: string;
  isDeviating?: boolean;
  eta?: number;
}

export interface Alert {
  id: string;
  message: string;
  routeId?: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: Timestamp;
}

export interface BusStop {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  routeIds?: string[];
}

export interface Favorite {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  type: 'home' | 'work' | 'other';
  createdAt: Timestamp;
}

// Build seed data from hanobus_routes.ts dataset
function buildSeedRoutes(): Route[] {
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
    stops: r.stops,
  }));
}

function buildSeedStops(): BusStop[] {
  const stopMap = new Map<string, BusStop>();
  ALL_ROUTES.forEach(route => {
    route.stops.forEach((stop, i) => {
      const key = `${stop.name}-${stop.lat.toFixed(4)}-${stop.lng.toFixed(4)}`;
      if (stopMap.has(key)) {
        const existing = stopMap.get(key)!;
        if (!existing.routeIds!.includes(`route-${route.id}`)) {
          existing.routeIds!.push(`route-${route.id}`);
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

function buildSeedBuses(): Bus[] {
  // Seed one bus per high-demand route
  const highDemandRoutes = ALL_ROUTES.filter(r => r.avgBusesPerDay >= 14).slice(0, 8);
  return highDemandRoutes.map((r, i) => {
    const midStop = r.stops[Math.floor(r.stops.length / 2)];
    const nextStop = r.stops[Math.min(Math.floor(r.stops.length / 2) + 1, r.stops.length - 1)];
    return {
      id: `bus-${r.id}-${i}`,
      routeId: `route-${r.id}`,
      latitude: midStop.lat + (Math.random() - 0.5) * 0.002,
      longitude: midStop.lng + (Math.random() - 0.5) * 0.002,
      speedKmH: 15 + Math.round(Math.random() * 25),
      lastUpdated: Timestamp.now(),
      nextStop: nextStop.name,
      isDeviating: false,
    };
  });
}

function buildSeedAlerts(): Alert[] {
  return SAMPLE_ALERTS.map(a => ({
    id: a.id,
    message: a.messageEn,
    routeId: `route-${a.routeId}`,
    severity: a.severity,
    timestamp: Timestamp.now(),
  }));
}

const seedRoutes = buildSeedRoutes();
const seedBusStops = buildSeedStops();
const seedBuses = buildSeedBuses();
const seedAlerts = buildSeedAlerts();

export async function seedDatabaseIfEmpty() {
  if (!auth.currentUser) return;

  try {
    const routesSnap = await getDocs(collection(db, 'routes'));
    if (routesSnap.empty) {
      for (const route of seedRoutes) {
        await setDoc(doc(db, 'routes', route.id), route);
      }
    }

    const alertsSnap = await getDocs(collection(db, 'alerts'));
    if (alertsSnap.empty) {
      for (const alert of seedAlerts) {
        await setDoc(doc(db, 'alerts', alert.id), alert);
      }
    }

    const busesSnap = await getDocs(collection(db, 'buses'));
    if (busesSnap.empty) {
      for (const bus of seedBuses) {
        await setDoc(doc(db, 'buses', bus.id), bus);
      }
    }

    const stopsSnap = await getDocs(collection(db, 'busStops'));
    if (stopsSnap.empty) {
      for (const stop of seedBusStops) {
        await setDoc(doc(db, 'busStops', stop.id), stop);
      }
    }
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

// Listeners
export function subscribeToRoutes(callback: (routes: Route[]) => void) {
  const q = query(collection(db, 'routes'));
  return onSnapshot(q, (snapshot) => {
    const routes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Route));
    callback(routes);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'routes');
  });
}

export function subscribeToBuses(callback: (buses: Bus[]) => void) {
  const q = query(collection(db, 'buses'));
  return onSnapshot(q, (snapshot) => {
    const buses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bus));
    callback(buses);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'buses');
  });
}

export function subscribeToAlerts(callback: (alerts: Alert[]) => void) {
  const q = query(collection(db, 'alerts'));
  return onSnapshot(q, (snapshot) => {
    const alerts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Alert));
    alerts.sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());
    callback(alerts);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'alerts');
  });
}

export function subscribeToBusStops(callback: (stops: BusStop[]) => void) {
  const q = query(collection(db, 'busStops'));
  return onSnapshot(q, (snapshot) => {
    const stops = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BusStop));
    callback(stops);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'busStops');
  });
}

// Favorites
export function subscribeToFavorites(userId: string, callback: (favorites: Favorite[]) => void) {
  const q = query(collection(db, 'users', userId, 'favorites'));
  return onSnapshot(q, (snapshot) => {
    const favorites = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Favorite));
    callback(favorites);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, `users/${userId}/favorites`);
  });
}

export async function addFavorite(userId: string, favorite: Omit<Favorite, 'id' | 'createdAt'>) {
  const id = `fav-${Date.now()}`;
  await setDoc(doc(db, 'users', userId, 'favorites', id), {
    ...favorite,
    createdAt: Timestamp.now(),
  });
  return id;
}

export async function removeFavorite(userId: string, favoriteId: string) {
  await deleteDoc(doc(db, 'users', userId, 'favorites', favoriteId));
}

// ETA calculation using distance
export function calculateETA(
  busLat: number,
  busLng: number,
  stopLat: number,
  stopLng: number,
  speedKmH: number
): number {
  const R = 6371;
  const dLat = (stopLat - busLat) * Math.PI / 180;
  const dLng = (stopLng - busLng) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(busLat * Math.PI / 180) * Math.cos(stopLat * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distKm = R * c;
  const effectiveSpeed = Math.max(speedKmH || 20, 5);
  return Math.max(1, Math.round((distKm / effectiveSpeed) * 60));
}
