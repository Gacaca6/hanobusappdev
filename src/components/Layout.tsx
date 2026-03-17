import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';
import { useStore } from '../store/useStore';
import { subscribeToRoutes, subscribeToBuses, subscribeToAlerts, subscribeToBusStops, seedDatabaseIfEmpty } from '../services/transitService';

export default function Layout() {
  const { setRoutes, setBuses, setAlerts, setBusStops } = useStore();

  useEffect(() => {
    // Seed database if empty (for demo purposes)
    seedDatabaseIfEmpty();

    // Subscribe to real-time data
    const unsubscribeRoutes = subscribeToRoutes(setRoutes);
    const unsubscribeBuses = subscribeToBuses(setBuses);
    const unsubscribeAlerts = subscribeToAlerts(setAlerts);
    const unsubscribeBusStops = subscribeToBusStops(setBusStops);

    return () => {
      unsubscribeRoutes();
      unsubscribeBuses();
      unsubscribeAlerts();
      unsubscribeBusStops();
    };
  }, [setRoutes, setBuses, setAlerts, setBusStops]);

  return (
    <div className="relative h-screen w-full overflow-hidden bg-gray-100">
      <div className="h-full w-full pb-16">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  );
}
