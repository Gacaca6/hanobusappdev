import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { calculateETA } from '../services/transitService';
import { useBusSimulation, SimulatedBus } from '../services/busSimulation';
import Map from '../components/Map';
import BottomSheet from '../components/BottomSheet';
import { Menu, Bell, Play, Square, X, Bus, Clock, Navigation, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const { alerts, searchedLocation, setRoutePolyline, busStops, routes, selectedBus, setSelectedBus } = useStore();
  const simulatedBuses = useBusSimulation();
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [showBusCard, setShowBusCard] = useState(false);
  const navigate = useNavigate();

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
      // Extra fields for colored markers & popups
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

  useEffect(() => {
    let watchId: number;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          if (lat > -3.0 && lat < -0.8 && lng > 28.5 && lng < 31.0) {
            setUserLocation([lat, lng]);
          } else {
            setUserLocation(null);
          }
        },
        (error) => console.error("Error getting location", error),
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
  };

  const selectedBusData = selectedBus ? busesWithETA.find(b => b.id === selectedBus.id) || selectedBus : null;

  return (
    <div className="relative h-full w-full overflow-hidden bg-gray-100">
      {/* Top Navigation Bar */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 flex justify-between items-center pointer-events-none">
        <button className="h-12 w-12 bg-white rounded-full shadow-md flex items-center justify-center pointer-events-auto hover:bg-gray-50 transition-colors">
          <Menu className="h-6 w-6 text-gray-800" />
        </button>
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

      {/* Nearby Buses Quick Info */}
      {nearestBuses.length > 0 && !showBusCard && (
        <div className="absolute top-20 left-4 right-4 z-10 pointer-events-auto">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Nearby Buses</h3>
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

      {/* Map Layer */}
      <Map userLocation={userLocation} buses={busesWithETA} onBusClick={handleBusClick} />

      {/* Selected Bus Detail Card */}
      {showBusCard && selectedBusData && (
        <div className="absolute bottom-20 left-4 right-4 z-10 pointer-events-auto">
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
                <p className="text-[10px] text-blue-500 uppercase">Min ETA</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <Navigation className="w-5 h-5 text-gray-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-gray-700">{Math.round(selectedBusData.speedKmH || 0)}</p>
                <p className="text-[10px] text-gray-500 uppercase">km/h</p>
              </div>
              <div className={`rounded-xl p-3 text-center ${selectedBusData.isDeviating ? 'bg-orange-50' : 'bg-green-50'}`}>
                <div className={`w-5 h-5 mx-auto mb-1 rounded-full ${selectedBusData.isDeviating ? 'bg-orange-400' : 'bg-green-400'}`} />
                <p className={`text-xs font-bold ${selectedBusData.isDeviating ? 'text-orange-700' : 'text-green-700'}`}>
                  {selectedBusData.isDeviating ? 'Delay' : 'On Time'}
                </p>
                <p className="text-[10px] text-gray-500 uppercase">Status</p>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <p className="text-sm text-gray-700">
                Next stop: <span className="font-semibold">{selectedBusData.nextStop}</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Sheet Overlay */}
      {!showBusCard && <BottomSheet />}
    </div>
  );
}
