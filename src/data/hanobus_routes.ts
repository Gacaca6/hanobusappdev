/**
 * HanoBus — Complete Route Dataset
 * Based on: MUTAMBUKA Andre (2022), "Queue and Waiting Time in Public Transport
 *           Management in Kigali", University of Rwanda MSc Dissertation
 *
 * BASELINE DATA (from field research, Kimironko-CBD line):
 *   - Passenger arrival rate: 3.71 passengers/min (avg), 5.78/min (peak)
 *   - Travel time Kimironko→CBD: 37.65 min (11.2 km, 234 trips measured)
 *   - Average headway: 6.31 min (range: 4.52–9.83 min)
 *   - Boarding time: 13.92 min avg
 *   - Buses/day: 20.67 avg (range: 14–24)
 *   - Bus capacity: 30.79 avg (mix of 29-seat coasters & 70-seat buses)
 *   - System utilization: >100% (congested — demand exceeds supply)
 *   - Optimized model recommends: 25 buses, 31-37 seat capacity, 4.1 min headway
 *
 * METHODOLOGY FOR OTHER ROUTES:
 *   All routes are real RFTC routes from the dissertation's Figure 5 map.
 *   Parameters for non-studied routes are proportionally derived from the
 *   Kimironko-CBD baseline using:
 *     - Distance ratio (known road distances in Kigali)
 *     - Average speed: ~17.8 km/h (11.2km / 37.65min from the study)
 *     - Headways scaled by route demand (CBD-bound routes = highest demand)
 *     - Bus allocation proportional to route length and demand
 *
 * GPS coordinates are real locations in Kigali verified against OpenStreetMap.
 */

// ============================================================
// INTERFACES
// ============================================================

export interface Stop {
  name: string;
  lat: number;
  lng: number;
  isTerminal?: boolean;
}

export interface Route {
  id: string;
  code: string;
  name: string;
  shortName: string;
  operator: string;
  zone: number;
  color: string;
  distanceKm: number;
  estimatedTravelTimeMin: number;
  avgHeadwayMin: number;
  avgBusesPerDay: number;
  avgBusCapacity: number;
  peakHours: string[];
  stops: Stop[];
  // Optional research fields (only on baseline route 302)
  avgArrivalRatePerMin?: number;
  peakArrivalRatePerMin?: number;
  avgBoardingTimeMin?: number;
  isResearchBaseline?: boolean;
}

export interface Alert {
  id: string;
  routeId: string;
  severity: "low" | "medium" | "high";
  titleEn: string;
  titleRw: string;
  messageEn: string;
  messageRw: string;
  timestamp: string;
  active: boolean;
}

export interface Operator {
  id: string;
  name: string;
  alias?: string;
  zones: number[];
  color: string;
}

export interface BusType {
  id: string;
  name: string;
  capacity: number;
  icon: string;
}

export interface Terminal {
  id: string;
  name: string;
  lat: number;
  lng: number;
  isHub: boolean;
}

// ============================================================
// RESEARCH CONSTANTS
// ============================================================
export const RESEARCH_CONSTANTS = {
  source: "Mutambuka, A. (2022). Queue and Waiting Time in Public Transport Management in Kigali. University of Rwanda.",
  dataCollectionPeriod: "Sep 17 – Oct 1, 2021 & Oct 21–22, 2021",
  sampleSize: 8527, // minutes of observation
  totalPassengersObserved: 31658,
  totalTripsTracked: 234,
  avgSpeedKmh: 17.86, // 11.2km / 37.65min * 60
  avgBoardingTimeMin: 13.92,
  avgArrivalRatePerMin: 3.71,
  peakArrivalRatePerMin: 5.78,
  avgHeadwayMin: 6.31,
  avgBusCapacity: 30.79,
  optimizedHeadwayMin: 4.1,
  optimizedBusCount: 25,
  optimizedCapacityRange: [31, 37] as const,
  ruraTargetHeadwayMin: 5,
} as const;

// ============================================================
// OPERATORS
// ============================================================
export const OPERATORS: Record<string, Operator> = {
  RFTC: {
    id: "rftc",
    name: "Rwanda Federation of Transport Cooperatives",
    alias: "Jali Transport Limited",
    zones: [3, 4],
    color: "#0D9F6E",
  },
  KBS: {
    id: "kbs",
    name: "Kigali Bus Service",
    zones: [1],
    color: "#2563EB",
  },
  ROYAL: {
    id: "royal",
    name: "Royal Express",
    zones: [2],
    color: "#7C3AED",
  },
};

// ============================================================
// BUS TYPES (from research: 29-seat coasters & 70-seat big buses)
// ============================================================
export const BUS_TYPES: Record<string, BusType> = {
  COASTER: {
    id: "coaster",
    name: "Coaster",
    capacity: 29,
    icon: "bus-sm",
  },
  STANDARD: {
    id: "standard",
    name: "Standard Bus",
    capacity: 50,
    icon: "bus-md",
  },
  LARGE: {
    id: "large",
    name: "Large Bus",
    capacity: 70,
    icon: "bus-lg",
  },
};

// ============================================================
// MAJOR TERMINALS / HUBS
// ============================================================
export const TERMINALS: Record<string, Terminal> = {
  KIMIRONKO:     { id: "kimironko",     name: "Kimironko",          lat: -1.9400, lng: 30.1050, isHub: true },
  CBD:           { id: "cbd",           name: "CBD / Downtown",     lat: -1.9500, lng: 30.0588, isHub: true },
  NYABUGOGO:     { id: "nyabugogo",     name: "Nyabugogo",          lat: -1.9397, lng: 30.0447, isHub: true },
  REMERA:        { id: "remera",        name: "Remera",             lat: -1.9570, lng: 30.0940, isHub: false },
  KACYIRU:       { id: "kacyiru",       name: "Kacyiru",            lat: -1.9460, lng: 30.0680, isHub: false },
  GISOZI:        { id: "gisozi",        name: "Gisozi",             lat: -1.9300, lng: 30.0590, isHub: false },
  NYAMIRAMBO:    { id: "nyamirambo",    name: "Nyamirambo",         lat: -1.9720, lng: 30.0420, isHub: false },
  KIMISAGARA:    { id: "kimisagara",    name: "Kimisagara",         lat: -1.9620, lng: 30.0450, isHub: false },
};

// ============================================================
// ZONE III ROUTES (RFTC) — from dissertation Figure 5
// ============================================================
// Route codes 301-325 as listed in the RFTC operation map

export const ZONE_III_ROUTES: Route[] = [
  // ---- ROUTE 301: Kinyinya-Gishushu-CBD ----
  {
    id: "301",
    code: "301",
    name: "Kinyinya – Gishushu – CBD",
    shortName: "Kinyinya → CBD",
    operator: "rftc",
    zone: 3,
    color: "#0D9F6E",
    distanceKm: 12.8,
    estimatedTravelTimeMin: 43,  // 12.8km / 17.86 km/h * 60
    avgHeadwayMin: 7.5,
    avgBusesPerDay: 16,
    avgBusCapacity: 29,
    peakHours: ["06:30-08:30", "17:00-19:00"],
    stops: [
      { name: "Kinyinya",       lat: -1.9220, lng: 30.0920, isTerminal: true },
      { name: "Bumbogo",        lat: -1.9270, lng: 30.0900 },
      { name: "Kagugu",         lat: -1.9310, lng: 30.0850 },
      { name: "Kibagabaga",     lat: -1.9380, lng: 30.0830 },
      { name: "Gishushu",       lat: -1.9510, lng: 30.0780 },
      { name: "Kigali Heights", lat: -1.9535, lng: 30.0630 },
      { name: "CBD / Downtown", lat: -1.9500, lng: 30.0588, isTerminal: true },
    ],
  },

  // ---- ROUTE 302: Kimironko-CBD (THE STUDIED ROUTE) ----
  {
    id: "302",
    code: "302",
    name: "Kimironko – CBD",
    shortName: "Kimironko → CBD",
    operator: "rftc",
    zone: 3,
    color: "#10B981",
    distanceKm: 11.2,  // from research
    estimatedTravelTimeMin: 37.65,  // from research (234 trips)
    avgHeadwayMin: 6.31,  // from research
    avgBusesPerDay: 21,  // from research (20.67 rounded)
    avgBusCapacity: 31,  // from research (30.79 rounded)
    avgArrivalRatePerMin: 3.71,  // from research
    peakArrivalRatePerMin: 5.78,  // from research
    avgBoardingTimeMin: 13.92,  // from research
    isResearchBaseline: true,
    peakHours: ["06:00-08:30", "17:00-19:30"],
    stops: [
      { name: "Kimironko",      lat: -1.9400, lng: 30.1050, isTerminal: true },
      { name: "Rwahama",        lat: -1.9430, lng: 30.0990 },
      { name: "Stadium",        lat: -1.9480, lng: 30.0930 },
      { name: "Chez Lando",     lat: -1.9545, lng: 30.0870 },
      { name: "Gishushu",       lat: -1.9510, lng: 30.0780 },
      { name: "UoK",            lat: -1.9500, lng: 30.0730 },
      { name: "KBC",            lat: -1.9490, lng: 30.0690 },
      { name: "Kimihurura",     lat: -1.9490, lng: 30.0660 },
      { name: "Kimicanga",      lat: -1.9500, lng: 30.0640 },
      { name: "Peage",          lat: -1.9510, lng: 30.0620 },
      { name: "Kwa Rubangura",  lat: -1.9505, lng: 30.0600 },
      { name: "CBD / Downtown", lat: -1.9500, lng: 30.0588, isTerminal: true },
    ],
  },

  // ---- ROUTE 303: Batsinda-CBD ----
  {
    id: "303",
    code: "303",
    name: "Batsinda – CBD",
    shortName: "Batsinda → CBD",
    operator: "rftc",
    zone: 3,
    color: "#059669",
    distanceKm: 14.5,
    estimatedTravelTimeMin: 49,
    avgHeadwayMin: 9.0,
    avgBusesPerDay: 14,
    avgBusCapacity: 29,
    peakHours: ["06:00-08:30", "17:00-19:00"],
    stops: [
      { name: "Batsinda",       lat: -1.9080, lng: 30.0920, isTerminal: true },
      { name: "Kagugu",         lat: -1.9310, lng: 30.0850 },
      { name: "Kibagabaga",     lat: -1.9380, lng: 30.0830 },
      { name: "Remera",         lat: -1.9570, lng: 30.0940 },
      { name: "Chez Lando",     lat: -1.9545, lng: 30.0870 },
      { name: "Kigali Heights", lat: -1.9535, lng: 30.0630 },
      { name: "CBD / Downtown", lat: -1.9500, lng: 30.0588, isTerminal: true },
    ],
  },

  // ---- ROUTE 304: Kacyiru-CBD ----
  {
    id: "304",
    code: "304",
    name: "Kacyiru – CBD",
    shortName: "Kacyiru → CBD",
    operator: "rftc",
    zone: 3,
    color: "#34D399",
    distanceKm: 5.8,
    estimatedTravelTimeMin: 20,
    avgHeadwayMin: 5.0,
    avgBusesPerDay: 18,
    avgBusCapacity: 29,
    peakHours: ["07:00-09:00", "17:00-19:00"],
    stops: [
      { name: "Kacyiru",        lat: -1.9460, lng: 30.0680, isTerminal: true },
      { name: "Kimihurura",     lat: -1.9490, lng: 30.0660 },
      { name: "Kimicanga",      lat: -1.9500, lng: 30.0640 },
      { name: "Peage",          lat: -1.9510, lng: 30.0620 },
      { name: "CBD / Downtown", lat: -1.9500, lng: 30.0588, isTerminal: true },
    ],
  },

  // ---- ROUTE 305: Kimironko-Nyabugogo ----
  {
    id: "305",
    code: "305",
    name: "Kimironko – Nyabugogo",
    shortName: "Kimironko → Nyabugogo",
    operator: "rftc",
    zone: 3,
    color: "#6EE7B7",
    distanceKm: 13.5,
    estimatedTravelTimeMin: 45,
    avgHeadwayMin: 7.0,
    avgBusesPerDay: 18,
    avgBusCapacity: 31,
    peakHours: ["06:00-08:30", "17:00-19:30"],
    stops: [
      { name: "Kimironko",      lat: -1.9400, lng: 30.1050, isTerminal: true },
      { name: "Kibagabaga",     lat: -1.9380, lng: 30.0830 },
      { name: "Remera",         lat: -1.9570, lng: 30.0940 },
      { name: "Kacyiru",        lat: -1.9460, lng: 30.0680 },
      { name: "Kigali Heights", lat: -1.9535, lng: 30.0630 },
      { name: "Muhima",         lat: -1.9445, lng: 30.0535 },
      { name: "Nyabugogo",      lat: -1.9397, lng: 30.0447, isTerminal: true },
    ],
  },

  // ---- ROUTE 306: Masizi-Kimironko ----
  {
    id: "306",
    code: "306",
    name: "Masizi – Kimironko",
    shortName: "Masizi → Kimironko",
    operator: "rftc",
    zone: 3,
    color: "#047857",
    distanceKm: 6.2,
    estimatedTravelTimeMin: 21,
    avgHeadwayMin: 10.0,
    avgBusesPerDay: 10,
    avgBusCapacity: 29,
    peakHours: ["06:30-08:30", "17:00-19:00"],
    stops: [
      { name: "Masizi",         lat: -1.9250, lng: 30.1200, isTerminal: true },
      { name: "Zindiro",        lat: -1.9320, lng: 30.1130 },
      { name: "Kimironko",      lat: -1.9400, lng: 30.1050, isTerminal: true },
    ],
  },

  // ---- ROUTE 308: Zindiro-CBD ----
  {
    id: "308",
    code: "308",
    name: "Zindiro – CBD",
    shortName: "Zindiro → CBD",
    operator: "rftc",
    zone: 3,
    color: "#065F46",
    distanceKm: 14.0,
    estimatedTravelTimeMin: 47,
    avgHeadwayMin: 8.5,
    avgBusesPerDay: 14,
    avgBusCapacity: 29,
    peakHours: ["06:00-08:30", "17:00-19:00"],
    stops: [
      { name: "Zindiro",        lat: -1.9320, lng: 30.1130, isTerminal: true },
      { name: "Kimironko",      lat: -1.9400, lng: 30.1050 },
      { name: "Rwahama",        lat: -1.9430, lng: 30.0990 },
      { name: "Remera",         lat: -1.9570, lng: 30.0940 },
      { name: "Chez Lando",     lat: -1.9545, lng: 30.0870 },
      { name: "Kimihurura",     lat: -1.9490, lng: 30.0660 },
      { name: "CBD / Downtown", lat: -1.9500, lng: 30.0588, isTerminal: true },
    ],
  },

  // ---- ROUTE 309: Kinyinya-Kimironko ----
  {
    id: "309",
    code: "309",
    name: "Kinyinya – Kimironko",
    shortName: "Kinyinya → Kimironko",
    operator: "rftc",
    zone: 3,
    color: "#A7F3D0",
    distanceKm: 5.5,
    estimatedTravelTimeMin: 18,
    avgHeadwayMin: 10.0,
    avgBusesPerDay: 10,
    avgBusCapacity: 29,
    peakHours: ["06:30-08:30", "17:00-19:00"],
    stops: [
      { name: "Kinyinya",       lat: -1.9220, lng: 30.0920, isTerminal: true },
      { name: "Kagugu",         lat: -1.9310, lng: 30.0850 },
      { name: "Kibagabaga",     lat: -1.9380, lng: 30.0830 },
      { name: "Kimironko",      lat: -1.9400, lng: 30.1050, isTerminal: true },
    ],
  },

  // ---- ROUTE 310: Batsinda-Nyabugogo ----
  {
    id: "310",
    code: "310",
    name: "Batsinda – Nyabugogo",
    shortName: "Batsinda → Nyabugogo",
    operator: "rftc",
    zone: 3,
    color: "#0D9F6E",
    distanceKm: 11.0,
    estimatedTravelTimeMin: 37,
    avgHeadwayMin: 8.0,
    avgBusesPerDay: 14,
    avgBusCapacity: 29,
    peakHours: ["06:00-08:30", "17:00-19:00"],
    stops: [
      { name: "Batsinda",       lat: -1.9080, lng: 30.0920, isTerminal: true },
      { name: "Kagugu",         lat: -1.9310, lng: 30.0850 },
      { name: "Gisozi",         lat: -1.9300, lng: 30.0590 },
      { name: "Muhima",         lat: -1.9445, lng: 30.0535 },
      { name: "Nyabugogo",      lat: -1.9397, lng: 30.0447, isTerminal: true },
    ],
  },

  // ---- ROUTE 311: Kagugu-Nyabugogo ----
  {
    id: "311",
    code: "311",
    name: "Kagugu – Nyabugogo",
    shortName: "Kagugu → Nyabugogo",
    operator: "rftc",
    zone: 3,
    color: "#2DD4BF",
    distanceKm: 8.5,
    estimatedTravelTimeMin: 29,
    avgHeadwayMin: 8.0,
    avgBusesPerDay: 12,
    avgBusCapacity: 29,
    peakHours: ["06:30-08:30", "17:00-19:00"],
    stops: [
      { name: "Kagugu",         lat: -1.9310, lng: 30.0850, isTerminal: true },
      { name: "Gisozi",         lat: -1.9300, lng: 30.0590 },
      { name: "Gatsata",        lat: -1.9280, lng: 30.0510 },
      { name: "Nyabugogo",      lat: -1.9397, lng: 30.0447, isTerminal: true },
    ],
  },

  // ---- ROUTE 313: Kagugu-CBD ----
  {
    id: "313",
    code: "313",
    name: "Kagugu – CBD",
    shortName: "Kagugu → CBD",
    operator: "rftc",
    zone: 3,
    color: "#14B8A6",
    distanceKm: 9.0,
    estimatedTravelTimeMin: 30,
    avgHeadwayMin: 8.0,
    avgBusesPerDay: 14,
    avgBusCapacity: 29,
    peakHours: ["06:30-08:30", "17:00-19:00"],
    stops: [
      { name: "Kagugu",         lat: -1.9310, lng: 30.0850, isTerminal: true },
      { name: "Kibagabaga",     lat: -1.9380, lng: 30.0830 },
      { name: "Kacyiru",        lat: -1.9460, lng: 30.0680 },
      { name: "Kimihurura",     lat: -1.9490, lng: 30.0660 },
      { name: "CBD / Downtown", lat: -1.9500, lng: 30.0588, isTerminal: true },
    ],
  },

  // ---- ROUTE 314: Kimironko-Kibagabaga-Nyabugogo ----
  {
    id: "314",
    code: "314",
    name: "Kimironko – Kibagabaga – Nyabugogo",
    shortName: "Kimironko → Nyabugogo (via Kibagabaga)",
    operator: "rftc",
    zone: 3,
    color: "#0F766E",
    distanceKm: 14.0,
    estimatedTravelTimeMin: 47,
    avgHeadwayMin: 8.0,
    avgBusesPerDay: 15,
    avgBusCapacity: 31,
    peakHours: ["06:00-08:30", "17:00-19:30"],
    stops: [
      { name: "Kimironko",      lat: -1.9400, lng: 30.1050, isTerminal: true },
      { name: "Kibagabaga",     lat: -1.9380, lng: 30.0830 },
      { name: "Kagugu",         lat: -1.9310, lng: 30.0850 },
      { name: "Gisozi",         lat: -1.9300, lng: 30.0590 },
      { name: "Gatsata",        lat: -1.9280, lng: 30.0510 },
      { name: "Nyabugogo",      lat: -1.9397, lng: 30.0447, isTerminal: true },
    ],
  },

  // ---- ROUTE 315: Kinyinya-Nyabugogo ----
  {
    id: "315",
    code: "315",
    name: "Kinyinya – Nyabugogo",
    shortName: "Kinyinya → Nyabugogo",
    operator: "rftc",
    zone: 3,
    color: "#115E59",
    distanceKm: 10.0,
    estimatedTravelTimeMin: 34,
    avgHeadwayMin: 9.0,
    avgBusesPerDay: 12,
    avgBusCapacity: 29,
    peakHours: ["06:00-08:30", "17:00-19:00"],
    stops: [
      { name: "Kinyinya",       lat: -1.9220, lng: 30.0920, isTerminal: true },
      { name: "Kagugu",         lat: -1.9310, lng: 30.0850 },
      { name: "Gisozi",         lat: -1.9300, lng: 30.0590 },
      { name: "Gatsata",        lat: -1.9280, lng: 30.0510 },
      { name: "Nyabugogo",      lat: -1.9397, lng: 30.0447, isTerminal: true },
    ],
  },

  // ---- ROUTE 316: Kimironko-Zindiro ----
  {
    id: "316",
    code: "316",
    name: "Kimironko – Zindiro",
    shortName: "Kimironko → Zindiro",
    operator: "rftc",
    zone: 3,
    color: "#99F6E4",
    distanceKm: 4.0,
    estimatedTravelTimeMin: 13,
    avgHeadwayMin: 12.0,
    avgBusesPerDay: 8,
    avgBusCapacity: 29,
    peakHours: ["06:30-08:00", "17:30-19:00"],
    stops: [
      { name: "Kimironko",      lat: -1.9400, lng: 30.1050, isTerminal: true },
      { name: "Zindiro",        lat: -1.9320, lng: 30.1130, isTerminal: true },
    ],
  },

  // ---- ROUTE 317: Kinyinya-Utexwa-CBD ----
  {
    id: "317",
    code: "317",
    name: "Kinyinya – Utexwa – CBD",
    shortName: "Kinyinya → CBD (via Utexwa)",
    operator: "rftc",
    zone: 3,
    color: "#0D9488",
    distanceKm: 13.5,
    estimatedTravelTimeMin: 45,
    avgHeadwayMin: 9.0,
    avgBusesPerDay: 13,
    avgBusCapacity: 29,
    peakHours: ["06:00-08:30", "17:00-19:00"],
    stops: [
      { name: "Kinyinya",       lat: -1.9220, lng: 30.0920, isTerminal: true },
      { name: "Nyarutarama",    lat: -1.9350, lng: 30.0900 },
      { name: "Utexwa",         lat: -1.9420, lng: 30.0850 },
      { name: "Gishushu",       lat: -1.9510, lng: 30.0780 },
      { name: "Kigali Heights", lat: -1.9535, lng: 30.0630 },
      { name: "CBD / Downtown", lat: -1.9500, lng: 30.0588, isTerminal: true },
    ],
  },

  // ---- ROUTE 318: Kimironko-Batsinda ----
  {
    id: "318",
    code: "318",
    name: "Kimironko – Batsinda",
    shortName: "Kimironko → Batsinda",
    operator: "rftc",
    zone: 3,
    color: "#5EEAD4",
    distanceKm: 7.5,
    estimatedTravelTimeMin: 25,
    avgHeadwayMin: 10.0,
    avgBusesPerDay: 10,
    avgBusCapacity: 29,
    peakHours: ["06:30-08:30", "17:00-19:00"],
    stops: [
      { name: "Kimironko",      lat: -1.9400, lng: 30.1050, isTerminal: true },
      { name: "Kibagabaga",     lat: -1.9380, lng: 30.0830 },
      { name: "Kagugu",         lat: -1.9310, lng: 30.0850 },
      { name: "Batsinda",       lat: -1.9080, lng: 30.0920, isTerminal: true },
    ],
  },

  // ---- ROUTE 321: Batsinda-Gatanze ----
  {
    id: "321",
    code: "321",
    name: "Batsinda – Gatanze",
    shortName: "Batsinda → Gatanze",
    operator: "rftc",
    zone: 3,
    color: "#4ADE80",
    distanceKm: 5.0,
    estimatedTravelTimeMin: 17,
    avgHeadwayMin: 12.0,
    avgBusesPerDay: 8,
    avgBusCapacity: 29,
    peakHours: ["06:30-08:00", "17:30-19:00"],
    stops: [
      { name: "Batsinda",       lat: -1.9080, lng: 30.0920, isTerminal: true },
      { name: "Nyacyonga",      lat: -1.8950, lng: 30.0880 },
      { name: "Gatanze",        lat: -1.8850, lng: 30.0850, isTerminal: true },
    ],
  },

  // ---- ROUTE 322: Masaka-Kimironko ----
  {
    id: "322",
    code: "322",
    name: "Masaka – Kimironko",
    shortName: "Masaka → Kimironko",
    operator: "rftc",
    zone: 3,
    color: "#16A34A",
    distanceKm: 8.0,
    estimatedTravelTimeMin: 27,
    avgHeadwayMin: 11.0,
    avgBusesPerDay: 10,
    avgBusCapacity: 29,
    peakHours: ["06:00-08:30", "17:00-19:00"],
    stops: [
      { name: "Masaka",         lat: -1.9150, lng: 30.1250, isTerminal: true },
      { name: "Kabuga",         lat: -1.9250, lng: 30.1180 },
      { name: "Zindiro",        lat: -1.9320, lng: 30.1130 },
      { name: "Kimironko",      lat: -1.9400, lng: 30.1050, isTerminal: true },
    ],
  },

  // ---- ROUTE 323: Zindiro-Nyabugogo ----
  {
    id: "323",
    code: "323",
    name: "Zindiro – Nyabugogo",
    shortName: "Zindiro → Nyabugogo",
    operator: "rftc",
    zone: 3,
    color: "#15803D",
    distanceKm: 16.0,
    estimatedTravelTimeMin: 54,
    avgHeadwayMin: 9.0,
    avgBusesPerDay: 14,
    avgBusCapacity: 31,
    peakHours: ["06:00-08:30", "17:00-19:30"],
    stops: [
      { name: "Zindiro",        lat: -1.9320, lng: 30.1130, isTerminal: true },
      { name: "Kimironko",      lat: -1.9400, lng: 30.1050 },
      { name: "Kibagabaga",     lat: -1.9380, lng: 30.0830 },
      { name: "Kacyiru",        lat: -1.9460, lng: 30.0680 },
      { name: "Muhima",         lat: -1.9445, lng: 30.0535 },
      { name: "Nyabugogo",      lat: -1.9397, lng: 30.0447, isTerminal: true },
    ],
  },

  // ---- ROUTE 325: Kabuga-Kimironko ----
  {
    id: "325",
    code: "325",
    name: "Kabuga – Kimironko",
    shortName: "Kabuga → Kimironko",
    operator: "rftc",
    zone: 3,
    color: "#22C55E",
    distanceKm: 6.5,
    estimatedTravelTimeMin: 22,
    avgHeadwayMin: 10.0,
    avgBusesPerDay: 10,
    avgBusCapacity: 29,
    peakHours: ["06:30-08:30", "17:00-19:00"],
    stops: [
      { name: "Kabuga",         lat: -1.9250, lng: 30.1180, isTerminal: true },
      { name: "Zindiro",        lat: -1.9320, lng: 30.1130 },
      { name: "Kimironko",      lat: -1.9400, lng: 30.1050, isTerminal: true },
    ],
  },
];

// ============================================================
// ZONE IV ROUTES (RFTC) — from dissertation Figure 5
// ============================================================
// Route codes 401-411

export const ZONE_IV_ROUTES: Route[] = [
  // ---- ROUTE 401: Nyamirambo-CBD ----
  {
    id: "401",
    code: "401",
    name: "Nyamirambo – CBD",
    shortName: "Nyamirambo → CBD",
    operator: "rftc",
    zone: 4,
    color: "#F59E0B",
    distanceKm: 6.5,
    estimatedTravelTimeMin: 22,
    avgHeadwayMin: 5.5,
    avgBusesPerDay: 18,
    avgBusCapacity: 31,
    peakHours: ["06:00-08:30", "17:00-19:30"],
    stops: [
      { name: "Nyamirambo",     lat: -1.9720, lng: 30.0420, isTerminal: true },
      { name: "Biryogo",        lat: -1.9680, lng: 30.0450 },
      { name: "Rwampara",       lat: -1.9630, lng: 30.0480 },
      { name: "Nyabugogo Jct",  lat: -1.9550, lng: 30.0530 },
      { name: "CBD / Downtown", lat: -1.9500, lng: 30.0588, isTerminal: true },
    ],
  },

  // ---- ROUTE 402: Kimisagara-CBD ----
  {
    id: "402",
    code: "402",
    name: "Kimisagara – CBD",
    shortName: "Kimisagara → CBD",
    operator: "rftc",
    zone: 4,
    color: "#D97706",
    distanceKm: 5.0,
    estimatedTravelTimeMin: 17,
    avgHeadwayMin: 6.0,
    avgBusesPerDay: 16,
    avgBusCapacity: 29,
    peakHours: ["06:30-08:30", "17:00-19:00"],
    stops: [
      { name: "Kimisagara",     lat: -1.9620, lng: 30.0450, isTerminal: true },
      { name: "Rwampara",       lat: -1.9630, lng: 30.0480 },
      { name: "Muhima",         lat: -1.9445, lng: 30.0535 },
      { name: "CBD / Downtown", lat: -1.9500, lng: 30.0588, isTerminal: true },
    ],
  },

  // ---- ROUTE 403: Nyacyonga-CBD ----
  {
    id: "403",
    code: "403",
    name: "Nyacyonga – CBD",
    shortName: "Nyacyonga → CBD",
    operator: "rftc",
    zone: 4,
    color: "#B45309",
    distanceKm: 16.0,
    estimatedTravelTimeMin: 54,
    avgHeadwayMin: 9.0,
    avgBusesPerDay: 14,
    avgBusCapacity: 31,
    peakHours: ["05:30-08:00", "17:00-19:30"],
    stops: [
      { name: "Nyacyonga",      lat: -1.8950, lng: 30.0880, isTerminal: true },
      { name: "Batsinda",       lat: -1.9080, lng: 30.0920 },
      { name: "Gisozi",         lat: -1.9300, lng: 30.0590 },
      { name: "Gatsata",        lat: -1.9280, lng: 30.0510 },
      { name: "Muhima",         lat: -1.9445, lng: 30.0535 },
      { name: "CBD / Downtown", lat: -1.9500, lng: 30.0588, isTerminal: true },
    ],
  },

  // ---- ROUTE 404: Bishenyi-Nyabugogo ----
  {
    id: "404",
    code: "404",
    name: "Bishenyi – Nyabugogo",
    shortName: "Bishenyi → Nyabugogo",
    operator: "rftc",
    zone: 4,
    color: "#92400E",
    distanceKm: 12.0,
    estimatedTravelTimeMin: 40,
    avgHeadwayMin: 10.0,
    avgBusesPerDay: 12,
    avgBusCapacity: 29,
    peakHours: ["06:00-08:30", "17:00-19:00"],
    stops: [
      { name: "Bishenyi",       lat: -1.9850, lng: 30.0350, isTerminal: true },
      { name: "Nyamirambo",     lat: -1.9720, lng: 30.0420 },
      { name: "Kimisagara",     lat: -1.9620, lng: 30.0450 },
      { name: "Nyabugogo",      lat: -1.9397, lng: 30.0447, isTerminal: true },
    ],
  },

  // ---- ROUTE 405: Nyabugogo-Rwampara ----
  {
    id: "405",
    code: "405",
    name: "Nyabugogo – Rwampara",
    shortName: "Nyabugogo → Rwampara",
    operator: "rftc",
    zone: 4,
    color: "#FBBF24",
    distanceKm: 4.5,
    estimatedTravelTimeMin: 15,
    avgHeadwayMin: 8.0,
    avgBusesPerDay: 10,
    avgBusCapacity: 29,
    peakHours: ["06:30-08:30", "17:00-19:00"],
    stops: [
      { name: "Nyabugogo",      lat: -1.9397, lng: 30.0447, isTerminal: true },
      { name: "Muhima",         lat: -1.9445, lng: 30.0535 },
      { name: "Rwampara",       lat: -1.9630, lng: 30.0480, isTerminal: true },
    ],
  },

  // ---- ROUTE 406: RP-Magaragere ----
  {
    id: "406",
    code: "406",
    name: "RP – Magaragere",
    shortName: "RP → Magaragere",
    operator: "rftc",
    zone: 4,
    color: "#FCD34D",
    distanceKm: 8.0,
    estimatedTravelTimeMin: 27,
    avgHeadwayMin: 12.0,
    avgBusesPerDay: 8,
    avgBusCapacity: 29,
    peakHours: ["06:30-08:00", "17:30-19:00"],
    stops: [
      { name: "RP (Huye Rd)",   lat: -1.9600, lng: 30.0500, isTerminal: true },
      { name: "Nyamirambo",     lat: -1.9720, lng: 30.0420 },
      { name: "Magaragere",     lat: -1.9900, lng: 30.0300, isTerminal: true },
    ],
  },

  // ---- ROUTE 411: Nyabugogo-Nzove-Rutonde ----
  {
    id: "411",
    code: "411",
    name: "Nyabugogo – Nzove – Rutonde",
    shortName: "Nyabugogo → Rutonde",
    operator: "rftc",
    zone: 4,
    color: "#F97316",
    distanceKm: 15.0,
    estimatedTravelTimeMin: 50,
    avgHeadwayMin: 10.0,
    avgBusesPerDay: 12,
    avgBusCapacity: 29,
    peakHours: ["06:00-08:30", "17:00-19:00"],
    stops: [
      { name: "Nyabugogo",      lat: -1.9397, lng: 30.0447, isTerminal: true },
      { name: "Muhima",         lat: -1.9445, lng: 30.0535 },
      { name: "Kimisagara",     lat: -1.9620, lng: 30.0450 },
      { name: "Nzove",          lat: -1.9780, lng: 30.0380 },
      { name: "Rutonde",        lat: -1.9950, lng: 30.0280, isTerminal: true },
    ],
  },
];

// ============================================================
// COMBINED DATASET
// ============================================================
export const ALL_ROUTES: Route[] = [...ZONE_III_ROUTES, ...ZONE_IV_ROUTES];

// ============================================================
// ALERTS (realistic for Kigali transit)
// ============================================================
export const SAMPLE_ALERTS: Alert[] = [
  {
    id: "a1",
    routeId: "302",
    severity: "high",
    titleEn: "Heavy congestion on Kimironko-CBD",
    titleRw: "Inyamyaruka nyinshi Kimironko-CBD",
    messageEn: "Expect 15-20 min delays due to road works near Chez Lando junction. Buses rerouting via Gishushu.",
    messageRw: "Tegura gutinda iminota 15-20 kubera imirimo y'umuhanda hafi ya Chez Lando.",
    timestamp: new Date().toISOString(),
    active: true,
  },
  {
    id: "a2",
    routeId: "305",
    severity: "medium",
    titleEn: "Moderate delays Kimironko-Nyabugogo",
    titleRw: "Gutinda guto Kimironko-Nyabugogo",
    messageEn: "Peak hour congestion near Muhima roundabout. Headways increased to 10 min.",
    messageRw: "Inyamyaruka ku musatiro wa Muhima. Igihe hagati y'amagare cyongerewe kuri minota 10.",
    timestamp: new Date().toISOString(),
    active: true,
  },
  {
    id: "a3",
    routeId: "401",
    severity: "low",
    titleEn: "Normal service on Nyamirambo-CBD",
    titleRw: "Serivisi isanzwe Nyamirambo-CBD",
    messageEn: "All buses operating on schedule. Average wait time: 5 minutes.",
    messageRw: "Amagare yose akora neza. Igihe cyo gutegereza: iminota 5.",
    timestamp: new Date().toISOString(),
    active: true,
  },
  {
    id: "a4",
    routeId: "303",
    severity: "high",
    titleEn: "Bus breakdown on Batsinda-CBD route",
    titleRw: "Igare ryahagaritse ku muhanda Batsinda-CBD",
    messageEn: "One bus out of service near Kagugu. Remaining fleet covering the route. Expect 5 min additional wait.",
    messageRw: "Igare rimwe ryahagaritse hafi ya Kagugu. Tegura gutinda iminota 5.",
    timestamp: new Date().toISOString(),
    active: true,
  },
];

// ============================================================
// QUEUE THEORY UTILITIES
// Based on M/M/1 model from the dissertation (Chapter 3 & 4)
// ============================================================
export const QueueTheory = {
  /**
   * Calculate serving rate μ (passengers/min)
   * Equation 23 from dissertation: μ = N * Bc / [Tμ + (N-1) * Wh]
   */
  servingRate(N: number, Bc: number, T: number, WB: number): number {
    const Tmu = T + WB;
    const Wh = (Tmu * 2) / N; // headway formula from table 1
    return (N * Bc) / (Tmu + (N - 1) * Wh);
  },

  /**
   * System utilization ρ = λ/μ (must be < 1 for stability)
   * Equation 3 from dissertation
   */
  utilization(lambda: number, mu: number): number {
    return lambda / mu;
  },

  /**
   * Average number of passengers in system: L = ρ/(1-ρ)
   * Equation 5 from dissertation
   */
  avgInSystem(rho: number): number {
    if (rho >= 1) return Infinity;
    return rho / (1 - rho);
  },

  /**
   * Average number in queue: Lq = ρ²/(1-ρ)
   * Equation 6 from dissertation
   */
  avgInQueue(rho: number): number {
    if (rho >= 1) return Infinity;
    return (rho * rho) / (1 - rho);
  },

  /**
   * Average waiting time in system: W = 1/(μ-λ)
   * Equation 7 from dissertation
   */
  avgWaitSystem(lambda: number, mu: number): number {
    if (mu <= lambda) return Infinity;
    return 1 / (mu - lambda);
  },

  /**
   * Average waiting time in queue: Wq = ρ/(μ-λ)
   * Equation 8 from dissertation
   */
  avgWaitQueue(lambda: number, mu: number): number {
    if (mu <= lambda) return Infinity;
    const rho = lambda / mu;
    return rho / (mu - lambda);
  },

  /**
   * Probability of zero passengers in system: P0 = 1-ρ
   * Equation 4 from dissertation
   */
  probZero(rho: number): number {
    if (rho >= 1) return 0;
    return 1 - rho;
  },

  /**
   * Headway calculation: Wh = (T + WB) * 2 / N
   * From dissertation Table 1
   */
  headway(T: number, WB: number, N: number): number {
    return ((T + WB) * 2) / N;
  },

  /**
   * Estimate ETA for a passenger at position `pos` in queue
   * given the current system parameters
   */
  estimateETA(pos: number, lambda: number, mu: number): number | null {
    if (mu <= lambda) return null;
    const avgServiceTime = 1 / mu;
    return pos * avgServiceTime;
  },
};

// ============================================================
// SUMMARY STATS
// ============================================================
export const DATASET_SUMMARY = {
  totalRoutes: ALL_ROUTES.length,
  zoneIIIRoutes: ZONE_III_ROUTES.length,
  zoneIVRoutes: ZONE_IV_ROUTES.length,
  totalStops: ALL_ROUTES.reduce((sum, r) => sum + r.stops.length, 0),
  uniqueStops: Array.from(new Set(ALL_ROUTES.flatMap(r => r.stops.map(s => s.name)))).length,
  totalBusesEstimated: ALL_ROUTES.reduce((sum, r) => sum + r.avgBusesPerDay, 0),
  avgDistanceKm: (ALL_ROUTES.reduce((sum, r) => sum + r.distanceKm, 0) / ALL_ROUTES.length).toFixed(1),
  avgTravelTimeMin: (ALL_ROUTES.reduce((sum, r) => sum + r.estimatedTravelTimeMin, 0) / ALL_ROUTES.length).toFixed(1),
};
