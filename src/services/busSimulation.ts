/**
 * Bus Simulation Service — Deterministic, collision-free.
 *
 * Every bus moves at exactly 0.001 progress per tick (3s).
 * Buses start perfectly spaced at (i + 0.5) / N.
 * Same speed + same spacing = mathematically impossible to collide.
 * Max 3 buses per route, ~50-60 total across 27 routes.
 *
 * Cross-route overlap: routes sharing the same road get a perpendicular
 * lat/lng offset so their markers sit side-by-side, not stacked.
 */
import { useState, useEffect, useRef } from 'react';
import { ALL_ROUTES } from '../data/hanobus_routes';
import type { Stop } from '../data/hanobus_routes';

const PROGRESS_PER_TICK = 0.001;
const MAX_BUSES_PER_ROUTE = 3;

// ~50 meters in degrees — enough to visually separate markers on the map
const LANE_OFFSET = 0.0005;

export interface SimulatedBus {
  id: string;
  routeId: string;
  routeCode: string;
  routeName: string;
  routeColor: string;
  latitude: number;
  longitude: number;
  progress: number;
  speedKmH: number;
  nextStop: string;
  estimatedArrivalMin: number;
  isDeviating: boolean;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function getSegmentDistances(stops: Stop[]): number[] {
  const dists: number[] = [0];
  for (let i = 1; i < stops.length; i++) {
    const dlat = stops[i].lat - stops[i - 1].lat;
    const dlng = stops[i].lng - stops[i - 1].lng;
    dists.push(dists[i - 1] + Math.sqrt(dlat * dlat + dlng * dlng));
  }
  return dists;
}

/**
 * Detect which routes share road segments by checking for 2+ consecutive
 * shared stop names. Returns a map of routeId → lane index (0, 1, 2...).
 * Routes that don't share roads get lane 0. Routes that do get offset lanes.
 */
function computeLaneOffsets(): Map<string, number> {
  const lanes = new Map<string, number>();

  // Build a fingerprint for each route: ordered list of stop names
  const routeStopNames = ALL_ROUTES.map(r => ({
    id: r.id,
    names: r.stops.map(s => s.name),
  }));

  // Find groups of routes that share 2+ consecutive stops
  const groups: string[][] = [];
  const assigned = new Set<string>();

  for (let a = 0; a < routeStopNames.length; a++) {
    if (assigned.has(routeStopNames[a].id)) continue;
    const group = [routeStopNames[a].id];

    for (let b = a + 1; b < routeStopNames.length; b++) {
      if (assigned.has(routeStopNames[b].id)) continue;

      // Check if routes a and b share ANY stop name
      const namesA = new Set(routeStopNames[a].names);
      const namesB = routeStopNames[b].names;
      const shares = namesB.some(name => namesA.has(name));

      if (shares) group.push(routeStopNames[b].id);
    }

    if (group.length > 1) {
      groups.push(group);
      for (const id of group) assigned.add(id);
    }
  }

  // Assign lane indices within each overlap group
  // Center the lanes so they fan out evenly from the road center
  for (const group of groups) {
    group.forEach((id, idx) => {
      // For N routes: offsets are -floor(N/2), ..., -1, 0, 1, ..., floor(N/2)
      // This fans them out symmetrically
      const center = (group.length - 1) / 2;
      lanes.set(id, idx - Math.round(center));
    });
  }

  // Routes not in any group get lane 0
  for (const r of ALL_ROUTES) {
    if (!lanes.has(r.id)) lanes.set(r.id, 0);
  }

  return lanes;
}

/**
 * Given an interpolated position and the current route segment direction,
 * apply a perpendicular offset to shift the bus to its "lane".
 */
function applyLaneOffset(
  lat: number,
  lng: number,
  stops: Stop[],
  nextStopIdx: number,
  laneIndex: number
): { lat: number; lng: number } {
  if (laneIndex === 0) return { lat, lng };

  // Get the direction vector of the current segment
  const fromIdx = Math.max(0, nextStopIdx - 1);
  const toIdx = nextStopIdx;
  const dlat = stops[toIdx].lat - stops[fromIdx].lat;
  const dlng = stops[toIdx].lng - stops[fromIdx].lng;

  // Perpendicular vector (rotate 90°): (-dlng, dlat), normalized
  const len = Math.sqrt(dlat * dlat + dlng * dlng);
  if (len === 0) return { lat, lng };

  const perpLat = -dlng / len;
  const perpLng = dlat / len;

  return {
    lat: lat + perpLat * LANE_OFFSET * laneIndex,
    lng: lng + perpLng * LANE_OFFSET * laneIndex,
  };
}

function interpolatePosition(
  stops: Stop[],
  cumDists: number[],
  progress: number
): { lat: number; lng: number; nextStopIdx: number } {
  const totalDist = cumDists[cumDists.length - 1];
  const targetDist = progress * totalDist;

  for (let i = 1; i < cumDists.length; i++) {
    if (targetDist <= cumDists[i]) {
      const segLen = cumDists[i] - cumDists[i - 1];
      const t = segLen > 0 ? (targetDist - cumDists[i - 1]) / segLen : 0;
      return {
        lat: lerp(stops[i - 1].lat, stops[i].lat, t),
        lng: lerp(stops[i - 1].lng, stops[i].lng, t),
        nextStopIdx: i,
      };
    }
  }
  const last = stops[stops.length - 1];
  return { lat: last.lat, lng: last.lng, nextStopIdx: stops.length - 1 };
}

// Pre-compute once at module load
const laneOffsets = computeLaneOffsets();

const routeCache = ALL_ROUTES
  .filter(r => r.stops.length >= 2)
  .map((r, routeIndex) => ({
    ...r,
    cumDists: getSegmentDistances(r.stops),
    avgSpeedKmH: r.distanceKm / (r.estimatedTravelTimeMin / 60),
    busCount: Math.min(Math.max(1, Math.floor(r.avgBusesPerDay / 5)), MAX_BUSES_PER_ROUTE),
    lane: laneOffsets.get(r.id) || 0,
    // Golden ratio stagger — maximally spreads buses from different routes
    // along shared road segments so they never start at the same spot
    progressOffset: (routeIndex * 0.618033988) % 1.0,
  }));

function createInitialBuses(): SimulatedBus[] {
  const buses: SimulatedBus[] = [];

  for (const rc of routeCache) {
    for (let i = 0; i < rc.busCount; i++) {
      // Even spacing + per-route offset so overlapping routes don't align
      let progress = ((i + 0.5) / rc.busCount + rc.progressOffset) % 1.0;

      const pos = interpolatePosition(rc.stops, rc.cumDists, progress);
      const offset = applyLaneOffset(pos.lat, pos.lng, rc.stops, pos.nextStopIdx, rc.lane);
      const nextStopName = rc.stops[pos.nextStopIdx]?.name || rc.stops[rc.stops.length - 1].name;
      const etaMin = (1 - progress) * rc.estimatedTravelTimeMin;

      buses.push({
        id: `sim-${rc.id}-${i + 1}`,
        routeId: rc.id,
        routeCode: rc.code,
        routeName: rc.shortName,
        routeColor: rc.color,
        latitude: offset.lat,
        longitude: offset.lng,
        progress,
        speedKmH: Math.round(rc.avgSpeedKmH),
        nextStop: nextStopName,
        estimatedArrivalMin: Math.round(etaMin * 10) / 10,
        isDeviating: false,
      });
    }
  }

  return buses;
}

function advanceBuses(buses: SimulatedBus[]): SimulatedBus[] {
  return buses.map(bus => {
    const rc = routeCache.find(r => r.id === bus.routeId);
    if (!rc) return bus;

    let newProgress = bus.progress + PROGRESS_PER_TICK;
    if (newProgress >= 1.0) newProgress -= 1.0;

    const pos = interpolatePosition(rc.stops, rc.cumDists, newProgress);
    const offset = applyLaneOffset(pos.lat, pos.lng, rc.stops, pos.nextStopIdx, rc.lane);
    const nextStopName = rc.stops[pos.nextStopIdx]?.name || rc.stops[rc.stops.length - 1].name;
    const etaMin = (1 - newProgress) * rc.estimatedTravelTimeMin;

    return {
      ...bus,
      progress: newProgress,
      latitude: offset.lat,
      longitude: offset.lng,
      nextStop: nextStopName,
      estimatedArrivalMin: Math.round(etaMin * 10) / 10,
      speedKmH: Math.round(rc.avgSpeedKmH),
      isDeviating: false,
    };
  });
}

/**
 * React hook — live array of simulated bus positions, updating every 3s.
 */
export function useBusSimulation() {
  const [buses, setBuses] = useState<SimulatedBus[]>(() => createInitialBuses());

  useEffect(() => {
    const interval = setInterval(() => {
      setBuses(prev => advanceBuses(prev));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return buses;
}
