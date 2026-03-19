import React, { useState, useEffect } from 'react';
import { Heart, MapPin, Plus, Trash2, Home, Briefcase, Star, X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useTranslation } from '../i18n/useTranslation';
import { addFavorite, removeFavorite } from '../services/transitService';

function FavoriteSkeletons() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="skeleton h-12 w-12 rounded-full shrink-0" />
          <div className="flex-1">
            <div className="skeleton h-4 w-2/4 mb-2" />
            <div className="skeleton h-3 w-3/5" />
          </div>
          <div className="skeleton h-8 w-8 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export default function FavoritesPage() {
  const { favorites, user, busStops } = useStore();
  const { t } = useTranslation();
  const [showAdd, setShowAdd] = useState(false);
  const [newFav, setNewFav] = useState({ name: '', address: '', type: 'other' as 'home' | 'work' | 'other' });
  const [selectedStop, setSelectedStop] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (favorites.length > 0) {
      setIsLoading(false);
    } else {
      const timer = setTimeout(() => setIsLoading(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [favorites]);

  const handleAdd = async () => {
    if (!user || !newFav.name.trim()) return;
    setLoading(true);
    try {
      let lat = -1.9441, lng = 30.0619;
      if (selectedStop) {
        const stop = busStops.find(s => s.id === selectedStop);
        if (stop) { lat = stop.latitude; lng = stop.longitude; }
      }
      await addFavorite(user.uid, {
        name: newFav.name,
        address: newFav.address || 'Kigali, Rwanda',
        latitude: lat,
        longitude: lng,
        type: newFav.type,
      });
      setNewFav({ name: '', address: '', type: 'other' });
      setSelectedStop('');
      setShowAdd(false);
    } catch (error) {
      console.error('Error adding favorite:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (favId: string) => {
    if (!user) return;
    try {
      await removeFavorite(user.uid, favId);
    } catch (error) {
      console.error('Error removing favorite:', error);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'home': return <Home className="h-5 w-5 text-blue-500" />;
      case 'work': return <Briefcase className="h-5 w-5 text-green-500" />;
      default: return <Star className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getBgColor = (type: string) => {
    switch (type) {
      case 'home': return 'bg-blue-50';
      case 'work': return 'bg-green-50';
      default: return 'bg-yellow-50';
    }
  };

  return (
    <div className="min-h-full bg-gray-50 flex flex-col">
      <div className="bg-blue-600 px-6 pb-6 text-white shadow-md flex justify-between items-center" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}>
        <div>
          <h1 className="text-2xl font-bold">{t('favorites')}</h1>
          <p className="text-blue-100 mt-1">{t('yourSavedLocations')}</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="h-10 w-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
        >
          {showAdd ? <X className="h-6 w-6 text-white" /> : <Plus className="h-6 w-6 text-white" />}
        </button>
      </div>

      <div className="p-4 flex-1 overflow-y-auto pb-4">
        {/* Add Favorite Form */}
        {showAdd && (
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-4">
            <h3 className="font-semibold text-gray-900 mb-3">{t('addNewFavorite')}</h3>
            <input
              type="text"
              value={newFav.name}
              onChange={(e) => setNewFav({ ...newFav, name: e.target.value })}
              placeholder={t('namePlaceholder')}
              className="w-full px-4 py-3 bg-gray-50 rounded-xl mb-3 text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none"
            />
            <input
              type="text"
              value={newFav.address}
              onChange={(e) => setNewFav({ ...newFav, address: e.target.value })}
              placeholder={t('addressPlaceholder')}
              className="w-full px-4 py-3 bg-gray-50 rounded-xl mb-3 text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none"
            />
            <select
              value={selectedStop}
              onChange={(e) => setSelectedStop(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 rounded-xl mb-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">{t('selectNearestStop')}</option>
              {busStops.map(stop => (
                <option key={stop.id} value={stop.id}>{stop.name}</option>
              ))}
            </select>
            <div className="flex gap-2 mb-3">
              {(['home', 'work', 'other'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setNewFav({ ...newFav, type })}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium capitalize transition-colors ${
                    newFav.type === type ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {t(`${type}Type` as 'homeType' | 'workType' | 'otherType')}
                </button>
              ))}
            </div>
            <button
              onClick={handleAdd}
              disabled={!newFav.name.trim() || loading}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? t('saving') : t('saveFavorite')}
            </button>
          </div>
        )}

        {/* Favorites List */}
        <div className="space-y-3">
          {isLoading ? (
            <FavoriteSkeletons />
          ) : favorites.length > 0 ? (
            favorites.map((fav) => (
              <div key={fav.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 ${getBgColor(fav.type)}`}>
                    {getIcon(fav.type)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{fav.name}</h3>
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3" /> {fav.address}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemove(fav.id)}
                  className="p-2 hover:bg-red-50 rounded-full transition-colors"
                >
                  <Trash2 className="h-4 w-4 text-red-400" />
                </button>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <Heart className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">{t('noFavorites')}</p>
              <p className="text-sm text-gray-400 mt-1">{t('tapToAdd')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
