import React, { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, getRedirectResult } from 'firebase/auth';
import { auth } from './firebase';
import { useStore } from './store/useStore';
import SplashScreen from './components/SplashScreen';
import Onboarding from './components/Onboarding';
import OfflineIndicator from './components/OfflineIndicator';

// Lazy-loaded pages for code splitting
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const RoutesPage = lazy(() => import('./pages/RoutesPage'));
const RouteDetailPage = lazy(() => import('./pages/RouteDetailPage'));
const AlertsPage = lazy(() => import('./pages/AlertsPage'));
const FavoritesPage = lazy(() => import('./pages/FavoritesPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const Layout = lazy(() => import('./components/Layout'));

function PageLoader() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );
}

export default function App() {
  const { user, setUser, isAuthReady, setAuthReady } = useStore();
  const [showSplash, setShowSplash] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem('hanobus_onboarding_done');
  });

  useEffect(() => {
    // Handle redirect result from signInWithRedirect
    getRedirectResult(auth).catch(() => {});

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, [setUser, setAuthReady]);

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  if (showOnboarding) {
    return <Onboarding onComplete={() => {
      localStorage.setItem('hanobus_onboarding_done', 'true');
      setShowOnboarding(false);
    }} />;
  }

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-blue-600 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <Router>
      <OfflineIndicator />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route
            path="/login"
            element={!user ? <Login /> : <Navigate to="/" />}
          />

          {/* Authenticated Routes with Layout */}
          <Route element={user ? <Layout /> : <Navigate to="/login" />}>
            <Route path="/" element={<Home />} />
            <Route path="/routes" element={<RoutesPage />} />
            <Route path="/routes/:routeId" element={<RouteDetailPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/favorites" element={<FavoritesPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Route>
        </Routes>
      </Suspense>
    </Router>
  );
}
