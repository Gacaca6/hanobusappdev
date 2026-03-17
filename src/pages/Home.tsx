import React, { useEffect, useState, useRef, useMemo } from 'react';
import { doc, getDocFromServer, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useStore } from '../store/useStore';
import { calculateETA } from '../services/transitService';
import Map from '../components/Map';
import BottomSheet from '../components/BottomSheet';
import { Menu, Bell, Play, Square, X, Bus, Clock, Navigation, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const { buses, alerts, searchedLocation, setRoutePolyline, busStops, routes, selectedBus, setSelectedBus } = useStore();
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [showBusCard, setShowBusCard] = useState(false);
  const busesRef = useRef(buses);
  const busPathsRef = useRef<Record<string, [number, number][]>>({});
  const navigate = useNavigate();

  useEffect(() => {
    busesRef.current = buses;
  }, [buses]);

  // Calculate ETAs for all buses relative to their next stop
  const busesWithETA = useMemo(() => {
    return buses.map(bus => {
      const nextStop = busStops.find(s => s.name === bus.nextStop);
      if (!nextStop) return bus;
      const eta = calculateETA(bus.latitude, bus.longitude, nextStop.latitude, nextStop.longitude, bus.speedKmH || 20);
      return { ...bus, eta };
    });
  }, [buses, busStops]);

  // Find nearest buses to user
  const nearestBuses = useMemo(() => {
    if (!userLocation) return busesWithETA.slice(0, 3);
    return [...busesWithETA].sort((a, b) => {
      const distA = Math.hypot(a.latitude - userLocation[0], a.longitude - userLocation[1]);
      const distB = Math.hypot(b.latitude - userLocation[0], b.longitude - userLocation[1]);
      return distA - distB;
    }).slice(0, 3);
  }, [busesWithETA, userLocation]);

  useEffect(() => {
    if (isSimulating) {
      busesRef.current.forEach(async (bus) => {
        const nextStop = busStops.find(s => s.name === bus.nextStop);
        if (nextStop && !busPathsRef.current[bus.id]) {
          try {
            const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${bus.longitude},${bus.latitude};${nextStop.longitude},${nextStop.latitude}?overview=full&geometries=geojson`);
            const data = await res.json();
            if (data.routes && data.routes[0]) {
              const coords = data.routes[0].geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
              busPathsRef.current[bus.id] = coords;
            }
          } catch (e) {
            console.error("Failed to fetch initial route for bus", e);
          }
        }
      });
    } else {
      busPathsRef.current = {};
    }
  }, [isSimulating, busStops]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSimulating) {
      interval = setInterval(() => {
        busesRef.current.forEach(async (bus) => {
          try {
            const path = busPathsRef.current[bus.id];
            let newLat = bus.latitude;
            let newLng = bus.longitude;
            let newNextStop = bus.nextStop;
            let newIsDeviating = bus.isDeviating || false;
            let displaySpeedKmH = bus.speedKmH || 0;

            if (Math.random() < 0.05) {
              newIsDeviating = !newIsDeviating;
            }

            if (path && path.length > 0) {
              const nextPoint = path[0];
              const baseSpeed = newIsDeviating ? 0.00015 : 0.0004;
              const speed = baseSpeed * (0.8 + Math.random() * 0.4);

              const dx = nextPoint[1] - bus.longitude;
              const dy = nextPoint[0] - bus.latitude;
              const distance = Math.sqrt(dx * dx + dy * dy);

              if (distance > speed) {
                newLat += (dy / distance) * speed;
                newLng += (dx / distance) * speed;
              } else {
                newLat = nextPoint[0];
                newLng = nextPoint[1];
                busPathsRef.current[bus.id] = path.slice(1);
              }
              displaySpeedKmH = Math.round(speed * 111 * 1200);
            } else if (path && path.length === 0) {
              const route = routes.find(r => r.id === bus.routeId);
              let routeStops: any[] = [];
              if (route?.orderedStopIds) {
                routeStops = route.orderedStopIds.map(id => busStops.find(s => s.id === id)).filter(Boolean);
              } else {
                routeStops = busStops.filter(s => s.routeIds?.includes(bus.routeId));
              }

              if (routeStops.length > 0) {
                const currentIndex = routeStops.findIndex(s => s.name === bus.nextStop);
                const nextIndex = (currentIndex + 1) % routeStops.length;
                const nextStop = routeStops[nextIndex];
                newNextStop = nextStop.name;

                try {
                  const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${newLng},${newLat};${nextStop.longitude},${nextStop.latitude}?overview=full&geometries=geojson`);
                  const data = await res.json();
                  if (data.routes && data.routes[0]) {
                    const coords = data.routes[0].geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
                    busPathsRef.current[bus.id] = coords;
                  }
                } catch (e) {
                  console.error("Failed to fetch new route for bus", e);
                }
              }
            } else {
              newLat += (Math.random() - 0.5) * 0.001;
              newLng += (Math.random() - 0.5) * 0.001;
            }

            const busRef = doc(db, 'buses', bus.id);
            await updateDoc(busRef, {
              latitude: newLat,
              longitude: newLng,
              nextStop: newNextStop,
              speedKmH: displaySpeedKmH,
              isDeviating: newIsDeviating,
              lastUpdated: Timestamp.now()
            });
          } catch (error) {
            console.error("Error simulating bus:", error);
          }
        });
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isSimulating, busStops, routes]);

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

  const selectedBusWithETA = selectedBus ? busesWithETA.find(b => b.id === selectedBus.id) : null;

  return (
    <div className="relative h-full w-full overflow-hidden bg-gray-100">
      {/* Top Navigation Bar */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 flex justify-between items-center pointer-events-none">
        <button className="h-12 w-12 bg-white rounded-full shadow-md flex items-center justify-center pointer-events-auto hover:bg-gray-50 transition-colors">
          <Menu className="h-6 w-6 text-gray-800" />
        </button>
        <div className="flex gap-2 pointer-events-auto">
          <button
            onClick={() => setIsSimulating(!isSimulating)}
            className={`h-12 px-4 rounded-full shadow-md flex items-center gap-2 font-semibold transition-colors ${isSimulating ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
          >
            {isSimulating ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            <span className="hidden sm:inline">{isSimulating ? 'Stop' : 'Simulate'}</span>
          </button>
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
              <div className={`w-2 h-2 rounded-full ${isSimulating ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
            </div>
            <div className="flex gap-2 overflow-x-auto">
              {nearestBuses.map(bus => {
                const route = routes.find(r => r.id === bus.routeId);
                return (
                  <button
                    key={bus.id}
                    onClick={() => handleBusClick(bus)}
                    className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 min-w-fit hover:bg-blue-50 transition-colors"
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${bus.isDeviating ? 'bg-orange-100' : 'bg-green-100'}`}>
                      <Bus className={`w-4 h-4 ${bus.isDeviating ? 'text-orange-600' : 'text-green-600'}`} />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-semibold text-gray-900 whitespace-nowrap">
                        {route?.routeName?.split(' - ')[0] || bus.routeId}
                      </p>
                      <p className="text-[10px] text-gray-500 flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {bus.eta ? `${bus.eta} min` : '--'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Map Layer */}
      <Map userLocation={userLocation} buses={busesWithETA} onBusClick={handleBusClick} />

      {/* Selected Bus Detail Card */}
      {showBusCard && selectedBusWithETA && (
        <div className="absolute bottom-20 left-4 right-4 z-10 pointer-events-auto">
          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${selectedBusWithETA.isDeviating ? 'bg-orange-100' : 'bg-green-100'}`}>
                  <Bus className={`w-6 h-6 ${selectedBusWithETA.isDeviating ? 'text-orange-600' : 'text-green-600'}`} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">
                    {routes.find(r => r.id === selectedBusWithETA.routeId)?.routeName || selectedBusWithETA.routeId}
                  </h3>
                  <p className="text-sm text-gray-500">{selectedBusWithETA.id.toUpperCase()}</p>
                </div>
              </div>
              <button onClick={() => { setShowBusCard(false); setSelectedBus(null); }} className="p-1 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <Clock className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-blue-700">{selectedBusWithETA.eta || '--'}</p>
                <p className="text-[10px] text-blue-500 uppercase">Min ETA</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <Navigation className="w-5 h-5 text-gray-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-gray-700">{Math.round(selectedBusWithETA.speedKmH || 0)}</p>
                <p className="text-[10px] text-gray-500 uppercase">km/h</p>
              </div>
              <div className={`rounded-xl p-3 text-center ${selectedBusWithETA.isDeviating ? 'bg-orange-50' : 'bg-green-50'}`}>
                <div className={`w-5 h-5 mx-auto mb-1 rounded-full ${selectedBusWithETA.isDeviating ? 'bg-orange-400' : 'bg-green-400'}`} />
                <p className={`text-xs font-bold ${selectedBusWithETA.isDeviating ? 'text-orange-700' : 'text-green-700'}`}>
                  {selectedBusWithETA.isDeviating ? 'Delay' : 'On Time'}
                </p>
                <p className="text-[10px] text-gray-500 uppercase">Status</p>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <p className="text-sm text-gray-700">
                Next stop: <span className="font-semibold">{selectedBusWithETA.nextStop}</span>
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
