import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bus, Clock, MapPin, Navigation, Timer, Activity, Users, Zap, BadgeCheck, AlertTriangle, Heart } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useTranslation } from '../i18n/useTranslation';
import { calculateETA, addFavorite, removeFavorite } from '../services/transitService';
import { ALL_ROUTES, QueueTheory, RESEARCH_CONSTANTS } from '../data/hanobus_routes';
import type { Route as DataRoute } from '../data/hanobus_routes';

// Check if current time falls within any of the route's peak hours
function isPeakHour(peakHours: string[]): boolean {
  const now = new Date();
  const currentMin = now.getHours() * 60 + now.getMinutes();
  for (const range of peakHours) {
    const [start, end] = range.split('-');
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    if (currentMin >= startMin && currentMin <= endMin) return true;
  }
  return false;
}

// Calculate live queue theory stats for a route
function getRouteStats(route: DataRoute) {
  const isPeak = isPeakHour(route.peakHours);
  const baseArrivalRate = route.avgArrivalRatePerMin ?? RESEARCH_CONSTANTS.avgArrivalRatePerMin;
  const lambda = isPeak ? baseArrivalRate * 1.5 : baseArrivalRate;
  const boardingTime = route.avgBoardingTimeMin ?? RESEARCH_CONSTANTS.avgBoardingTimeMin;

  const N = route.avgBusesPerDay;
  const Bc = route.avgBusCapacity;
  const T = route.estimatedTravelTimeMin;

  const mu = QueueTheory.servingRate(N, Bc, T, boardingTime);
  const rho = QueueTheory.utilization(lambda, mu);
  const waitQueue = QueueTheory.avgWaitQueue(lambda, mu);
  const inQueue = QueueTheory.avgInQueue(rho);
  const headway = QueueTheory.headway(T, boardingTime, N);

  return {
    isPeak,
    lambda: Math.round(lambda * 10) / 10,
    mu: Math.round(mu * 10) / 10,
    utilization: Math.min(Math.round(rho * 1000) / 10, 100),
    waitMin: rho >= 1 ? null : Math.round(waitQueue * 10) / 10,
    queueSize: rho >= 1 ? null : Math.round(inQueue * 10) / 10,
    headwayMin: Math.round(headway * 10) / 10,
    isOverloaded: rho >= 1,
    isBaseline: route.isResearchBaseline === true,
  };
}

export default function RouteDetailPage() {
  const { routeId } = useParams<{ routeId: string }>();
  const navigate = useNavigate();
  const { buses, busStops, favorites, user } = useStore();
  const { t } = useTranslation();
  const [favLoading, setFavLoading] = useState(false);

  const route = useMemo(() => ALL_ROUTES.find(r => r.id === routeId), [routeId]);

  // Check if this route is already favorited
  const existingFav = useMemo(() => {
    if (!route) return null;
    return favorites.find(f => f.name === route.shortName && (f as any).type === 'route') || null;
  }, [favorites, route]);

  const isFavorited = !!existingFav;

  const toggleFavorite = async () => {
    if (!user || !route || favLoading) return;
    setFavLoading(true);
    try {
      if (existingFav) {
        await removeFavorite(user.uid, existingFav.id);
      } else {
        await addFavorite(user.uid, {
          name: route.shortName,
          address: route.name,
          type: 'other' as const,
          latitude: route.stops[0].lat,
          longitude: route.stops[0].lng,
        });
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    } finally {
      setFavLoading(false);
    }
  };

  const stats = useMemo(() => route ? getRouteStats(route) : null, [route]);

  const routeBuses = useMemo(() => {
    if (!route) return [];
    const firestoreRouteId = `route-${route.id}`;
    return buses.filter(b => b.routeId === firestoreRouteId).map(bus => {
      const nextStop = busStops.find(s => s.name === bus.nextStop);
      let eta: number | null = null;
      if (nextStop) {
        eta = calculateETA(bus.latitude, bus.longitude, nextStop.latitude, nextStop.longitude, bus.speedKmH || 20);
      }
      return { ...bus, eta };
    });
  }, [route, buses, busStops]);

  if (!route || !stats) {
    return (
      <div className="min-h-full bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">{t('noRoutesFound')}</p>
          <button onClick={() => navigate('/routes')} className="mt-4 text-blue-600 font-medium">
            ← {t('busRoutes')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-50 flex flex-col">
      {/* Header with route color bar */}
      <div className="relative">
        {/* Safe area spacer + Color bar at top */}
        <div className="bg-white" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }} />
        <div className="h-1.5 w-full" style={{ backgroundColor: route.color }} />

        <div className="bg-white px-4 pt-4 pb-4 shadow-sm">
          {/* Back button */}
          <button
            onClick={() => navigate('/routes')}
            className="flex items-center gap-1.5 text-gray-600 mb-3 -ml-1 active:opacity-60"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">{t('busRoutes')}</span>
          </button>

          {/* Route code + name + favorite */}
          <div className="flex items-center gap-3">
            <div
              className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm"
              style={{ backgroundColor: route.color + '18', border: `2px solid ${route.color}` }}
            >
              <span className="text-base font-extrabold" style={{ color: route.color }}>{route.code}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-gray-900 leading-tight">{route.shortName}</h1>
              <p className="text-sm text-gray-500 mt-0.5 truncate">{route.name}</p>
            </div>
            <button
              onClick={toggleFavorite}
              disabled={favLoading}
              className="h-10 w-10 rounded-full flex items-center justify-center shrink-0 transition-colors active:scale-90 disabled:opacity-50"
              style={{ backgroundColor: isFavorited ? '#fef2f2' : '#f3f4f6' }}
            >
              <Heart
                className={`w-5 h-5 transition-colors ${isFavorited ? 'text-red-500 fill-red-500' : 'text-gray-400'}`}
              />
            </button>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {stats.isBaseline && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-200">
                <BadgeCheck className="w-3 h-3" /> {t('researchVerified')}
              </span>
            )}
            {stats.isPeak && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-full border border-amber-200">
                <Zap className="w-3 h-3" /> {t('peakHours')}
              </span>
            )}
            {stats.isOverloaded && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-700 text-[10px] font-bold rounded-full border border-red-200">
                <Activity className="w-3 h-3" /> Congested
              </span>
            )}
            {routeBuses.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 text-[10px] font-bold rounded-full border border-green-200">
                <Bus className="w-3 h-3" /> {routeBuses.length} {t('activeBuses')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Peak hours warning banner */}
      {stats.isPeak && (
        <div className="mx-4 mt-3 flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800 font-medium">{t('peakWarning')}</p>
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Route info row */}
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-white rounded-xl p-3 text-center shadow-sm border border-gray-100">
            <Navigation className="w-4 h-4 mx-auto mb-1" style={{ color: route.color }} />
            <p className="text-lg font-bold text-gray-900">{route.distanceKm}</p>
            <p className="text-[10px] text-gray-500 uppercase">km</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center shadow-sm border border-gray-100">
            <Clock className="w-4 h-4 mx-auto mb-1" style={{ color: route.color }} />
            <p className="text-lg font-bold text-gray-900">{Math.round(route.estimatedTravelTimeMin)}</p>
            <p className="text-[10px] text-gray-500 uppercase">min</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center shadow-sm border border-gray-100">
            <Timer className="w-4 h-4 mx-auto mb-1" style={{ color: route.color }} />
            <p className="text-lg font-bold text-gray-900">{route.avgHeadwayMin}</p>
            <p className="text-[10px] text-gray-500 uppercase">{t('headway')}</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center shadow-sm border border-gray-100">
            <Bus className="w-4 h-4 mx-auto mb-1" style={{ color: route.color }} />
            <p className="text-lg font-bold text-gray-900">{route.avgBusesPerDay}</p>
            <p className="text-[10px] text-gray-500 uppercase">{t('busesDay')}</p>
          </div>
        </div>

        {/* Stops Timeline */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" /> {t('stops')} ({route.stops.length})
          </p>

          <div className="relative ml-1">
            {route.stops.map((stop, idx) => {
              const isFirst = idx === 0;
              const isLast = idx === route.stops.length - 1;
              const isTerminal = stop.isTerminal;

              return (
                <div key={idx} className="relative flex items-start gap-3 pb-0">
                  {/* Vertical line */}
                  {idx < route.stops.length - 1 && (
                    <div
                      className="absolute left-[9px] top-[18px] w-[2px]"
                      style={{
                        backgroundColor: route.color,
                        height: '100%',
                        opacity: 0.5,
                      }}
                    />
                  )}

                  {/* Circle */}
                  <div className="relative z-10 shrink-0 flex items-center justify-center" style={{ width: 20, height: 20 }}>
                    {isTerminal ? (
                      <div
                        className="rounded-full border-[3px] shadow-sm"
                        style={{
                          width: 18,
                          height: 18,
                          backgroundColor: route.color,
                          borderColor: route.color,
                        }}
                      />
                    ) : (
                      <div
                        className="rounded-full border-2 bg-white"
                        style={{
                          width: 12,
                          height: 12,
                          borderColor: route.color,
                        }}
                      />
                    )}
                  </div>

                  {/* Stop name */}
                  <div className={`pb-5 ${isTerminal ? 'pt-0' : 'pt-0.5'}`}>
                    <p className={`text-sm ${isTerminal ? 'font-bold text-gray-900' : 'text-gray-700'}`}>
                      {stop.name}
                    </p>
                    {isTerminal && (isFirst || isLast) && (
                      <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wide">
                        {isFirst ? t('startTerminal') : t('endTerminal')}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Active buses */}
        {routeBuses.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Bus className="w-3.5 h-3.5" /> {t('activeBusesLabel')}
            </p>
            <div className="space-y-2">
              {routeBuses.map(bus => (
                <div key={bus.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${bus.isDeviating ? 'bg-orange-100' : 'bg-green-100'}`}>
                      <Bus className={`w-4 h-4 ${bus.isDeviating ? 'text-orange-600' : 'text-green-600'}`} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{bus.id.toUpperCase()}</p>
                      <p className="text-xs text-gray-500">
                        {Math.round(bus.speedKmH || 0)} {t('kmh')} • {t('nextStop')}: {bus.nextStop}
                      </p>
                    </div>
                  </div>
                  {bus.eta && (
                    <div className="flex items-center gap-1 text-blue-600">
                      <Clock className="w-3.5 h-3.5" />
                      <span className="text-sm font-bold">{bus.eta} min</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Live Stats Card */}
        <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl p-4 border border-blue-100 shadow-sm">
          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5" /> {t('liveQueueStats')}
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            {/* Wait time */}
            <div className="bg-white rounded-xl p-3 shadow-sm">
              <div className="flex items-center gap-1.5 mb-1">
                <Timer className="w-4 h-4 text-blue-500" />
                <span className="text-[10px] text-gray-500 uppercase">{t('estimatedWait')}</span>
              </div>
              <p className="text-xl font-bold text-gray-900">
                {stats.waitMin !== null ? `${stats.waitMin}` : '---'}
                <span className="text-xs font-normal text-gray-400 ml-0.5">min</span>
              </p>
            </div>

            {/* Utilization */}
            <div className="bg-white rounded-xl p-3 shadow-sm">
              <div className="flex items-center gap-1.5 mb-1">
                <Activity className="w-4 h-4 text-purple-500" />
                <span className="text-[10px] text-gray-500 uppercase">{t('systemLoad')}</span>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-xl font-bold text-gray-900">{stats.utilization}<span className="text-xs font-normal text-gray-400">%</span></p>
                <div className={`w-3 h-3 rounded-full ${
                  stats.utilization < 70 ? 'bg-green-500' :
                  stats.utilization < 85 ? 'bg-yellow-500' : 'bg-red-500'
                }`} />
              </div>
            </div>

            {/* Next bus */}
            <div className="bg-white rounded-xl p-3 shadow-sm">
              <div className="flex items-center gap-1.5 mb-1">
                <Bus className="w-4 h-4 text-green-500" />
                <span className="text-[10px] text-gray-500 uppercase">{t('nextBus')}</span>
              </div>
              <p className="text-xl font-bold text-gray-900">
                {stats.headwayMin}<span className="text-xs font-normal text-gray-400 ml-0.5">min</span>
              </p>
            </div>

            {/* Queue size */}
            <div className="bg-white rounded-xl p-3 shadow-sm">
              <div className="flex items-center gap-1.5 mb-1">
                <Users className="w-4 h-4 text-orange-500" />
                <span className="text-[10px] text-gray-500 uppercase">{t('inQueue')}</span>
              </div>
              <p className="text-xl font-bold text-gray-900">
                {stats.queueSize !== null ? `${stats.queueSize}` : '---'}
                <span className="text-xs font-normal text-gray-400 ml-0.5">pax</span>
              </p>
            </div>
          </div>

          {/* Rate info */}
          <div className="mt-3 flex items-center justify-between text-[10px] text-gray-400">
            <span>{t('arrivalRate')}: {stats.lambda} pax/min</span>
            <span>{t('serviceRate')}: {stats.mu} pax/min</span>
          </div>
        </div>
      </div>
    </div>
  );
}
