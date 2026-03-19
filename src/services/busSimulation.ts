/**
 * Bus Simulation Service
 * Generates realistic mock bus positions along ALL_ROUTES.
 * Uses setInterval (no Firestore) — pure client-side demo data.
 */
import { useState, useEffect, useRef } from 'react';
import { ALL_ROUTES } from '../data/hanobus_routes';
import type { Route as DataRoute, Stop } from '../data/hanobus_routes';

const MAX_TOTAL_BUSES = 70;

export interface SimulatedBus {
  id: string;
  routeId: string;         // e.g. "302"
  routeCode: string;       // e.g. "302"
  routeName: string;       // short name
  routeColor: string;
  latitude: number;
  longitude: number;
  progress: number;        // 0..1 along the route
  speedKmH: number;
  nextStop: string;
  estimatedArrivalMin: number;
  isDeviating: boolean;
}

// Interpolate between two stops based on fraction t (0..1)
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Get the cumulative segment distances for a route's stops
function getSegmentDistances(stops: Stop[]): number[] {
  const dists: number[] = [0];
  for (let i = 1; i < stops.length; i++) {
    const dlat = stops[i].lat - stops[i - 1].lat;
    const dlng = stops[i].lng - stops[i - 1].lng;
    dists.push(dists[i - 1] + Math.sqrt(dlat * dlat + dlng * dlng));
  }
  return dists;
}

// Given a progress (0..1), find the interpolated lat/lng along the stops
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
  // At the end
  const last = stops[stops.length - 1];
  return { lat: last.lat, lng: last.lng, nextStopIdx: stops.length - 1 };
}

/**
 * Allocate bus counts per route, respecting MAX_TOTAL_BUSES cap.
 * Higher-traffic routes get proportionally more buses.
 */
function allocateBusCounts(): Map<string, number> {
  // 1/4 of daily fleet, minimum 1
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
    // Under cap — use raw counts directly
    for (const r of rawCounts) counts.set(r.id, r.raw);
  } else {
    // Over cap — scale proportionally by daily traffic
    const totalDaily = rawCounts.reduce((s, r) => s + r.daily, 0);
    let assigned = 0;
    for (const r of rawCounts) {
      const share = Math.max(1, Math.round((r.daily / totalDaily) * MAX_TOTAL_BUSES));
      counts.set(r.id, share);
      assigned += share;
    }
    // Trim overflow from lowest-traffic routes
    if (assigned > MAX_TOTAL_BUSES) {
      const sorted = [...counts.entries()].sort((a, b) => {
        const aDaily = rawCounts.find(r => r.id === a[0])!.daily;
        const bDaily = rawCounts.find(r => r.id === b[0])!.daily;
        return aDaily - bDaily; // lowest traffic first
      });
      let excess = assigned - MAX_TOTAL_BUSES;
      for (const [id, count] of sorted) {
        if (excess <= 0) break;
        const reduce = Math.min(count - 1, excess); // keep at least 1
        counts.set(id, count - reduce);
        excess -= reduce;
      }
    }
  }

  return counts;
}

// Create initial buses for all routes
function createInitialBuses(): SimulatedBus[] {
  const buses: SimulatedBus[] = [];
  const busCounts = allocateBusCounts();

  for (const route of ALL_ROUTES) {
    if (route.stops.length < 2) continue;

    const count = busCounts.get(route.id) || 1;
    const cumDists = getSegmentDistances(route.stops);
    const avgSpeed = route.distanceKm / (route.estimatedTravelTimeMin / 60); // km/h

    for (let i = 0; i < count; i++) {
      // Even spacing: i/N with small random offset (±0.03)
      const baseProgress = i / count;
      const jitter = (Math.random() - 0.5) * 0.06; // ±0.03
      const progress = Math.max(0.01, Math.min(0.99, baseProgress + jitter));

      const pos = interpolatePosition(route.stops, cumDists, progress);
      const nextStopName = route.stops[pos.nextStopIdx]?.name || route.stops[route.stops.length - 1].name;

      // Remaining progress to terminal
      const remainingProgress = 1 - progress;
      const etaMin = remainingProgress * route.estimatedTravelTimeMin;

      // Speed variation: ±20%
      const speed = avgSpeed * (0.8 + Math.random() * 0.4);

      buses.push({
        id: `sim-${route.id}-${i + 1}`,
        routeId: route.id,
        routeCode: route.code,
        routeName: route.shortName,
        routeColor: route.color,
        latitude: pos.lat,
        longitude: pos.lng,
        progress,
        speedKmH: Math.round(speed),
        nextStop: nextStopName,
        estimatedArrivalMin: Math.round(etaMin * 10) / 10,
        isDeviating: Math.random() < 0.1, // 10% chance deviating
      });
    }
  }

  return buses;
}

// Advance all buses by one tick, with anti-bunching logic
function advanceBuses(buses: SimulatedBus[]): SimulatedBus[] {
  // Group buses by route for proximity checks
  const byRoute = new Map<string, SimulatedBus[]>();
  for (const bus of buses) {
    const arr = byRoute.get(bus.routeId) || [];
    arr.push(bus);
    byRoute.set(bus.routeId, arr);
  }

  return buses.map(bus => {
    const route = ALL_ROUTES.find(r => r.id === bus.routeId);
    if (!route || route.stops.length < 2) return bus;

    // Base advancement: 0.002 to 0.005 per tick (3 sec)
    let delta = 0.002 + Math.random() * 0.003;

    // Deviating buses move slower
    if (bus.isDeviating) delta *= 0.5;

    // Anti-bunching: check distance to neighbors on same route
    const siblings = byRoute.get(bus.routeId) || [];
    for (const other of siblings) {
      if (other.id === bus.id) continue;
      const gap = other.progress - bus.progress;
      // Bus ahead within 0.05 progress — slow down this bus
      if (gap > 0 && gap < 0.05) {
        delta *= 0.4;
        break;
      }
      // Bus behind within 0.05 progress — speed up this bus
      if (gap < 0 && gap > -0.05) {
        delta *= 1.5;
        break;
      }
    }

    let newProgress = bus.progress + delta;

    // Reset when reaching end (round trip)
    if (newProgress >= 1.0) {
      newProgress = 0.01;
    }

    const cumDists = getSegmentDistances(route.stops);
    const pos = interpolatePosition(route.stops, cumDists, newProgress);
    const nextStopName = route.stops[pos.nextStopIdx]?.name || route.stops[route.stops.length - 1].name;

    const remainingProgress = 1 - newProgress;
    const etaMin = remainingProgress * route.estimatedTravelTimeMin;

    const avgSpeed = route.distanceKm / (route.estimatedTravelTimeMin / 60);
    const speed = avgSpeed * (bus.isDeviating ? 0.5 : (0.85 + Math.random() * 0.3));

    // Small chance to toggle deviating status
    let isDeviating = bus.isDeviating;
    if (Math.random() < 0.02) {
      isDeviating = !isDeviating;
    }

    return {
      ...bus,
      progress: newProgress,
      latitude: pos.lat,
      longitude: pos.lng,
      nextStop: nextStopName,
      estimatedArrivalMin: Math.round(etaMin * 10) / 10,
      speedKmH: Math.round(speed),
      isDeviating,
    };
  });
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
