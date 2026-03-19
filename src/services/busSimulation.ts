/**
 * Bus Simulation Service
 * Generates realistic mock bus positions along ALL_ROUTES.
 * Uses setInterval (no Firestore) — pure client-side demo data.
 *
 * Movement model: all buses on a route move at the SAME constant speed.
 * Strict spacing enforcement on every tick prevents collisions.
 */
import { useState, useEffect, useRef } from 'react';
import { ALL_ROUTES } from '../data/hanobus_routes';
import type { Route as DataRoute, Stop } from '../data/hanobus_routes';

const MAX_TOTAL_BUSES = 70;

export interface SimulatedBus {
  id: string;
  routeId: string;
  routeCode: string;
  routeName: string;
  routeColor: string;
  latitude: number;
  longitude: number;
  progress: number;        // 0..1 along the route
  speedKmH: number;
  nextStop: string;
  estimatedArrivalMin: number;
  isDeviating: boolean;
  held: boolean;           // true = waiting at terminal for space
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

/** Constant speed per tick based on route length (no randomness) */
function getProgressPerTick(distanceKm: number): number {
  if (distanceKm > 10) return 0.003;   // long routes — slow progress
  if (distanceKm >= 5) return 0.005;   // medium routes
  return 0.007;                          // short routes — fast progress
}

/**
 * Allocate bus counts per route, respecting MAX_TOTAL_BUSES cap.
 * Higher-traffic routes get proportionally more buses.
 */
function allocateBusCounts(): Map<string, number> {
  const rawCounts = ALL_ROUTES
    .filter(r => r.stops.length >= 2)
    .map(r => ({
      id: r.id,
      raw: Math.max(1, Math.round(r.avgBusesPerDay / 4)),
      daily: r.avgBusesPerDay,
    }));

  const totalRaw = rawCounts.reduce((s, r) => s + r.raw, 0);
  const counts = new Map<string, number>();

  if (totalRaw <= MAX_TOTAL_BUSES) {
    for (const r of rawCounts) counts.set(r.id, r.raw);
  } else {
    const totalDaily = rawCounts.reduce((s, r) => s + r.daily, 0);
    let assigned = 0;
    for (const r of rawCounts) {
      const share = Math.max(1, Math.round((r.daily / totalDaily) * MAX_TOTAL_BUSES));
      counts.set(r.id, share);
      assigned += share;
    }
    if (assigned > MAX_TOTAL_BUSES) {
      const sorted = [...counts.entries()].sort((a, b) => {
        const aDaily = rawCounts.find(r => r.id === a[0])!.daily;
        const bDaily = rawCounts.find(r => r.id === b[0])!.daily;
        return aDaily - bDaily;
      });
      let excess = assigned - MAX_TOTAL_BUSES;
      for (const [id, count] of sorted) {
        if (excess <= 0) break;
        const reduce = Math.min(count - 1, excess);
        counts.set(id, count - reduce);
        excess -= reduce;
      }
    }
  }

  return counts;
}

// Pre-compute route metadata for fast lookup during ticks
interface RouteInfo {
  route: DataRoute;
  cumDists: number[];
  progressPerTick: number;
  busCount: number;
  minGap: number;          // 1.0 / busCount
  avgSpeedKmH: number;
}

let routeInfoCache: Map<string, RouteInfo> | null = null;

function getRouteInfoMap(busCounts: Map<string, number>): Map<string, RouteInfo> {
  if (routeInfoCache) return routeInfoCache;

  const map = new Map<string, RouteInfo>();
  for (const route of ALL_ROUTES) {
    if (route.stops.length < 2) continue;
    const count = busCounts.get(route.id) || 1;
    map.set(route.id, {
      route,
      cumDists: getSegmentDistances(route.stops),
      progressPerTick: getProgressPerTick(route.distanceKm),
      busCount: count,
      minGap: 1.0 / count,
      avgSpeedKmH: route.distanceKm / (route.estimatedTravelTimeMin / 60),
    });
  }
  routeInfoCache = map;
  return map;
}

function createInitialBuses(): SimulatedBus[] {
  const buses: SimulatedBus[] = [];
  const busCounts = allocateBusCounts();
  const infoMap = getRouteInfoMap(busCounts);

  for (const [routeId, info] of infoMap) {
    for (let i = 0; i < info.busCount; i++) {
      // Perfect even spacing: i / N
      const progress = (i / info.busCount) + 0.01; // tiny offset from 0.0

      const pos = interpolatePosition(info.route.stops, info.cumDists, progress);
      const nextStopName = info.route.stops[pos.nextStopIdx]?.name ||
        info.route.stops[info.route.stops.length - 1].name;

      const remainingProgress = 1 - progress;
      const etaMin = remainingProgress * info.route.estimatedTravelTimeMin;

      buses.push({
        id: `sim-${routeId}-${i + 1}`,
        routeId,
        routeCode: info.route.code,
        routeName: info.route.shortName,
        routeColor: info.route.color,
        latitude: pos.lat,
        longitude: pos.lng,
        progress,
        speedKmH: Math.round(info.avgSpeedKmH),
        nextStop: nextStopName,
        estimatedArrivalMin: Math.round(etaMin * 10) / 10,
        isDeviating: false,
        held: false,
      });
    }
  }

  return buses;
}

/**
 * Advance all buses by one tick with strict spacing enforcement.
 *
 * 1. Group by route, sort by progress
 * 2. Move all at the SAME constant speed (no randomness)
 * 3. Enforce minimum gap between consecutive buses
 * 4. Hold buses at terminal if no space to reset
 */
function advanceBuses(buses: SimulatedBus[]): SimulatedBus[] {
  const busCounts = allocateBusCounts();
  const infoMap = getRouteInfoMap(busCounts);

  // Group by route
  const byRoute = new Map<string, SimulatedBus[]>();
  for (const bus of buses) {
    const arr = byRoute.get(bus.routeId) || [];
    arr.push(bus);
    byRoute.set(bus.routeId, arr);
  }

  const result: SimulatedBus[] = [];

  for (const [routeId, routeBuses] of byRoute) {
    const info = infoMap.get(routeId);
    if (!info) { result.push(...routeBuses); continue; }

    const delta = info.progressPerTick;

    // Sort ascending by progress
    routeBuses.sort((a, b) => a.progress - b.progress);

    // Step 1: Advance each bus by the constant delta
    const newProgresses: number[] = routeBuses.map(bus => {
      if (bus.held) return bus.progress; // held buses don't move yet
      return bus.progress + delta;
    });

    // Step 2: Handle resets and terminal holds
    for (let i = 0; i < newProgresses.length; i++) {
      if (newProgresses[i] >= 0.98) {
        // Check if any other bus is near 0.0 (within minGap)
        const nearStart = newProgresses.some((p, j) =>
          j !== i && p < info.minGap * 0.7
        );
        if (nearStart) {
          // Hold at 0.98 — can't reset yet
          newProgresses[i] = 0.98;
        } else if (newProgresses[i] >= 1.0) {
          // Safe to reset
          newProgresses[i] = 0.01;
        }
      }
    }

    // Step 3: Sort again (reset buses jumped to start)
    const indexed = newProgresses.map((p, i) => ({ idx: i, progress: p }));
    indexed.sort((a, b) => a.progress - b.progress);

    // Step 4: Enforce minimum gap between consecutive buses
    const minEnforced = info.minGap * 0.6;
    for (let k = 1; k < indexed.length; k++) {
      const gap = indexed[k].progress - indexed[k - 1].progress;
      if (gap < minEnforced) {
        // Push the later bus forward to maintain gap
        indexed[k].progress = Math.min(0.98, indexed[k - 1].progress + minEnforced);
      }
    }

    // Step 5: Write back final progress values and compute positions
    for (const entry of indexed) {
      const bus = routeBuses[entry.idx];
      const newProgress = Math.max(0.01, Math.min(0.98, entry.progress));
      const held = entry.progress >= 0.98 && bus.progress >= 0.97;

      const pos = interpolatePosition(info.route.stops, info.cumDists, newProgress);
      const nextStopName = info.route.stops[pos.nextStopIdx]?.name ||
        info.route.stops[info.route.stops.length - 1].name;

      const remainingProgress = 1 - newProgress;
      const etaMin = remainingProgress * info.route.estimatedTravelTimeMin;

      // 3% chance to toggle deviating (visual only, no speed effect)
      let isDeviating = bus.isDeviating;
      if (Math.random() < 0.03) isDeviating = !isDeviating;

      result.push({
        ...bus,
        progress: newProgress,
        latitude: pos.lat,
        longitude: pos.lng,
        nextStop: nextStopName,
        estimatedArrivalMin: Math.round(etaMin * 10) / 10,
        speedKmH: Math.round(held ? 0 : info.avgSpeedKmH),
        isDeviating,
        held,
      });
    }
  }

  return result;
}

/**
 * React hook that returns a live array of simulated bus positions.
 * Updates every 3 seconds via setInterval.
 */
export function useBusSimulation() {
  const [buses, setBuses] = useState<SimulatedBus[]>(() => createInitialBuses());
  const busesRef = useRef(buses);

  useEffect(() => {
    busesRef.current = buses;
  }, [buses]);

  useEffect(() => {
    const interval = setInterval(() => {
      setBuses(prev => advanceBuses(prev));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return buses;
}
