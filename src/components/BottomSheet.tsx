import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Search, MapPin, Clock, Bus, Navigation, ArrowRight, X } from 'lucide-react';
import { searchDestination } from '../services/geminiService';
import { calculateETA } from '../services/transitService';
import { useStore } from '../store/useStore';

export default function BottomSheet() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { setSearchedLocation, searchedLocation, recentSearches, addRecentSearch, routes, buses, busStops } = useStore();

  // Find which routes serve the searched location (nearest stop)
  const suggestedRoutes = useMemo(() => {
    if (!searchedLocation) return [];
    let nearestStop: any = null;
    let minDist = Infinity;
    for (const stop of busStops) {
      const dist = Math.hypot(stop.latitude - searchedLocation.lat, stop.longitude - searchedLocation.lng);
      if (dist < minDist) {
        minDist = dist;
        nearestStop = stop;
      }
    }
    if (!nearestStop || minDist > 0.05) return [];

    return routes
      .filter(r => nearestStop.routeIds?.includes(r.id))
      .map(route => {
        const activeBus = buses.find(b => b.routeId === route.id);
        let eta: number | null = null;
        if (activeBus && nearestStop) {
          eta = calculateETA(activeBus.latitude, activeBus.longitude, nearestStop.latitude, nearestStop.longitude, activeBus.speedKmH || 20);
        }
        return { ...route, nearestStop: nearestStop.name, eta, activeBus };
      });
  }, [searchedLocation, routes, buses, busStops]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

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

  const handleClearSearch = () => {
    setQuery('');
    setResult(null);
    setSearchedLocation(null);
  };

  return (
    <motion.div
      className="fixed bottom-16 left-0 right-0 bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-40 overflow-hidden"
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
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Where to?</h2>

        <form onSubmit={handleSearch} className="relative mb-4">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="block w-full pl-11 pr-10 py-4 bg-gray-100 border-transparent rounded-2xl text-gray-900 placeholder-gray-500 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition-all"
            placeholder="Search destination (e.g. Kimironko Market)"
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

        {/* Route suggestions for searched location */}
        {searchedLocation && suggestedRoutes.length > 0 && !loading && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Routes to {searchedLocation.name}</h4>
            <div className="space-y-2">
              {suggestedRoutes.map(route => (
                <div key={route.id} className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Bus className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{route.routeName}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <Navigation className="w-3 h-3" />
                          Stop: {route.nearestStop}
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
                      {route.activeBus.isDeviating ? 'Heavy traffic' : 'Running on time'} • {Math.round(route.activeBus.speedKmH || 0)} km/h
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}

        {result && !loading && (
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

        {!result && !loading && (
          <div className="space-y-4">
            {recentSearches.length > 0 && (
              <>
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Recent Searches</h4>
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

            {/* Quick bus stops */}
            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mt-4 mb-3">Popular Stops</h4>
            <div className="grid grid-cols-2 gap-2">
              {busStops.slice(0, 6).map(stop => (
                <button
                  key={stop.id}
                  onClick={() => handleLocationClick({ lat: stop.latitude, lng: stop.longitude, name: stop.name, description: 'Bus Stop' })}
                  className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl hover:bg-blue-50 transition-colors text-left"
                >
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                    <Bus className="w-4 h-4 text-blue-600" />
                  </div>
                  <p className="text-xs font-medium text-gray-700 truncate">{stop.name}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
