import React, { useState, useEffect, useMemo } from 'react';
import { MapIcon, Search, Navigation, Bus, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useTranslation } from '../i18n/useTranslation';
import { calculateETA } from '../services/transitService';
import { ALL_ROUTES, ZONE_III_ROUTES, ZONE_IV_ROUTES } from '../data/hanobus_routes';
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

export default function RoutesPage() {
  const { buses, busStops } = useStore();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRoute, setExpandedRoute] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Brief skeleton then show static data
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

  // Group by zone
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
    const isExpanded = expandedRoute === route.id;

    return (
      <div key={route.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <button
          onClick={() => setExpandedRoute(isExpanded ? null : route.id)}
          className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: route.color + '20' }}>
              <span className="text-sm font-bold" style={{ color: route.color }}>{route.code}</span>
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-gray-900">{route.shortName}</h3>
              <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                <Navigation className="h-3 w-3" />
                {Math.round(route.estimatedTravelTimeMin)} min • {route.distanceKm} km • {route.stops.length} {t('stops').toLowerCase()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {routeBuses.length > 0 && (
              <span className="px-2 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full">
                {routeBuses.length} {routeBuses.length > 1 ? t('busesPlural') : t('bus')}
              </span>
            )}
            {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </div>
        </button>

        {isExpanded && (
          <div className="px-4 pb-4 border-t border-gray-100">
            {/* Route details */}
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="bg-gray-50 rounded-xl p-2">
                <p className="text-xs text-gray-500">Headway</p>
                <p className="text-sm font-bold text-gray-900">{route.avgHeadwayMin} min</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-2">
                <p className="text-xs text-gray-500">Buses/Day</p>
                <p className="text-sm font-bold text-gray-900">{route.avgBusesPerDay}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-2">
                <p className="text-xs text-gray-500">Capacity</p>
                <p className="text-sm font-bold text-gray-900">{route.avgBusCapacity}</p>
              </div>
            </div>

            {/* Active buses */}
            {routeBuses.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">{t('activeBusesLabel')}</p>
                <div className="space-y-2">
                  {routeBuses.map(bus => (
                    <div key={bus.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${bus.isDeviating ? 'bg-orange-100' : 'bg-green-100'}`}>
                          <Bus className={`w-4 h-4 ${bus.isDeviating ? 'text-orange-600' : 'text-green-600'}`} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{bus.id.toUpperCase()}</p>
                          <p className="text-xs text-gray-500">
                            {Math.round(bus.speedKmH || 0)} {t('kmh')} • {t('nextStop')}: {bus.nextStop}
                          </p>
                        </div>
                      </div>
                      {bus.eta && (
                        <div className="flex items-center gap-1 text-blue-600">
                          <Clock className="w-3.5 h-3.5" />
                          <span className="text-sm font-bold">{bus.eta} min</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stops */}
            <div className="mt-3">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">{t('stops')}</p>
              <div className="flex items-center gap-1 overflow-x-auto pb-1">
                {route.stops.map((stop, idx) => (
                  <React.Fragment key={idx}>
                    <div className="flex items-center gap-1 shrink-0">
                      <div
                        className="w-3 h-3 rounded-full border-2"
                        style={{
                          backgroundColor: stop.isTerminal ? route.color : 'white',
                          borderColor: route.color,
                        }}
                      />
                      <span className="text-xs text-gray-700 whitespace-nowrap">{stop.name}</span>
                    </div>
                    {idx < route.stops.length - 1 && (
                      <div className="flex-shrink-0 w-4 h-0.5" style={{ backgroundColor: route.color + '60' }} />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {routeBuses.length === 0 && (
              <p className="mt-3 text-sm text-gray-400 text-center py-2">{t('noActiveBuses')}</p>
            )}
          </div>
        )}
      </div>
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
