import { create } from 'zustand';
import { User } from 'firebase/auth';
import { Route, Bus, Alert, BusStop, Favorite } from '../services/transitService';
import { Language } from '../i18n/translations';

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
  favorites: Favorite[];
  setFavorites: (favorites: Favorite[]) => void;
  selectedBus: Bus | null;
  setSelectedBus: (bus: Bus | null) => void;
  recentSearches: Location[];
  addRecentSearch: (loc: Location) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  isOnline: boolean;
  setIsOnline: (online: boolean) => void;
}

export const useStore = create<AppState>((set, get) => ({
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
  favorites: [],
  setFavorites: (favorites) => set({ favorites }),
  selectedBus: null,
  setSelectedBus: (bus) => set({ selectedBus: bus }),
  recentSearches: JSON.parse(localStorage.getItem('hanobus_recent_searches') || '[]'),
  addRecentSearch: (loc) => {
    const current = get().recentSearches;
    const filtered = current.filter(s => s.name !== loc.name);
    const updated = [loc, ...filtered].slice(0, 5);
    localStorage.setItem('hanobus_recent_searches', JSON.stringify(updated));
    set({ recentSearches: updated });
  },
  language: (localStorage.getItem('hanobus_language') as Language) || 'en',
  setLanguage: (lang) => {
    localStorage.setItem('hanobus_language', lang);
    set({ language: lang });
  },
  isOnline: navigator.onLine,
  setIsOnline: (online) => set({ isOnline: online }),
}));
