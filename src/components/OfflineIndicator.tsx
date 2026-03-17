import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WifiOff, Wifi } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useTranslation } from '../i18n/useTranslation';

export default function OfflineIndicator() {
  const { isOnline, setIsOnline } = useStore();
  const { t } = useTranslation();
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      setTimeout(() => setShowReconnected(false), 3000);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setIsOnline]);

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 200 }}
          className="fixed top-0 left-0 right-0 z-[300] bg-gray-800 text-white px-4 py-3 flex items-center gap-3 shadow-lg"
        >
          <WifiOff className="w-5 h-5 text-orange-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">{t('offlineTitle')}</p>
            <p className="text-xs text-gray-300 truncate">{t('offlineMessage')}</p>
          </div>
        </motion.div>
      )}
      {showReconnected && isOnline && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 200 }}
          className="fixed top-0 left-0 right-0 z-[300] bg-green-600 text-white px-4 py-3 flex items-center gap-3 shadow-lg"
        >
          <Wifi className="w-5 h-5 shrink-0" />
          <p className="text-sm font-semibold">{t('backOnline')}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
