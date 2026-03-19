import React, { useEffect, useRef } from 'react';
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

export default function MapComponent(props: MapProps) {
  const { userLocation = null, buses = [], onBusClick } = props || {};
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

          {/* Bus stops — subtle small dots */}
          {busStops.map((stop) => {
            const isTerminal = ALL_ROUTES.some(r =>
              r.stops.some(s => s.name === stop.name && s.isTerminal)
            );
            const terminalRoute = isTerminal
              ? ALL_ROUTES.find(r => r.stops.some(s => s.name === stop.name && s.isTerminal))
              : null;
            return (
              <AdvancedMarker
                key={stop.id}
                position={{ lat: stop.latitude, lng: stop.longitude }}
                onClick={() => setSelectedStop(selectedStop?.id === stop.id ? null : stop)}
              >
                <div
                  className="rounded-full border border-white"
                  style={{
                    width: isTerminal ? 10 : 6,
                    height: isTerminal ? 10 : 6,
                    backgroundColor: isTerminal && terminalRoute ? terminalRoute.color : '#9ca3af',
                    opacity: isTerminal ? 0.9 : 0.6,
                    boxShadow: isTerminal ? '0 1px 2px rgba(0,0,0,0.3)' : 'none',
                  }}
                />
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

          {/* Buses — labeled pill markers */}
          {buses.map((bus) => {
            const color = bus.routeColor || (bus.isDeviating ? '#f97316' : '#22c55e');
            return (
              <AdvancedMarker
                key={bus.id}
                position={{ lat: bus.latitude, lng: bus.longitude }}
                onClick={() => {
                  setSelectedBus(selectedBus?.id === bus.id ? null : bus);
                  onBusClick?.(bus);
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.3))' }}>
                  <span style={{ fontSize: '24px', lineHeight: 1 }}>🚌</span>
                  <span style={{
                    background: color, color: 'white', fontSize: '9px',
                    fontWeight: 700, padding: '1px 5px', borderRadius: '6px',
                    marginTop: '-2px', border: '1.5px solid white',
                  }}>{bus.routeCode || '?'}</span>
                </div>
              </AdvancedMarker>
            );
          })}

          {selectedBus && (
            <InfoWindow
              position={{ lat: selectedBus.latitude, lng: selectedBus.longitude }}
              onCloseClick={() => setSelectedBus(null)}
            >
              <div className="font-sans min-w-[160px] p-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedBus.routeColor || '#22c55e' }} />
                  <h3 className="font-bold text-sm">
                    {selectedBus.routeName || routes.find(r => r.id === selectedBus.routeId)?.shortName || selectedBus.routeId}
                  </h3>
                </div>
                <p className="text-xs text-gray-600">Bus: {selectedBus.id.replace('sim-', '').toUpperCase()}</p>
                <p className="text-xs text-gray-600">Speed: {Math.round(selectedBus.speedKmH || 0)} km/h</p>
                <p className="text-xs text-gray-600">Next: {selectedBus.nextStop}</p>
                {selectedBus.eta && <p className="text-xs font-semibold text-blue-600 mt-1">ETA to terminal: {typeof selectedBus.eta === 'number' ? Math.round(selectedBus.eta) : selectedBus.eta} min</p>}
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
function FallbackMap(props: MapProps) {
  const { userLocation = null, buses = [], onBusClick } = props || {};
  const { searchedLocation, busStops, routePolyline, routes } = useStore();
  const mapRef = useRef<any>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylineRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const [mapReady, setMapReady] = React.useState(false);

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

      // Store Leaflet reference for the markers useEffect
      leafletRef.current = L;

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
      setMapReady(true);
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
    if (!mapReady) return;
    const map = mapInstanceRef.current;
    if (!map) return;

    const L = leafletRef.current;
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

    // Bus stops — small subtle dots (terminals slightly larger with route color)
    busStops.forEach(stop => {
      // Check if this stop is a terminal for any route
      const isTerminal = ALL_ROUTES.some(r =>
        r.stops.some(s => s.name === stop.name && s.isTerminal)
      );
      const terminalRoute = isTerminal
        ? ALL_ROUTES.find(r => r.stops.some(s => s.name === stop.name && s.isTerminal))
        : null;

      const marker = L.circleMarker([stop.latitude, stop.longitude], {
        radius: isTerminal ? 5 : 3,
        fillColor: isTerminal && terminalRoute ? terminalRoute.color : '#9ca3af',
        fillOpacity: isTerminal ? 0.9 : 0.6,
        color: 'white',
        weight: isTerminal ? 2 : 1,
      }).addTo(map).bindPopup(`<b>${stop.name}</b><br/>Bus Stop`);
      markersRef.current.push(marker);
    });

    // Buses — labeled pill markers with route color
    buses.forEach(bus => {
      const color = bus.routeColor || (bus.isDeviating ? '#f97316' : '#22c55e');
      const routeName = bus.routeName || routes.find(r => r.id === bus.routeId)?.shortName || bus.routeId;
      const code = bus.routeCode || '?';
      const busLabel = bus.id.replace('sim-', '').toUpperCase();
      const etaText = bus.eta ? (typeof bus.eta === 'number' ? Math.round(bus.eta) : bus.eta) : null;

      const pillIcon = L.divIcon({
        className: '',
        html: `<div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 2px 3px rgba(0,0,0,0.3))"><span style="font-size:24px;line-height:1">🚌</span><span style="background:${color};color:white;font-size:9px;font-weight:700;padding:1px 5px;border-radius:6px;margin-top:-2px;border:1.5px solid white">${code}</span></div>`,
        iconSize: [32, 36],
        iconAnchor: [16, 36],
      });

      const marker = L.marker([bus.latitude, bus.longitude], { icon: pillIcon })
        .addTo(map).bindPopup(
          `<div style="font-family:sans-serif;">` +
          `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">` +
          `<div style="width:10px;height:10px;border-radius:50%;background:${color};"></div>` +
          `<b>${routeName}</b></div>` +
          `<span style="font-size:11px;color:#666;">Bus: ${busLabel}</span><br/>` +
          `<span style="font-size:11px;color:#666;">Speed: ${Math.round(bus.speedKmH || 0)} km/h</span><br/>` +
          `<span style="font-size:11px;color:#666;">Next: ${bus.nextStop}</span>` +
          (etaText ? `<br/><b style="font-size:11px;color:#2563eb;">ETA: ${etaText} min</b>` : '') +
          (bus.isDeviating ? `<br/><b style="font-size:11px;color:#f97316;">Heavy Traffic</b>` : '') +
          `</div>`
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

    // Only show a route polyline when explicitly selected (not all 27 by default)
    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }
    if (routePolyline && routePolyline.length > 0) {
      polylineRef.current = L.polyline(routePolyline, {
        color: '#3b82f6', weight: 4, opacity: 0.8,
      }).addTo(map);
      map.fitBounds(polylineRef.current.getBounds(), { padding: [50, 50] });
    } else {
      map.setView(center, 14);
    }
  }, [mapReady, userLocation, buses, busStops, searchedLocation, routePolyline, routes, center]);

  return (
    <div className="w-full h-full absolute inset-0 z-0">
      <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
    </div>
  );
}
