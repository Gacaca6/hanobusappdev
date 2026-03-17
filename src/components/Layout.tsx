import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';
import { useStore } from '../store/useStore';
import { subscribeToRoutes, subscribeToBuses, subscribeToAlerts, subscribeToBusStops, subscribeToFavorites, seedDatabaseIfEmpty, Alert } from '../services/transitService';
import { checkForNewAlerts } from '../services/notificationService';

export default function Layout() {
  const { setRoutes, setBuses, setAlerts, setBusStops, setFavorites, user } = useStore();

  useEffect(() => {
    seedDatabaseIfEmpty();

    const unsubscribeRoutes = subscribeToRoutes(setRoutes);
    const unsubscribeBuses = subscribeToBuses(setBuses);
    const unsubscribeAlerts = subscribeToAlerts((alerts: Alert[]) => {
      setAlerts(alerts);
      checkForNewAlerts(alerts);
    });
    const unsubscribeBusStops = subscribeToBusStops(setBusStops);

    let unsubscribeFavorites: (() => void) | undefined;
    if (user) {
      unsubscribeFavorites = subscribeToFavorites(user.uid, setFavorites);
    }

    return () => {
      unsubscribeRoutes();
      unsubscribeBuses();
      unsubscribeAlerts();
      unsubscribeBusStops();
      unsubscribeFavorites?.();
    };
  }, [setRoutes, setBuses, setAlerts, setBusStops, setFavorites, user]);

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-100">
      <div className="flex-1 overflow-y-auto" style={{ paddingBottom: 'calc(78px + env(safe-area-inset-bottom, 8px))' }}>
        <Outlet />
      </div>
      <BottomNav />
    </div>
  );
}
