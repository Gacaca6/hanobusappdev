import React, { useState } from 'react';
import { MapIcon, Search, Navigation } from 'lucide-react';
import { useStore } from '../store/useStore';

export default function RoutesPage() {
  const { routes } = useStore();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRoutes = routes.filter(route => 
    route.routeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    route.startLocation.toLowerCase().includes(searchQuery.toLowerCase()) ||
    route.endLocation.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full bg-gray-50 flex flex-col">
      <div className="bg-blue-600 px-6 pt-12 pb-6 text-white shadow-md">
        <h1 className="text-2xl font-bold">Bus Routes</h1>
        <p className="text-blue-100 mt-1">Find your way across Kigali</p>
      </div>
      
      <div className="p-4 flex-1 overflow-y-auto pb-24">
        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
            placeholder="Search routes..."
          />
        </div>

        <div className="space-y-4">
          {filteredRoutes.length > 0 ? (
            filteredRoutes.map((route) => (
              <div key={route.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-blue-50 rounded-full flex items-center justify-center shrink-0">
                    <MapIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{route.routeName}</h3>
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                      <Navigation className="h-3 w-3" /> {route.avgTravelTimeMins ? `${route.avgTravelTimeMins} min` : 'N/A'} • {route.distanceKm ? `${route.distanceKm} km` : 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="px-3 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full">
                  Active
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              No routes found matching your search.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
