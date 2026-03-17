import React from 'react';
import { Heart, MapPin, Plus } from 'lucide-react';

export default function FavoritesPage() {
  const favorites = [
    { id: '1', name: 'Home', address: 'Kibagabaga, Kigali', icon: 'home' },
    { id: '2', name: 'Work', address: 'Kigali Heights, CBD', icon: 'briefcase' },
    { id: '3', name: 'Gym', address: 'Waka Fitness, Kimihurura', icon: 'activity' },
  ];

  return (
    <div className="h-full bg-gray-50 flex flex-col">
      <div className="bg-blue-600 px-6 pt-12 pb-6 text-white shadow-md flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Favorites</h1>
          <p className="text-blue-100 mt-1">Your saved locations</p>
        </div>
        <button className="h-10 w-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors">
          <Plus className="h-6 w-6 text-white" />
        </button>
      </div>
      
      <div className="p-4 flex-1 overflow-y-auto pb-24">
        <div className="space-y-4">
          {favorites.map((fav) => (
            <div key={fav.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-red-50 rounded-full flex items-center justify-center shrink-0">
                  <Heart className="h-6 w-6 text-red-500 fill-red-100" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{fav.name}</h3>
                  <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3" /> {fav.address}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
