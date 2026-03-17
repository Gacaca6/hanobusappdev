import { create } from 'zustand';
import { User } from 'firebase/auth';
import { Route, Bus, Alert, BusStop } from '../services/transitService';

interface Location {
  lat: number;
  lng: number;
  name: string;
  description?: string;
}

interface AppState {
  user: User | null;
  setUser: (user: User | null) => void;
  isAuthReady: boolean;
  setAuthReady: (ready: boolean) => void;
  selectedDestination: any | null;
  setSelectedDestination: (dest: any | null) => void;
  searchedLocation: Location | null;
  setSearchedLocation: (loc: Location | null) => void;
  currentRoute: any | null;
  setCurrentRoute: (route: any | null) => void;
  buses: Bus[];
  setBuses: (buses: Bus[]) => void;
  alerts: Alert[];
  setAlerts: (alerts: Alert[]) => void;
  routes: Route[];
  setRoutes: (routes: Route[]) => void;
  busStops: BusStop[];
  setBusStops: (stops: BusStop[]) => void;
  routePolyline: [number, number][] | null;
  setRoutePolyline: (polyline: [number, number][] | null) => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  isAuthReady: false,
  setAuthReady: (ready) => set({ isAuthReady: ready }),
  selectedDestination: null,
  setSelectedDestination: (dest) => set({ selectedDestination: dest }),
  searchedLocation: null,
  setSearchedLocation: (loc) => set({ searchedLocation: loc }),
  currentRoute: null,
  setCurrentRoute: (route) => set({ currentRoute: route }),
  buses: [],
  setBuses: (buses) => set({ buses }),
  alerts: [],
  setAlerts: (alerts) => set({ alerts }),
  routes: [],
  setRoutes: (routes) => set({ routes }),
  busStops: [],
  setBusStops: (stops) => set({ busStops: stops }),
  routePolyline: null,
  setRoutePolyline: (polyline) => set({ routePolyline: polyline }),
}));
