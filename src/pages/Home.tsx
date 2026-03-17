import React, { useEffect, useState, useRef } from 'react';
import { doc, getDocFromServer, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useStore } from '../store/useStore';
import Map from '../components/Map';
import BottomSheet from '../components/BottomSheet';
import { Menu, Bell, Play, Square } from 'lucide-react';

export default function Home() {
  const { buses, alerts, searchedLocation, setRoutePolyline, busStops, routes } = useStore();
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const busesRef = useRef(buses);
  const busPathsRef = useRef<Record<string, [number, number][]>>({});

  useEffect(() => {
    busesRef.current = buses;
  }, [buses]);

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

            // 5% chance to toggle deviation/traffic state
            if (Math.random() < 0.05) {
              newIsDeviating = !newIsDeviating;
            }

            if (path && path.length > 0) {
              const nextPoint = path[0];
              
              // Base speed: ~0.0004 degrees per tick (normal traffic)
              // Deviating/Heavy Traffic: ~0.00015 degrees per tick
              const baseSpeed = newIsDeviating ? 0.00015 : 0.0004;
              // Add 20% random noise to simulate micro-traffic variations
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
              
              // Calculate display speed in km/h (1 degree ~ 111km, tick is 3s)
              displaySpeedKmH = Math.round(speed * 111 * 1200);
            } else if (path && path.length === 0) {
              // Reached destination, find next stop
              const route = routes.find(r => r.id === bus.routeId);
              let routeStops = [];
              if (route?.orderedStopIds) {
                routeStops = route.orderedStopIds.map(id => busStops.find(s => s.id === id)).filter(Boolean) as any[];
              } else {
                routeStops = busStops.filter(s => s.routeIds?.includes(bus.routeId));
              }

              if (routeStops.length > 0) {
                const currentIndex = routeStops.findIndex(s => s.name === bus.nextStop);
                const nextIndex = (currentIndex + 1) % routeStops.length;
                const nextStop = routeStops[nextIndex];
                newNextStop = nextStop.name;
                
                // Fetch new path
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
              // Fallback if no path
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
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();

    let watchId: number;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          // Check if location is roughly within Rwanda (Lat: -2.8 to -1.0, Lng: 28.8 to 30.9)
          if (lat > -3.0 && lat < -0.8 && lng > 28.5 && lng < 31.0) {
            setUserLocation([lat, lng]);
          } else {
            console.warn("User location is outside Rwanda. Defaulting to Kigali.");
            // We could set it to null to use the default center, or a specific Kigali point
            setUserLocation(null);
          }
        },
        (error) => {
          console.error("Error getting location", error);
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
      );
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  useEffect(() => {
    const startLoc = userLocation || [-1.9441, 30.0619]; // Default to Kigali center
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

  return (
    <div className="relative h-screen w-full overflow-hidden bg-gray-100">
      {/* Top Navigation Bar Overlay */}
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
            <span className="hidden sm:inline">{isSimulating ? 'Stop Live' : 'Simulate Live'}</span>
          </button>
          <button className="h-12 w-12 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors relative">
            <Bell className="h-6 w-6 text-gray-800" />
            {alerts.length > 0 && (
              <span className="absolute top-3 right-3 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white"></span>
            )}
          </button>
        </div>
      </div>

      {/* Map Layer */}
      <Map userLocation={userLocation} buses={buses} />

      {/* Bottom Sheet Overlay */}
      <BottomSheet />
    </div>
  );
}
