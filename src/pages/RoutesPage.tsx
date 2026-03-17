import React, { useState, useEffect } from 'react';
import { MapIcon, Search, Navigation, Bus, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useTranslation } from '../i18n/useTranslation';
import { calculateETA } from '../services/transitService';

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
  const { routes, buses, busStops } = useStore();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRoute, setExpandedRoute] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (routes.length > 0) {
      setIsLoading(false);
    } else {
      const timer = setTimeout(() => setIsLoading(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [routes]);

  const filteredRoutes = routes.filter(route =>
    route.routeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    route.startLocation.toLowerCase().includes(searchQuery.toLowerCase()) ||
    route.endLocation.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRouteBuses = (routeId: string) => {
    return buses.filter(b => b.routeId === routeId).map(bus => {
      const nextStop = busStops.find(s => s.name === bus.nextStop);
      let eta: number | null = null;
      if (nextStop) {
        eta = calculateETA(bus.latitude, bus.longitude, nextStop.latitude, nextStop.longitude, bus.speedKmH || 20);
      }
      return { ...bus, eta };
    });
  };

  const getRouteStops = (routeId: string) => {
    const route = routes.find(r => r.id === routeId);
    if (!route?.orderedStopIds) return [];
    return route.orderedStopIds.map(id => busStops.find(s => s.id === id)).filter(Boolean);
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
            filteredRoutes.map((route) => {
              const routeBuses = getRouteBuses(route.id);
              const isExpanded = expandedRoute === route.id;
              const stops = getRouteStops(route.id);

              return (
                <div key={route.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <button
                    onClick={() => setExpandedRoute(isExpanded ? null : route.id)}
                    className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 bg-blue-50 rounded-full flex items-center justify-center shrink-0">
                        <MapIcon className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold text-gray-900">{route.routeName}</h3>
                        <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                          <Navigation className="h-3 w-3" /> {route.avgTravelTimeMins ? `${route.avgTravelTimeMins} min` : 'N/A'} • {route.distanceKm ? `${route.distanceKm} km` : 'N/A'}
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

                      {stops.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">{t('stops')}</p>
                          <div className="flex items-center gap-1">
                            {stops.map((stop: any, idx: number) => (
                              <React.Fragment key={stop.id}>
                                <div className="flex items-center gap-1">
                                  <div className="w-3 h-3 bg-blue-500 rounded-full border-2 border-blue-200" />
                                  <span className="text-xs text-gray-700 whitespace-nowrap">{stop.name}</span>
                                </div>
                                {idx < stops.length - 1 && (
                                  <div className="flex-1 h-0.5 bg-blue-200 min-w-[8px]" />
                                )}
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                      )}

                      {routeBuses.length === 0 && (
                        <p className="mt-3 text-sm text-gray-400 text-center py-2">{t('noActiveBuses')}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })
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
