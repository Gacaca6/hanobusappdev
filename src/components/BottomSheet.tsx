import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, MapPin, Navigation, Clock, AlertTriangle } from 'lucide-react';
import { searchDestination, calculateRouteETA } from '../services/geminiService';
import { useStore } from '../store/useStore';

export default function BottomSheet() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { setSearchedLocation } = useStore();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      const res = await searchDestination(query);
      setResult(res);
      if (res.locations && res.locations.length > 0) {
        setSearchedLocation(res.locations[0]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleLocationClick = (loc: any) => {
    setSearchedLocation(loc);
    setIsOpen(false);
  };

  return (
    <motion.div 
      className="absolute bottom-16 left-0 right-0 bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-10 overflow-hidden"
      initial={{ y: 'calc(100% - 200px)' }}
      animate={{ y: isOpen ? '0%' : 'calc(100% - 200px)' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
    >
      <div 
        className="w-full h-12 flex items-center justify-center cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
      </div>

      <div className="px-6 pb-8 h-[60vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Where to?</h2>
        
        <form onSubmit={handleSearch} className="relative mb-6">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="block w-full pl-11 pr-4 py-4 bg-gray-100 border-transparent rounded-2xl text-gray-900 placeholder-gray-500 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition-all"
            placeholder="Search destination (e.g. Kimironko Market)"
            onClick={() => setIsOpen(true)}
          />
        </form>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}

        {result && !loading && (
          <div className="space-y-4">
            {result.locations?.length > 0 ? (
              <div className="mt-4">
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Suggested Locations</h4>
                <ul className="space-y-3">
                  {result.locations.map((loc: any, idx: number) => (
                    <li 
                      key={idx} 
                      onClick={() => handleLocationClick(loc)}
                      className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors"
                    >
                      <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
                        <MapPin className="h-5 w-5 text-gray-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{loc.name || 'Location'}</p>
                        <p className="text-xs text-gray-500 truncate">{loc.description}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                <p className="text-sm text-gray-600">{result.text}</p>
              </div>
            )}
          </div>
        )}

        {!result && !loading && (
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Recent Searches</h4>
            <div className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors">
              <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Nyabugogo Bus Terminal</p>
                <p className="text-xs text-gray-500">Kigali, Rwanda</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors">
              <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Remera Taxi Park</p>
                <p className="text-xs text-gray-500">Kigali, Rwanda</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
