import { collection, doc, setDoc, getDocs, deleteDoc, onSnapshot, query, Timestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { handleFirestoreError, OperationType } from '../utils/errorHandler';

// Types
export interface Route {
  id: string;
  routeName: string;
  startLocation: string;
  endLocation: string;
  distanceKm?: number;
  avgTravelTimeMins?: number;
  orderedStopIds?: string[];
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

// Seed Data
const seedRoutes: Route[] = [
  { id: 'route-1', routeName: 'Nyabugogo - Remera', startLocation: 'Nyabugogo', endLocation: 'Remera', distanceKm: 12, avgTravelTimeMins: 45, orderedStopIds: ['stop-1', 'stop-7', 'stop-4'] },
  { id: 'route-2', routeName: 'Kimironko - CBD', startLocation: 'Kimironko', endLocation: 'CBD', distanceKm: 8, avgTravelTimeMins: 30, orderedStopIds: ['stop-3', 'stop-7', 'stop-2'] },
  { id: 'route-3', routeName: 'Kicukiro - CBD', startLocation: 'Kicukiro', endLocation: 'CBD', distanceKm: 10, avgTravelTimeMins: 40, orderedStopIds: ['stop-5', 'stop-6', 'stop-2'] },
  { id: 'route-4', routeName: 'Nyamirambo - CBD', startLocation: 'Nyamirambo', endLocation: 'CBD', distanceKm: 5, avgTravelTimeMins: 20, orderedStopIds: ['stop-8', 'stop-2'] },
  { id: 'route-5', routeName: 'Gisozi - Nyabugogo', startLocation: 'Gisozi', endLocation: 'Nyabugogo', distanceKm: 7, avgTravelTimeMins: 25, orderedStopIds: ['stop-9', 'stop-1'] },
];

const seedAlerts: Alert[] = [
  { id: 'alert-1', message: 'Heavy Traffic on KN 5 Rd. Expect delays of up to 20 minutes due to road construction near Sonatubes.', severity: 'medium', timestamp: Timestamp.now() },
  { id: 'alert-2', message: 'Buses to Kimironko are being diverted through Kisementi due to an accident.', routeId: 'route-2', severity: 'high', timestamp: Timestamp.now() },
  { id: 'alert-3', message: 'Starting tomorrow, a new express service will run from Nyabugogo to CBD.', severity: 'low', timestamp: Timestamp.now() },
];

const seedBuses: Bus[] = [
  { id: 'bus-1', routeId: 'route-1', latitude: -1.9441, longitude: 30.0619, speedKmH: 40, lastUpdated: Timestamp.now(), nextStop: 'Gishushu', isDeviating: false },
  { id: 'bus-2', routeId: 'route-2', latitude: -1.9536, longitude: 30.1127, speedKmH: 35, lastUpdated: Timestamp.now(), nextStop: 'Gishushu', isDeviating: false },
  { id: 'bus-3', routeId: 'route-3', latitude: -1.9700, longitude: 30.0900, speedKmH: 45, lastUpdated: Timestamp.now(), nextStop: 'Sonatubes', isDeviating: false },
];

const seedBusStops: BusStop[] = [
  { id: 'stop-1', name: 'Nyabugogo Bus Park', latitude: -1.9395, longitude: 30.0550, routeIds: ['route-1', 'route-5'] },
  { id: 'stop-2', name: 'CBD (City Center)', latitude: -1.9441, longitude: 30.0619, routeIds: ['route-2', 'route-3', 'route-4'] },
  { id: 'stop-3', name: 'Kimironko Bus Park', latitude: -1.9536, longitude: 30.0936, routeIds: ['route-2'] },
  { id: 'stop-4', name: 'Remera Park', latitude: -1.9585, longitude: 30.1044, routeIds: ['route-1'] },
  { id: 'stop-5', name: 'Kicukiro Centre', latitude: -1.9750, longitude: 30.0900, routeIds: ['route-3'] },
  { id: 'stop-6', name: 'Sonatubes', latitude: -1.9650, longitude: 30.1000, routeIds: ['route-3'] },
  { id: 'stop-7', name: 'Gishushu', latitude: -1.9530, longitude: 30.0980, routeIds: ['route-1', 'route-2'] },
  { id: 'stop-8', name: 'Nyamirambo', latitude: -1.9800, longitude: 30.0450, routeIds: ['route-4'] },
  { id: 'stop-9', name: 'Gisozi', latitude: -1.9200, longitude: 30.0600, routeIds: ['route-5'] },
];

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
