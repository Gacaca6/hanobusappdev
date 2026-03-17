import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useStore } from '../store/useStore';

// Fix for default marker icons in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const busIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const deviatingBusIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const searchIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const stopIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [20, 32],
  iconAnchor: [10, 32],
  popupAnchor: [1, -28],
  shadowSize: [32, 32]
});

const userIcon = new L.DivIcon({
  className: 'custom-user-icon',
  html: `<div style="background-color: #3b82f6; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

function MapUpdater({ center, polyline }: { center: [number, number], polyline: [number, number][] | null }) {
  const map = useMap();
  useEffect(() => {
    if (polyline && polyline.length > 0) {
      const bounds = L.latLngBounds(polyline);
      map.fitBounds(bounds, { padding: [50, 50] });
    } else {
      map.setView(center, map.getZoom());
    }
  }, [center, polyline, map]);
  return null;
}

interface MapProps {
  userLocation: [number, number] | null;
  buses: any[];
}

export default function Map({ userLocation, buses }: MapProps) {
  const defaultCenter: [number, number] = [-1.9441, 30.0619]; // Kigali center
  const { searchedLocation, busStops, routePolyline, routes } = useStore();
  const centerToUse = searchedLocation ? [searchedLocation.lat, searchedLocation.lng] as [number, number] : (userLocation || defaultCenter);

  return (
    <div className="w-full h-full absolute inset-0 z-0 pb-16">
      <MapContainer 
        center={centerToUse} 
        zoom={14} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapUpdater center={centerToUse} polyline={routePolyline} />

        {routePolyline && (
          <Polyline 
            positions={routePolyline} 
            color="#3b82f6" 
            weight={5} 
            opacity={0.7} 
            dashArray="10, 10" 
          />
        )}

        {userLocation && (
          <Marker position={userLocation} icon={userIcon}>
            <Popup>You are here</Popup>
          </Marker>
        )}

        {busStops.map((stop) => {
          const stopRoutes = stop.routeIds 
            ? routes.filter(r => stop.routeIds?.includes(r.id))
            : [];
            
          return (
            <Marker 
              key={stop.id} 
              position={[stop.latitude, stop.longitude]}
              icon={stopIcon}
            >
              <Popup>
                <div className="font-sans min-w-[150px]">
                  <h3 className="font-bold text-sm mb-1">{stop.name}</h3>
                  <p className="text-xs text-gray-500 mb-2">Bus Stop</p>
                  {stopRoutes.length > 0 ? (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-gray-700 border-b pb-1">Connecting Routes:</p>
                      {stopRoutes.map(route => (
                        <div key={route.id} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                          {route.routeName}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">No route info available</p>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {searchedLocation && (
          <Marker position={[searchedLocation.lat, searchedLocation.lng]} icon={searchIcon}>
            <Popup>
              <div className="font-sans">
                <h3 className="font-bold text-sm">{searchedLocation.name}</h3>
                {searchedLocation.description && <p className="text-xs text-gray-600">{searchedLocation.description}</p>}
              </div>
            </Popup>
          </Marker>
        )}

        {buses.map((bus) => (
          <Marker 
            key={bus.id} 
            position={[bus.latitude, bus.longitude]}
            icon={bus.isDeviating ? deviatingBusIcon : busIcon}
          >
            <Popup>
              <div className="font-sans">
                <h3 className="font-bold text-sm">Route: {bus.routeId}</h3>
                <p className="text-xs text-gray-600">Speed: {Math.round(bus.speedKmH || 0)} km/h</p>
                <p className="text-xs text-gray-600">Next stop: {bus.nextStop}</p>
                {bus.isDeviating && <p className="text-xs text-orange-600 font-bold mt-1">⚠️ Heavy Traffic / Deviating</p>}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
