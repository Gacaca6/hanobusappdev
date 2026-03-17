import React, { useEffect, useRef, useCallback } from 'react';
import { APIProvider, Map as GoogleMap, AdvancedMarker, InfoWindow, useMap } from '@vis.gl/react-google-maps';
import { useStore } from '../store/useStore';
import { ALL_ROUTES } from '../data/hanobus_routes';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';
const KIGALI_CENTER = { lat: -1.9441, lng: 30.0619 };

function RoutePolyline({ path }: { path: [number, number][] }) {
  const map = useMap();
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map || !path || path.length === 0) return;

    if (polylineRef.current) {
      polylineRef.current.setMap(null);
    }

    polylineRef.current = new google.maps.Polyline({
      path: path.map(([lat, lng]) => ({ lat, lng })),
      geodesic: true,
      strokeColor: '#3b82f6',
      strokeOpacity: 0.8,
      strokeWeight: 5,
    });
    polylineRef.current.setMap(map);

    const bounds = new google.maps.LatLngBounds();
    path.forEach(([lat, lng]) => bounds.extend({ lat, lng }));
    map.fitBounds(bounds, { top: 80, bottom: 220, left: 40, right: 40 });

    return () => {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
      }
    };
  }, [map, path]);

  return null;
}

function MapCenterUpdater({ center }: { center: { lat: number; lng: number } }) {
  const map = useMap();
  const lastCenter = useRef(center);

  useEffect(() => {
    if (!map) return;
    if (lastCenter.current.lat !== center.lat || lastCenter.current.lng !== center.lng) {
      map.panTo(center);
      lastCenter.current = center;
    }
  }, [map, center]);

  return null;
}

interface MapProps {
  userLocation: [number, number] | null;
  buses: any[];
  onBusClick?: (bus: any) => void;
}

export default function MapComponent({ userLocation, buses, onBusClick }: MapProps) {
  const { searchedLocation, busStops, routePolyline, routes } = useStore();
  const [selectedStop, setSelectedStop] = React.useState<any>(null);
  const [selectedBus, setSelectedBus] = React.useState<any>(null);

  const centerToUse = searchedLocation
    ? { lat: searchedLocation.lat, lng: searchedLocation.lng }
    : userLocation
      ? { lat: userLocation[0], lng: userLocation[1] }
      : KIGALI_CENTER;

  // If no API key, fall back to Leaflet-style OpenStreetMap
  if (!GOOGLE_MAPS_API_KEY) {
    return <FallbackMap userLocation={userLocation} buses={buses} onBusClick={onBusClick} />;
  }

  return (
    <div className="w-full h-full absolute inset-0 z-0">
      <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
        <GoogleMap
          defaultCenter={KIGALI_CENTER}
          defaultZoom={14}
          mapId="hanobus-map"
          gestureHandling="greedy"
          disableDefaultUI={true}
          zoomControl={false}
          style={{ width: '100%', height: '100%' }}
        >
          <MapCenterUpdater center={centerToUse} />

          {routePolyline && <RoutePolyline path={routePolyline} />}

          {/* User location */}
          {userLocation && (
            <AdvancedMarker position={{ lat: userLocation[0], lng: userLocation[1] }}>
              <div className="w-4 h-4 bg-blue-500 rounded-full border-[3px] border-white shadow-lg" />
            </AdvancedMarker>
          )}

          {/* Bus stops */}
          {busStops.map((stop) => {
            const stopRoutes = stop.routeIds
              ? routes.filter(r => stop.routeIds?.includes(r.id))
              : [];
            return (
              <AdvancedMarker
                key={stop.id}
                position={{ lat: stop.latitude, lng: stop.longitude }}
                onClick={() => setSelectedStop(selectedStop?.id === stop.id ? null : stop)}
              >
                <div className="flex flex-col items-center">
                  <div className="w-6 h-6 bg-blue-600 rounded-full border-2 border-white shadow flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                </div>
              </AdvancedMarker>
            );
          })}

          {selectedStop && (
            <InfoWindow
              position={{ lat: selectedStop.latitude, lng: selectedStop.longitude }}
              onCloseClick={() => setSelectedStop(null)}
            >
              <div className="font-sans min-w-[150px] p-1">
                <h3 className="font-bold text-sm mb-1">{selectedStop.name}</h3>
                <p className="text-xs text-gray-500 mb-2">Bus Stop</p>
                {(() => {
                  const stopRoutes = selectedStop.routeIds
                    ? routes.filter((r: any) => selectedStop.routeIds?.includes(r.id))
                    : [];
                  return stopRoutes.length > 0 ? (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-gray-700 border-b pb-1">Connecting Routes:</p>
                      {stopRoutes.map((route: any) => (
                        <div key={route.id} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                          {route.shortName || route.routeName}
                        </div>
                      ))}
                    </div>
                  ) : null;
                })()}
              </div>
            </InfoWindow>
          )}

          {/* Search destination */}
          {searchedLocation && (
            <AdvancedMarker position={{ lat: searchedLocation.lat, lng: searchedLocation.lng }}>
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 bg-red-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="bg-white px-2 py-0.5 rounded shadow text-xs font-medium mt-1 max-w-[120px] truncate">
                  {searchedLocation.name}
                </div>
              </div>
            </AdvancedMarker>
          )}

          {/* Buses */}
          {buses.map((bus) => (
            <AdvancedMarker
              key={bus.id}
              position={{ lat: bus.latitude, lng: bus.longitude }}
              onClick={() => {
                setSelectedBus(selectedBus?.id === bus.id ? null : bus);
                onBusClick?.(bus);
              }}
            >
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-xl shadow-lg flex items-center justify-center ${bus.isDeviating ? 'bg-orange-500' : 'bg-green-500'}`}>
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h8m-8 4h8m-4 4v3m-6 0h12a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v9a2 2 0 002 2z" />
                  </svg>
                </div>
                {bus.eta && (
                  <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold mt-1 shadow ${bus.isDeviating ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                    {bus.eta} min
                  </div>
                )}
              </div>
            </AdvancedMarker>
          ))}

          {selectedBus && (
            <InfoWindow
              position={{ lat: selectedBus.latitude, lng: selectedBus.longitude }}
              onCloseClick={() => setSelectedBus(null)}
            >
              <div className="font-sans min-w-[160px] p-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-3 h-3 rounded-full ${selectedBus.isDeviating ? 'bg-orange-500' : 'bg-green-500'}`} />
                  <h3 className="font-bold text-sm">
                    {routes.find(r => r.id === selectedBus.routeId)?.shortName || routes.find(r => r.id === selectedBus.routeId)?.routeName || selectedBus.routeId}
                  </h3>
                </div>
                <p className="text-xs text-gray-600">Speed: {Math.round(selectedBus.speedKmH || 0)} km/h</p>
                <p className="text-xs text-gray-600">Next: {selectedBus.nextStop}</p>
                {selectedBus.eta && <p className="text-xs font-semibold text-blue-600 mt-1">ETA: {selectedBus.eta} min</p>}
                {selectedBus.isDeviating && <p className="text-xs text-orange-600 font-bold mt-1">Heavy Traffic</p>}
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </APIProvider>
    </div>
  );
}

// Fallback to Leaflet if no Google Maps API key
function FallbackMap({ userLocation, buses, onBusClick }: MapProps) {
  const { searchedLocation, busStops, routePolyline, routes } = useStore();
  const mapRef = useRef<any>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylineRef = useRef<any>(null);

  const defaultCenter: [number, number] = [-1.9441, 30.0619];
  const center = searchedLocation
    ? [searchedLocation.lat, searchedLocation.lng] as [number, number]
    : userLocation || defaultCenter;

  useEffect(() => {
    // Dynamic import of Leaflet
    let cancelled = false;
    (async () => {
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');

      if (cancelled || mapInstanceRef.current) return;

      // Fix Leaflet default icon paths (bundler breaks them)
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map(mapRef.current!, {
        center: center,
        zoom: 14,
        zoomControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      mapInstanceRef.current = map;
    })();

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const L = (window as any).L;
    if (!L) return;

    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // User location
    if (userLocation) {
      const marker = L.circleMarker(userLocation, {
        radius: 8, fillColor: '#3b82f6', fillOpacity: 1, color: 'white', weight: 3,
      }).addTo(map);
      markersRef.current.push(marker);
    }

    // Bus stops
    busStops.forEach(stop => {
      const marker = L.circleMarker([stop.latitude, stop.longitude], {
        radius: 6, fillColor: '#1d4ed8', fillOpacity: 1, color: 'white', weight: 2,
      }).addTo(map).bindPopup(`<b>${stop.name}</b><br/>Bus Stop`);
      markersRef.current.push(marker);
    });

    // Buses
    buses.forEach(bus => {
      const color = bus.isDeviating ? '#f97316' : '#22c55e';
      const foundRoute = routes.find(r => r.id === bus.routeId);
      const routeName = foundRoute?.shortName || foundRoute?.routeName || bus.routeId;
      const marker = L.circleMarker([bus.latitude, bus.longitude], {
        radius: 10, fillColor: color, fillOpacity: 1, color: 'white', weight: 2,
      }).addTo(map).bindPopup(
        `<b>${routeName}</b><br/>Speed: ${Math.round(bus.speedKmH || 0)} km/h<br/>Next: ${bus.nextStop}${bus.eta ? `<br/><b>ETA: ${bus.eta} min</b>` : ''}`
      );
      marker.on('click', () => onBusClick?.(bus));
      markersRef.current.push(marker);
    });

    // Search destination
    if (searchedLocation) {
      const marker = L.circleMarker([searchedLocation.lat, searchedLocation.lng], {
        radius: 10, fillColor: '#ef4444', fillOpacity: 1, color: 'white', weight: 3,
      }).addTo(map).bindPopup(`<b>${searchedLocation.name}</b>`);
      markersRef.current.push(marker);
    }

    // Static route polylines from dataset (thin background lines)
    ALL_ROUTES.forEach(route => {
      const coords = route.stops.map(s => [s.lat, s.lng] as [number, number]);
      if (coords.length >= 2) {
        const line = L.polyline(coords, {
          color: route.color, weight: 2, opacity: 0.4,
        }).addTo(map);
        line.bindPopup(`<b>${route.code}</b> ${route.shortName}`);
        markersRef.current.push(line);
      }
    });

    // Active search route polyline (on top, dashed)
    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }
    if (routePolyline && routePolyline.length > 0) {
      polylineRef.current = L.polyline(routePolyline, {
        color: '#3b82f6', weight: 5, opacity: 0.7, dashArray: '10, 10',
      }).addTo(map);
      map.fitBounds(polylineRef.current.getBounds(), { padding: [50, 50] });
    } else {
      map.setView(center, 14);
    }
  }, [userLocation, buses, busStops, searchedLocation, routePolyline, routes, center]);

  return (
    <div className="w-full h-full absolute inset-0 z-0">
      <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
    </div>
  );
}
