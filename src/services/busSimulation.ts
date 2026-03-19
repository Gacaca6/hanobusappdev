/**
 * Bus Simulation Service — Deterministic, collision-free.
 *
 * Every bus moves at exactly 0.001 progress per tick (3s).
 * Buses start perfectly spaced at (i + 0.5) / N.
 * Same speed + same spacing = mathematically impossible to collide.
 * Max 3 buses per route, ~50-60 total across 27 routes.
 */
import { useState, useEffect, useRef } from 'react';
import { ALL_ROUTES } from '../data/hanobus_routes';
import type { Stop } from '../data/hanobus_routes';

const PROGRESS_PER_TICK = 0.001;
const MAX_BUSES_PER_ROUTE = 3;

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

// Pre-compute once
const routeCache = ALL_ROUTES
  .filter(r => r.stops.length >= 2)
  .map(r => ({
    ...r,
    cumDists: getSegmentDistances(r.stops),
    avgSpeedKmH: r.distanceKm / (r.estimatedTravelTimeMin / 60),
    busCount: Math.min(Math.max(1, Math.floor(r.avgBusesPerDay / 5)), MAX_BUSES_PER_ROUTE),
  }));

function createInitialBuses(): SimulatedBus[] {
  const buses: SimulatedBus[] = [];

  for (const rc of routeCache) {
    for (let i = 0; i < rc.busCount; i++) {
      // Perfect even spacing: (0.5/3, 1.5/3, 2.5/3) for 3 buses
      const progress = (i + 0.5) / rc.busCount;

      const pos = interpolatePosition(rc.stops, rc.cumDists, progress);
      const nextStopName = rc.stops[pos.nextStopIdx]?.name || rc.stops[rc.stops.length - 1].name;
      const etaMin = (1 - progress) * rc.estimatedTravelTimeMin;

      buses.push({
        id: `sim-${rc.id}-${i + 1}`,
        routeId: rc.id,
        routeCode: rc.code,
        routeName: rc.shortName,
        routeColor: rc.color,
        latitude: pos.lat,
        longitude: pos.lng,
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

    // Advance by exactly 0.001 — no randomness
    let newProgress = bus.progress + PROGRESS_PER_TICK;
    if (newProgress >= 1.0) newProgress -= 1.0;

    const pos = interpolatePosition(rc.stops, rc.cumDists, newProgress);
    const nextStopName = rc.stops[pos.nextStopIdx]?.name || rc.stops[rc.stops.length - 1].name;
    const etaMin = (1 - newProgress) * rc.estimatedTravelTimeMin;

    return {
      ...bus,
      progress: newProgress,
      latitude: pos.lat,
      longitude: pos.lng,
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
