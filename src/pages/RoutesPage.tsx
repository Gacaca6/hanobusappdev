import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapIcon, Search, Navigation, Bus, Clock, ChevronRight, Zap, Users, Timer, Activity, BadgeCheck } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useTranslation } from '../i18n/useTranslation';
import { calculateETA } from '../services/transitService';
import { ALL_ROUTES, ZONE_III_ROUTES, ZONE_IV_ROUTES, QueueTheory, RESEARCH_CONSTANTS } from '../data/hanobus_routes';
import type { Route as DataRoute } from '../data/hanobus_routes';

function RouteSkeletons() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center gap-4">
          <div className="skeleton h-12 w-12 rounded-full shrink-0" />
          <div className="flex-1">
            <div className="skeleton h-4 w-3/5 mb-2" />
            <div className="skeleton h-3 w-2/5" />
          </div>
          <div className="skeleton h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

// Check if current time falls within any of the route's peak hours
function isPeakHour(peakHours: string[]): boolean {
  const now = new Date();
  const currentMin = now.getHours() * 60 + now.getMinutes();
  for (const range of peakHours) {
    const [start, end] = range.split('-');
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    if (currentMin >= startMin && currentMin <= endMin) return true;
  }
  return false;
}

// Calculate live queue theory stats for a route
function getRouteStats(route: DataRoute) {
  const isPeak = isPeakHour(route.peakHours);
  const baseArrivalRate = route.avgArrivalRatePerMin ?? RESEARCH_CONSTANTS.avgArrivalRatePerMin;
  const lambda = isPeak ? baseArrivalRate * 1.5 : baseArrivalRate;
  const boardingTime = route.avgBoardingTimeMin ?? RESEARCH_CONSTANTS.avgBoardingTimeMin;

  const N = route.avgBusesPerDay;
  const Bc = route.avgBusCapacity;
  const T = route.estimatedTravelTimeMin;

  const mu = QueueTheory.servingRate(N, Bc, T, boardingTime);
  const rho = QueueTheory.utilization(lambda, mu);
  const waitQueue = QueueTheory.avgWaitQueue(lambda, mu);
  const inQueue = QueueTheory.avgInQueue(rho);
  const headway = QueueTheory.headway(T, boardingTime, N);

  return {
    isPeak,
    lambda: Math.round(lambda * 10) / 10,
    mu: Math.round(mu * 10) / 10,
    utilization: Math.min(Math.round(rho * 1000) / 10, 100),  // cap at 100%
    waitMin: rho >= 1 ? null : Math.round(waitQueue * 10) / 10,
    queueSize: rho >= 1 ? null : Math.round(inQueue * 10) / 10,
    headwayMin: Math.round(headway * 10) / 10,
    isOverloaded: rho >= 1,
    isBaseline: route.isResearchBaseline === true,
  };
}

export default function RoutesPage() {
  const navigate = useNavigate();
  const { buses, busStops } = useStore();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const filteredRoutes = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return ALL_ROUTES;
    return ALL_ROUTES.filter(route =>
      route.name.toLowerCase().includes(q) ||
      route.shortName.toLowerCase().includes(q) ||
      route.code.toLowerCase().includes(q) ||
      route.stops.some(stop => stop.name.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  const zoneIIIFiltered = filteredRoutes.filter(r => r.zone === 3);
  const zoneIVFiltered = filteredRoutes.filter(r => r.zone === 4);

  const getRouteBuses = (routeCode: string) => {
    const routeId = `route-${routeCode}`;
    return buses.filter(b => b.routeId === routeId).map(bus => {
      const nextStop = busStops.find(s => s.name === bus.nextStop);
      let eta: number | null = null;
      if (nextStop) {
        eta = calculateETA(bus.latitude, bus.longitude, nextStop.latitude, nextStop.longitude, bus.speedKmH || 20);
      }
      return { ...bus, eta };
    });
  };

  const renderRouteCard = (route: DataRoute) => {
    const routeBuses = getRouteBuses(route.id);
    const isPeak = isPeakHour(route.peakHours);

    return (
      <button
        key={route.id}
        onClick={() => navigate(`/routes/${route.id}`)}
        className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center justify-between hover:bg-gray-50 active:scale-[0.98] transition-all"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-12 w-12 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: route.color + '20' }}>
            <span className="text-sm font-bold" style={{ color: route.color }}>{route.code}</span>
          </div>
          <div className="text-left min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{route.shortName}</h3>
            <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
              <Navigation className="h-3 w-3 shrink-0" />
              <span className="truncate">{Math.round(route.estimatedTravelTimeMin)} min • {route.distanceKm} km • {route.stops.length} {t('stops').toLowerCase()}</span>
            </p>
            {/* Mini badges */}
            <div className="flex items-center gap-1.5 mt-1.5">
              {isPeak && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-50 text-amber-600 text-[9px] font-bold rounded-full">
                  <Zap className="w-2.5 h-2.5" /> Peak
                </span>
              )}
              {route.isResearchBaseline && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-50 text-emerald-600 text-[9px] font-bold rounded-full">
                  <BadgeCheck className="w-2.5 h-2.5" /> Verified
                </span>
              )}
              {routeBuses.length > 0 && (
                <span className="px-1.5 py-0.5 bg-green-50 text-green-700 text-[9px] font-medium rounded-full">
                  {routeBuses.length} {routeBuses.length > 1 ? t('busesPlural') : t('bus')}
                </span>
              )}
            </div>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-300 shrink-0 ml-2" />
      </button>
    );
  };

  const renderZoneSection = (label: string, routes: DataRoute[]) => {
    if (routes.length === 0) return null;
    return (
      <>
        <div className="flex items-center gap-2 mt-2 mb-2">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">{label}</h2>
          <span className="text-xs text-gray-300">({routes.length})</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>
        {routes.map(renderRouteCard)}
      </>
    );
  };

  return (
    <div className="min-h-full bg-gray-50 flex flex-col">
      <div className="bg-blue-600 px-6 pt-12 pb-6 text-white shadow-md">
        <h1 className="text-2xl font-bold">{t('busRoutes')}</h1>
        <p className="text-blue-100 mt-1">{t('findYourWay')}</p>
      </div>

      <div className="p-4 flex-1 overflow-y-auto pb-4">
        <div className="relative mb-4">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
            placeholder={t('searchRoutes')}
          />
        </div>

        <div className="space-y-3">
          {isLoading ? (
            <RouteSkeletons />
          ) : filteredRoutes.length > 0 ? (
            <>
              {renderZoneSection('Zone III — East Kigali', zoneIIIFiltered)}
              {renderZoneSection('Zone IV — West Kigali', zoneIVFiltered)}
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              {t('noRoutesFound')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
