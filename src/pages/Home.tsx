import React, { useEffect, useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { calculateETA } from '../services/transitService';
import { useBusSimulation } from '../services/busSimulation';
import MapView from '../components/Map';
import BottomSheet from '../components/BottomSheet';
import { Bell, X, Bus, Clock, Navigation, MapPin, Info, Timer, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../i18n/useTranslation';
import { ALL_ROUTES } from '../data/hanobus_routes';
import type { Route as DataRoute } from '../data/hanobus_routes';

// Build stop index (same pattern as BottomSheet)
interface StopEntry {
  name: string;
  lat: number;
  lng: number;
  routes: { id: string; code: string; color: string; avgHeadwayMin: number }[];
}

const stopIndex: StopEntry[] = (() => {
  const map = new Map<string, StopEntry>();
  ALL_ROUTES.forEach(route => {
    route.stops.forEach(stop => {
      if (!map.has(stop.name)) {
        map.set(stop.name, { name: stop.name, lat: stop.lat, lng: stop.lng, routes: [] });
      }
      const entry = map.get(stop.name)!;
      if (!entry.routes.some(r => r.id === route.id)) {
        entry.routes.push({ id: route.id, code: route.code, color: route.color, avgHeadwayMin: route.avgHeadwayMin });
      }
    });
  });
  return Array.from(map.values());
})();

// Haversine distance in meters
function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function Home() {
  const { alerts, searchedLocation, setSearchedLocation, setRoutePolyline, busStops, routes, selectedBus, setSelectedBus } = useStore();
  const simulatedBuses = useBusSimulation();
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [showBusCard, setShowBusCard] = useState(false);
  const [showLocationBanner, setShowLocationBanner] = useState(true);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Selected route data
  const selectedRoute: DataRoute | null = useMemo(() => {
    if (!selectedRouteId) return null;
    return ALL_ROUTES.find(r => r.id === selectedRouteId) || null;
  }, [selectedRouteId]);

  // Convert simulated buses to the shape the map & UI expect
  const busesWithETA = useMemo(() => {
    return simulatedBuses.map(bus => ({
      id: bus.id,
      routeId: `route-${bus.routeId}`,
      latitude: bus.latitude,
      longitude: bus.longitude,
      speedKmH: bus.speedKmH,
      nextStop: bus.nextStop,
      isDeviating: bus.isDeviating,
      eta: bus.estimatedArrivalMin,
      routeColor: bus.routeColor,
      routeCode: bus.routeCode,
      routeName: bus.routeName,
    }));
  }, [simulatedBuses]);

  // Find nearest buses to user
  const nearestBuses = useMemo(() => {
    if (!userLocation) return busesWithETA.slice(0, 5);
    return [...busesWithETA].sort((a, b) => {
      const distA = Math.hypot(a.latitude - userLocation[0], a.longitude - userLocation[1]);
      const distB = Math.hypot(b.latitude - userLocation[0], b.longitude - userLocation[1]);
      return distA - distB;
    }).slice(0, 5);
  }, [busesWithETA, userLocation]);

  // Find nearest stop to user
  const nearestStop = useMemo(() => {
    if (!userLocation) return null;
    let best: StopEntry | null = null;
    let bestDist = Infinity;
    for (const stop of stopIndex) {
      const dist = haversineMeters(userLocation[0], userLocation[1], stop.lat, stop.lng);
      if (dist < bestDist) {
        bestDist = dist;
        best = stop;
      }
    }
    if (!best) return null;
    const minHeadway = Math.min(...best.routes.map(r => r.avgHeadwayMin));
    return {
      ...best,
      distanceM: Math.round(bestDist),
      minHeadway,
    };
  }, [userLocation]);

  useEffect(() => {
    let watchId: number;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setLocationDenied(false);
          if (lat > -3.0 && lat < -0.8 && lng > 28.5 && lng < 31.0) {
            setUserLocation([lat, lng]);
          } else {
            setUserLocation(null);
          }
        },
        (error) => {
          console.error('Geolocation error:', error.code, error.message);
          if (error.code === error.PERMISSION_DENIED) {
            setLocationDenied(true);
          }
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
      );
    }
    return () => { if (watchId) navigator.geolocation.clearWatch(watchId); };
  }, []);

  useEffect(() => {
    const startLoc = userLocation || [-1.9441, 30.0619];
    if (searchedLocation) {
      const fetchRoute = async () => {
        try {
          const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${startLoc[1]},${startLoc[0]};${searchedLocation.lng},${searchedLocation.lat}?overview=full&geometries=geojson`);
          const data = await res.json();
          if (data.routes && data.routes[0]) {
            const coords = data.routes[0].geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
            setRoutePolyline(coords);
          }
        } catch (e) {
          console.error("Failed to fetch route", e);
        }
      };
      fetchRoute();
    } else {
      setRoutePolyline(null);
    }
  }, [userLocation, searchedLocation, setRoutePolyline]);

  const handleBusClick = (bus: any) => {
    setSelectedBus(bus);
    setShowBusCard(true);
    // Also select the bus's route on the map
    const routeId = bus.routeId?.replace('route-', '') || null;
    if (routeId) handleRouteSelect(routeId);
  };

  // Handle route selection from search/nearby cards — show on map, don't navigate
  const handleRouteSelect = (routeId: string) => {
    setSelectedRouteId(routeId);
    const route = ALL_ROUTES.find(r => r.id === routeId);
    if (route) {
      // Set polyline from route stops
      const polyline: [number, number][] = route.stops.map(s => [s.lat, s.lng]);
      setRoutePolyline(polyline);
      // Clear any searched location marker
      setSearchedLocation(null);
    }
  };

  const handleClearRoute = () => {
    setSelectedRouteId(null);
    setRoutePolyline(null);
    setShowBusCard(false);
    setSelectedBus(null);
  };

  const selectedBusData = selectedBus ? busesWithETA.find(b => b.id === selectedBus.id) || selectedBus : null;

  return (
    <div className="relative h-full w-full overflow-hidden bg-gray-100">
      {/* Top Navigation Bar */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 flex justify-between items-center pointer-events-none" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}>
        <div className="bg-white/90 backdrop-blur-sm rounded-full shadow-md px-4 py-2.5 pointer-events-auto">
          <span className="text-base font-extrabold text-blue-600 tracking-tight">Hano<span className="text-gray-800">Bus</span></span>
        </div>
        <div className="flex gap-2 pointer-events-auto">
          <button
            onClick={() => navigate('/alerts')}
            className="h-12 w-12 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors relative"
          >
            <Bell className="h-6 w-6 text-gray-800" />
            {alerts.length > 0 && (
              <span className="absolute top-3 right-3 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white"></span>
            )}
          </button>
        </div>
      </div>

      {/* Location denied banner */}
      {locationDenied && showLocationBanner && (
        <div className="absolute left-4 right-4 z-10 pointer-events-auto" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 80px)' }}>
          <div className="bg-gray-100 border border-gray-200 rounded-xl px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-gray-500 shrink-0" />
              <p className="text-xs text-gray-600">{t('enableLocation')}</p>
            </div>
            <button onClick={() => setShowLocationBanner(false)} className="p-0.5 hover:bg-gray-200 rounded-full shrink-0 ml-2">
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>
        </div>
      )}

      {/* Nearby Buses Quick Info */}
      {nearestBuses.length > 0 && !showBusCard && !locationDenied && (
        <div className="absolute left-4 right-4 z-10 pointer-events-auto" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 80px)' }}>
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('nearbyBuses')}</h3>
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            </div>
            <div className="flex gap-2 overflow-x-auto">
              {nearestBuses.map(bus => (
                <button
                  key={bus.id}
                  onClick={() => handleBusClick(bus)}
                  className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 min-w-fit hover:bg-blue-50 transition-colors"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: (bus.routeColor || '#3b82f6') + '20' }}
                  >
                    <span className="text-[10px] font-bold" style={{ color: bus.routeColor || '#3b82f6' }}>
                      {bus.routeCode || '?'}
                    </span>
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold text-gray-900 whitespace-nowrap">
                      {bus.routeName || bus.routeId}
                    </p>
                    <p className="text-[10px] text-gray-500 flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      {bus.eta ? `${bus.eta} min` : '--'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Map Layer — filter buses if a route is selected */}
      <MapView
        userLocation={userLocation}
        buses={selectedRouteId
          ? busesWithETA.filter(b => b.routeId === `route-${selectedRouteId}`)
          : busesWithETA
        }
        onBusClick={handleBusClick}
      />

      {/* Nearest Stop Card */}
      {nearestStop && !showBusCard && !searchedLocation && (
        <div className="absolute bottom-52 left-4 right-4 z-10 pointer-events-auto">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg p-3 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500 font-medium">{t('nearestStop')}</p>
                  <span className="text-[10px] text-gray-400">
                    {nearestStop.distanceM >= 1000
                      ? `${(nearestStop.distanceM / 1000).toFixed(1)} km`
                      : `${nearestStop.distanceM}m`
                    }
                  </span>
                </div>
                <p className="text-sm font-bold text-gray-900 truncate">{nearestStop.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-1">
                    {nearestStop.routes.slice(0, 5).map(r => (
                      <span
                        key={r.id}
                        className="px-1.5 py-0.5 text-[9px] font-bold rounded"
                        style={{ backgroundColor: r.color + '20', color: r.color }}
                      >
                        {r.code}
                      </span>
                    ))}
                    {nearestStop.routes.length > 5 && (
                      <span className="text-[9px] text-gray-400">+{nearestStop.routes.length - 5}</span>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-400">•</span>
                  <div className="flex items-center gap-0.5">
                    <Clock className="w-2.5 h-2.5 text-green-600" />
                    <span className="text-[10px] text-green-700 font-semibold">~{nearestStop.minHeadway} min</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Selected Bus Detail Card */}
      {showBusCard && selectedBusData && (
        <div className="absolute left-4 right-4 z-10 pointer-events-auto" style={{ bottom: 'calc(env(safe-area-inset-bottom, 8px) + 80px)' }}>
          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: (selectedBusData.routeColor || '#3b82f6') + '20' }}
                >
                  <span className="text-sm font-extrabold" style={{ color: selectedBusData.routeColor || '#3b82f6' }}>
                    {selectedBusData.routeCode || '?'}
                  </span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">
                    {selectedBusData.routeName || selectedBusData.routeId}
                  </h3>
                  <p className="text-sm text-gray-500">{selectedBusData.id.replace('sim-', '').toUpperCase()}</p>
                </div>
              </div>
              <button onClick={() => { setShowBusCard(false); setSelectedBus(null); }} className="p-1 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <Clock className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-blue-700">{selectedBusData.eta || '--'}</p>
                <p className="text-[10px] text-blue-500 uppercase">{t('minETA')}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <Navigation className="w-5 h-5 text-gray-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-gray-700">{Math.round(selectedBusData.speedKmH || 0)}</p>
                <p className="text-[10px] text-gray-500 uppercase">{t('kmh')}</p>
              </div>
              <div className={`rounded-xl p-3 text-center ${selectedBusData.isDeviating ? 'bg-orange-50' : 'bg-green-50'}`}>
                <div className={`w-5 h-5 mx-auto mb-1 rounded-full ${selectedBusData.isDeviating ? 'bg-orange-400' : 'bg-green-400'}`} />
                <p className={`text-xs font-bold ${selectedBusData.isDeviating ? 'text-orange-700' : 'text-green-700'}`}>
                  {selectedBusData.isDeviating ? t('delay') : t('onTime')}
                </p>
                <p className="text-[10px] text-gray-500 uppercase">{t('status')}</p>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <p className="text-sm text-gray-700">
                {t('nextStop')}: <span className="font-semibold">{selectedBusData.nextStop}</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Selected Route Info Card */}
      {selectedRoute && !showBusCard && (
        <div className="absolute left-4 right-4 z-10 pointer-events-auto" style={{ bottom: 'calc(env(safe-area-inset-bottom, 8px) + 80px)' }}>
          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: selectedRoute.color + '20' }}
                >
                  <span className="text-sm font-extrabold" style={{ color: selectedRoute.color }}>
                    {selectedRoute.code}
                  </span>
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-gray-900 truncate">{selectedRoute.shortName}</h3>
                  <p className="text-xs text-gray-500">{selectedRoute.stops.length} {t('stops').toLowerCase()}</p>
                </div>
              </div>
              <button onClick={handleClearRoute} className="p-1.5 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                <Navigation className="w-3.5 h-3.5 mx-auto mb-0.5" style={{ color: selectedRoute.color }} />
                <p className="text-sm font-bold text-gray-900">{selectedRoute.distanceKm}</p>
                <p className="text-[9px] text-gray-500 uppercase">km</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                <Clock className="w-3.5 h-3.5 mx-auto mb-0.5" style={{ color: selectedRoute.color }} />
                <p className="text-sm font-bold text-gray-900">{Math.round(selectedRoute.estimatedTravelTimeMin)}</p>
                <p className="text-[9px] text-gray-500 uppercase">min</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                <Timer className="w-3.5 h-3.5 mx-auto mb-0.5" style={{ color: selectedRoute.color }} />
                <p className="text-sm font-bold text-gray-900">{selectedRoute.avgHeadwayMin}</p>
                <p className="text-[9px] text-gray-500 uppercase">{t('headway')}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                <Bus className="w-3.5 h-3.5 mx-auto mb-0.5" style={{ color: selectedRoute.color }} />
                <p className="text-sm font-bold text-gray-900">
                  {busesWithETA.filter(b => b.routeId === `route-${selectedRoute.id}`).length}
                </p>
                <p className="text-[9px] text-gray-500 uppercase">{t('activeBuses')}</p>
              </div>
            </div>

            <button
              onClick={() => navigate(`/routes/${selectedRoute.id}`)}
              className="w-full mt-3 py-2.5 text-sm font-semibold rounded-xl transition-colors"
              style={{ backgroundColor: selectedRoute.color + '15', color: selectedRoute.color }}
            >
              {t('viewDetails')} →
            </button>
          </div>
        </div>
      )}

      {/* Bottom Sheet Overlay */}
      {!showBusCard && !selectedRoute && <BottomSheet onRouteSelect={handleRouteSelect} />}
    </div>
  );
}
