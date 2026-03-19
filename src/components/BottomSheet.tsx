import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, MapPin, Clock, Bus, Navigation, ArrowRight, ArrowLeft, X, Route as RouteIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { searchDestination } from '../services/geminiService';
import { calculateETA } from '../services/transitService';
import { useStore } from '../store/useStore';
import { useTranslation } from '../i18n/useTranslation';
import { ALL_ROUTES } from '../data/hanobus_routes';

// Build a deduped stop index: stop name → { stop info, routeIds[] }
interface StopIndexEntry {
  name: string;
  lat: number;
  lng: number;
  isTerminal: boolean;
  routes: { id: string; code: string; shortName: string; color: string; distanceKm: number; estimatedTravelTimeMin: number }[];
}

const stopIndex = new Map<string, StopIndexEntry>();
ALL_ROUTES.forEach(route => {
  route.stops.forEach(stop => {
    if (!stopIndex.has(stop.name)) {
      stopIndex.set(stop.name, {
        name: stop.name,
        lat: stop.lat,
        lng: stop.lng,
        isTerminal: stop.isTerminal || false,
        routes: [],
      });
    }
    const entry = stopIndex.get(stop.name)!;
    // Avoid duplicate route entries for same stop
    if (!entry.routes.some(r => r.id === route.id)) {
      entry.routes.push({
        id: route.id,
        code: route.code,
        shortName: route.shortName,
        color: route.color,
        distanceKm: route.distanceKm,
        estimatedTravelTimeMin: route.estimatedTravelTimeMin,
      });
    }
  });
});

const allStops = Array.from(stopIndex.values());

interface BottomSheetProps {
  onRouteSelect?: (routeId: string) => void;
}

export default function BottomSheet({ onRouteSelect }: BottomSheetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [selectedStop, setSelectedStop] = useState<StopIndexEntry | null>(null);
  const { setSearchedLocation, searchedLocation, recentSearches, addRecentSearch, buses, busStops } = useStore();
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Instant search results as user types
  const instantResults = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (q.length < 2) return { stops: [], routes: [] };

    // Search stops
    const matchedStops = allStops
      .filter(s => s.name.toLowerCase().includes(q))
      .sort((a, b) => b.routes.length - a.routes.length) // most-connected stops first
      .slice(0, 8);

    // Search routes
    const matchedRoutes = ALL_ROUTES
      .filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.shortName.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q)
      )
      .slice(0, 6);

    return { stops: matchedStops, routes: matchedRoutes };
  }, [query]);

  const hasInstantResults = instantResults.stops.length > 0 || instantResults.routes.length > 0;

  // Route suggestions for searched location (Gemini result)
  const suggestedRoutes = useMemo(() => {
    if (!searchedLocation) return [];

    const nearby: { route: typeof ALL_ROUTES[0]; nearestStop: string; dist: number }[] = [];
    for (const route of ALL_ROUTES) {
      let bestStop = route.stops[0];
      let bestDist = Infinity;
      for (const stop of route.stops) {
        const dist = Math.hypot(stop.lat - searchedLocation.lat, stop.lng - searchedLocation.lng);
        if (dist < bestDist) {
          bestDist = dist;
          bestStop = stop;
        }
      }
      if (bestDist < 0.03) {
        nearby.push({ route, nearestStop: bestStop.name, dist: bestDist });
      }
    }

    return nearby
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 5)
      .map(({ route, nearestStop }) => {
        const routeId = `route-${route.id}`;
        const activeBus = buses.find(b => b.routeId === routeId);
        const stopData = route.stops.find(s => s.name === nearestStop);
        let eta: number | null = null;
        if (activeBus && stopData) {
          eta = calculateETA(activeBus.latitude, activeBus.longitude, stopData.lat, stopData.lng, activeBus.speedKmH || 20);
        }
        return {
          id: routeId,
          routeName: route.shortName,
          code: route.code,
          color: route.color,
          nearestStop,
          eta,
          activeBus,
        };
      });
  }, [searchedLocation, buses]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    // If there are instant results, don't hit Gemini
    if (hasInstantResults) return;

    setLoading(true);
    try {
      const res = await searchDestination(query);
      setResult(res);
      if (res.locations && res.locations.length > 0) {
        const loc = res.locations[0];
        setSearchedLocation(loc);
        addRecentSearch(loc);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleLocationClick = (loc: any) => {
    setSearchedLocation(loc);
    addRecentSearch(loc);
    setIsOpen(false);
  };

  const handleStopSelect = (stop: StopIndexEntry) => {
    setSelectedStop(stop);
    // Also set as searched location so the map centers there
    setSearchedLocation({ lat: stop.lat, lng: stop.lng, name: stop.name, description: `${stop.routes.length} routes` });
  };

  const handleRouteSelect = (routeId: string) => {
    if (onRouteSelect) {
      onRouteSelect(routeId);
      setIsOpen(false);
      setQuery('');
      setSelectedStop(null);
    } else {
      navigate(`/routes/${routeId}`);
    }
  };

  const handleClearSearch = () => {
    setQuery('');
    setResult(null);
    setSelectedStop(null);
    setSearchedLocation(null);
  };

  const handleBackFromStop = () => {
    setSelectedStop(null);
  };

  // Popular stops: those served by the most routes
  const popularStops = useMemo(() => {
    return allStops
      .sort((a, b) => b.routes.length - a.routes.length)
      .slice(0, 6);
  }, []);

  return (
    <motion.div
      className="fixed left-0 right-0 bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-40 overflow-hidden"
      style={{ bottom: 'calc(70px + env(safe-area-inset-bottom, 8px))' }}
      initial={{ y: 'calc(100% - 200px)' }}
      animate={{ y: isOpen ? '0%' : 'calc(100% - 200px)' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
    >
      <div
        className="w-full h-12 flex items-center justify-center cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
      </div>

      <div className="px-6 pb-8 h-[60vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('whereTo')}</h2>

        <form onSubmit={handleSearch} className="relative mb-4">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedStop(null); }}
            className="block w-full pl-11 pr-10 py-4 bg-gray-100 border-transparent rounded-2xl text-gray-900 placeholder-gray-500 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition-all"
            placeholder={t('searchPlaceholder')}
            onClick={() => setIsOpen(true)}
          />
          {(query || searchedLocation) && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute inset-y-0 right-0 pr-4 flex items-center"
            >
              <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </form>

        {/* Selected Stop → Show routes through it */}
        {selectedStop && (
          <div className="mb-4">
            <button onClick={handleBackFromStop} className="flex items-center gap-1 text-blue-600 text-sm mb-3 active:opacity-60">
              <ArrowLeft className="w-4 h-4" />
              {t('busRoutes')}
            </button>

            {/* Stop header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <MapPin className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">{selectedStop.name}</h3>
                <p className="text-xs text-gray-500">{selectedStop.routes.length} {selectedStop.routes.length > 1 ? t('routes').toLowerCase() : t('routeLabel').toLowerCase()}</p>
              </div>
            </div>

            {/* Routes passing through this stop */}
            <div className="space-y-2">
              {selectedStop.routes.map(route => (
                <button
                  key={route.id}
                  onClick={() => handleRouteSelect(route.id)}
                  className="w-full flex items-center justify-between bg-white border border-gray-100 rounded-xl p-3 hover:bg-blue-50 active:scale-[0.98] transition-all shadow-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: route.color + '20' }}
                    >
                      <span className="text-xs font-bold" style={{ color: route.color }}>{route.code}</span>
                    </div>
                    <div className="text-left min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{route.shortName}</p>
                      <p className="text-xs text-gray-500">
                        {route.distanceKm} km • {Math.round(route.estimatedTravelTimeMin)} min
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-300 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Instant search results (as user types) */}
        {!selectedStop && hasInstantResults && (
          <div className="space-y-4 mb-4">
            {/* Stops section */}
            {instantResults.stops.length > 0 && (
              <div>
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <MapPin className="w-3 h-3" /> {t('stops')}
                </h4>
                <div className="space-y-1">
                  {instantResults.stops.map(stop => (
                    <button
                      key={stop.name}
                      onClick={() => handleStopSelect(stop)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-blue-50 rounded-xl transition-colors text-left active:scale-[0.98]"
                    >
                      <div className="h-9 w-9 bg-blue-50 rounded-full flex items-center justify-center shrink-0">
                        <MapPin className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{stop.name}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          {/* Route color dots */}
                          {stop.routes.slice(0, 5).map(r => (
                            <div key={r.id} className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
                          ))}
                          <span className="text-xs text-gray-500 ml-1">
                            {stop.routes.length} {stop.routes.length > 1 ? t('routes').toLowerCase() : t('routeLabel').toLowerCase()}
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-300 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Routes section */}
            {instantResults.routes.length > 0 && (
              <div>
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <Bus className="w-3 h-3" /> {t('routes')}
                </h4>
                <div className="space-y-1">
                  {instantResults.routes.map(route => (
                    <button
                      key={route.id}
                      onClick={() => handleRouteSelect(route.id)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-blue-50 rounded-xl transition-colors text-left active:scale-[0.98]"
                    >
                      <div
                        className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: route.color + '20' }}
                      >
                        <span className="text-[10px] font-bold" style={{ color: route.color }}>{route.code}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{route.shortName}</p>
                        <p className="text-xs text-gray-500 truncate">{route.name}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-300 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Route suggestions for Gemini-searched location */}
        {!selectedStop && searchedLocation && suggestedRoutes.length > 0 && !loading && !hasInstantResults && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">{t('suggestedRoutes')} — {searchedLocation.name}</h4>
            <div className="space-y-2">
              {suggestedRoutes.map(route => (
                <button
                  key={route.id}
                  onClick={() => handleRouteSelect(route.id.replace('route-', ''))}
                  className="w-full bg-blue-50 border border-blue-100 rounded-xl p-3 text-left active:scale-[0.98] transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: route.color + '20' }}>
                        <span className="text-xs font-bold" style={{ color: route.color }}>{route.code}</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{route.routeName}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <Navigation className="w-3 h-3" />
                          {t('nearStop')}: {route.nearestStop}
                        </p>
                      </div>
                    </div>
                    {route.eta && (
                      <div className="bg-white rounded-lg px-3 py-1.5 text-center shadow-sm">
                        <p className="text-lg font-bold text-blue-600">{route.eta}</p>
                        <p className="text-[10px] text-gray-500 uppercase">min</p>
                      </div>
                    )}
                  </div>
                  {route.activeBus && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                      <div className={`w-2 h-2 rounded-full ${route.activeBus.isDeviating ? 'bg-orange-400' : 'bg-green-400'}`} />
                      {route.activeBus.isDeviating ? t('heavyTraffic') : t('onTime')} • {Math.round(route.activeBus.speedKmH || 0)} {t('kmh')}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Gemini results (fallback for non-stop/route searches) */}
        {!selectedStop && result && !loading && !hasInstantResults && (
          <div className="space-y-4">
            {result.locations?.length > 0 ? (
              <div>
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Suggested Locations</h4>
                <ul className="space-y-2">
                  {result.locations.map((loc: any, idx: number) => (
                    <li
                      key={idx}
                      onClick={() => handleLocationClick(loc)}
                      className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors"
                    >
                      <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
                        <MapPin className="h-5 w-5 text-gray-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{loc.name || 'Location'}</p>
                        <p className="text-xs text-gray-500 truncate">{loc.description}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-300 shrink-0" />
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                <p className="text-sm text-gray-600">{result.text}</p>
              </div>
            )}
          </div>
        )}

        {/* Default state: recent searches + popular stops */}
        {!selectedStop && !result && !loading && !hasInstantResults && (
          <div className="space-y-4">
            {recentSearches.length > 0 && (
              <>
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">{t('recentSearches')}</h4>
                {recentSearches.map((search, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleLocationClick(search)}
                    className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors"
                  >
                    <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
                      <Clock className="h-5 w-5 text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{search.name}</p>
                      <p className="text-xs text-gray-500 truncate">{search.description || 'Kigali, Rwanda'}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-300 shrink-0" />
                  </div>
                ))}
              </>
            )}

            {recentSearches.length === 0 && (
              <div className="text-center py-6">
                <Search className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Search for a destination to get started</p>
              </div>
            )}

            {/* Popular stops (most connected) */}
            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mt-4 mb-3">{t('popularStops')}</h4>
            <div className="grid grid-cols-2 gap-2">
              {popularStops.map(stop => (
                <button
                  key={stop.name}
                  onClick={() => handleStopSelect(stop)}
                  className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl hover:bg-blue-50 transition-colors text-left active:scale-[0.98]"
                >
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                    <Bus className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-700 truncate">{stop.name}</p>
                    <p className="text-[10px] text-gray-400">{stop.routes.length} {t('routes').toLowerCase()}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
