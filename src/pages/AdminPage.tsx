import React, { useState } from 'react';
import { doc, setDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useStore } from '../store/useStore';
import { useTranslation } from '../i18n/useTranslation';
import { Route, Bus, Alert } from '../services/transitService';
import { Shield, MapPin, Bus as BusIcon, Bell, Plus, Trash2, Edit2, X, Save, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type Tab = 'routes' | 'buses' | 'alerts';

export default function AdminPage() {
  const { routes, buses, alerts, busStops } = useStore();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('routes');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Route form
  const [routeForm, setRouteForm] = useState({ routeName: '', startLocation: '', endLocation: '', distanceKm: '', avgTravelTimeMins: '' });
  // Alert form
  const [alertForm, setAlertForm] = useState({ message: '', severity: 'low' as 'low' | 'medium' | 'high', routeId: '' });
  // Bus form
  const [busForm, setBusForm] = useState({ routeId: '', nextStop: '' });

  const handleDeleteRoute = async (id: string) => {
    if (!confirm(t('confirmDelete'))) return;
    try { await deleteDoc(doc(db, 'routes', id)); } catch (e) { console.error(e); }
  };

  const handleDeleteBus = async (id: string) => {
    if (!confirm(t('confirmDelete'))) return;
    try { await deleteDoc(doc(db, 'buses', id)); } catch (e) { console.error(e); }
  };

  const handleDeleteAlert = async (id: string) => {
    if (!confirm(t('confirmDelete'))) return;
    try { await deleteDoc(doc(db, 'alerts', id)); } catch (e) { console.error(e); }
  };

  const handleAddRoute = async () => {
    if (!routeForm.routeName.trim()) return;
    const id = `route-${Date.now()}`;
    try {
      await setDoc(doc(db, 'routes', id), {
        routeName: routeForm.routeName,
        startLocation: routeForm.startLocation,
        endLocation: routeForm.endLocation,
        distanceKm: routeForm.distanceKm ? Number(routeForm.distanceKm) : null,
        avgTravelTimeMins: routeForm.avgTravelTimeMins ? Number(routeForm.avgTravelTimeMins) : null,
      });
      setRouteForm({ routeName: '', startLocation: '', endLocation: '', distanceKm: '', avgTravelTimeMins: '' });
      setShowAddForm(false);
    } catch (e) { console.error(e); }
  };

  const handleAddAlert = async () => {
    if (!alertForm.message.trim()) return;
    const id = `alert-${Date.now()}`;
    try {
      await setDoc(doc(db, 'alerts', id), {
        message: alertForm.message,
        severity: alertForm.severity,
        routeId: alertForm.routeId || null,
        timestamp: Timestamp.now(),
      });
      setAlertForm({ message: '', severity: 'low', routeId: '' });
      setShowAddForm(false);
    } catch (e) { console.error(e); }
  };

  const handleAddBus = async () => {
    if (!busForm.routeId) return;
    const id = `bus-${Date.now()}`;
    const stop = busStops.find(s => s.name === busForm.nextStop) || busStops[0];
    try {
      await setDoc(doc(db, 'buses', id), {
        routeId: busForm.routeId,
        latitude: stop?.latitude || -1.9441,
        longitude: stop?.longitude || 30.0619,
        speedKmH: 0,
        lastUpdated: Timestamp.now(),
        nextStop: busForm.nextStop || stop?.name || '',
        isDeviating: false,
      });
      setBusForm({ routeId: '', nextStop: '' });
      setShowAddForm(false);
    } catch (e) { console.error(e); }
  };

  const handleEditRoute = async (route: Route) => {
    try {
      await setDoc(doc(db, 'routes', route.id), {
        routeName: routeForm.routeName || route.routeName,
        startLocation: routeForm.startLocation || route.startLocation,
        endLocation: routeForm.endLocation || route.endLocation,
        distanceKm: routeForm.distanceKm ? Number(routeForm.distanceKm) : route.distanceKm,
        avgTravelTimeMins: routeForm.avgTravelTimeMins ? Number(routeForm.avgTravelTimeMins) : route.avgTravelTimeMins,
        ...(route.orderedStopIds ? { orderedStopIds: route.orderedStopIds } : {}),
      });
      setEditingId(null);
      setRouteForm({ routeName: '', startLocation: '', endLocation: '', distanceKm: '', avgTravelTimeMins: '' });
    } catch (e) { console.error(e); }
  };

  const handleEditAlert = async (alert: Alert) => {
    try {
      await setDoc(doc(db, 'alerts', alert.id), {
        message: alertForm.message || alert.message,
        severity: alertForm.severity || alert.severity,
        routeId: alertForm.routeId || alert.routeId || null,
        timestamp: alert.timestamp,
      });
      setEditingId(null);
      setAlertForm({ message: '', severity: 'low', routeId: '' });
    } catch (e) { console.error(e); }
  };

  const tabs: { key: Tab; icon: React.ReactNode; label: string }[] = [
    { key: 'routes', icon: <MapPin className="w-4 h-4" />, label: t('manageRoutes') },
    { key: 'buses', icon: <BusIcon className="w-4 h-4" />, label: t('manageBuses') },
    { key: 'alerts', icon: <Bell className="w-4 h-4" />, label: t('manageAlerts') },
  ];

  return (
    <div className="min-h-full bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 px-6 pt-12 pb-6 text-white shadow-md">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate('/profile')} className="p-1 hover:bg-white/10 rounded-full">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <Shield className="w-6 h-6 text-yellow-400" />
          <h1 className="text-2xl font-bold">{t('adminPanel')}</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setShowAddForm(false); setEditingId(null); }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                activeTab === tab.key ? 'bg-white text-gray-900' : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 flex-1 overflow-y-auto pb-4">
        {/* Add button */}
        <button
          onClick={() => { setShowAddForm(!showAddForm); setEditingId(null); }}
          className="w-full mb-4 py-3 bg-blue-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors"
        >
          {showAddForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          {showAddForm ? t('cancel') : activeTab === 'routes' ? t('addRoute') : activeTab === 'buses' ? t('addBus') : t('addAlert')}
        </button>

        {/* Add Forms */}
        {showAddForm && activeTab === 'routes' && (
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-4 space-y-3">
            <input value={routeForm.routeName} onChange={e => setRouteForm({ ...routeForm, routeName: e.target.value })} placeholder={t('routeName')} className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            <input value={routeForm.startLocation} onChange={e => setRouteForm({ ...routeForm, startLocation: e.target.value })} placeholder={t('startLocation')} className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            <input value={routeForm.endLocation} onChange={e => setRouteForm({ ...routeForm, endLocation: e.target.value })} placeholder={t('endLocation')} className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            <div className="flex gap-3">
              <input value={routeForm.distanceKm} onChange={e => setRouteForm({ ...routeForm, distanceKm: e.target.value })} placeholder="Distance (km)" type="number" className="flex-1 px-4 py-3 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              <input value={routeForm.avgTravelTimeMins} onChange={e => setRouteForm({ ...routeForm, avgTravelTimeMins: e.target.value })} placeholder="Avg time (min)" type="number" className="flex-1 px-4 py-3 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <button onClick={handleAddRoute} className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
              <Save className="w-4 h-4" /> {t('save')}
            </button>
          </div>
        )}

        {showAddForm && activeTab === 'alerts' && (
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-4 space-y-3">
            <textarea value={alertForm.message} onChange={e => setAlertForm({ ...alertForm, message: e.target.value })} placeholder={t('message')} rows={3} className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            <div className="flex gap-2">
              {(['low', 'medium', 'high'] as const).map(sev => (
                <button key={sev} onClick={() => setAlertForm({ ...alertForm, severity: sev })} className={`flex-1 py-2 rounded-xl text-sm font-medium capitalize transition-colors ${alertForm.severity === sev ? sev === 'high' ? 'bg-red-600 text-white' : sev === 'medium' ? 'bg-yellow-500 text-white' : 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  {t(sev)}
                </button>
              ))}
            </div>
            <select value={alertForm.routeId} onChange={e => setAlertForm({ ...alertForm, routeId: e.target.value })} className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All routes</option>
              {routes.map(r => <option key={r.id} value={r.id}>{r.routeName}</option>)}
            </select>
            <button onClick={handleAddAlert} className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
              <Save className="w-4 h-4" /> {t('save')}
            </button>
          </div>
        )}

        {showAddForm && activeTab === 'buses' && (
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-4 space-y-3">
            <select value={busForm.routeId} onChange={e => setBusForm({ ...busForm, routeId: e.target.value })} className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select route</option>
              {routes.map(r => <option key={r.id} value={r.id}>{r.routeName}</option>)}
            </select>
            <select value={busForm.nextStop} onChange={e => setBusForm({ ...busForm, nextStop: e.target.value })} className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Starting stop</option>
              {busStops.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
            <button onClick={handleAddBus} className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
              <Save className="w-4 h-4" /> {t('save')}
            </button>
          </div>
        )}

        {/* Routes List */}
        {activeTab === 'routes' && (
          <div className="space-y-3">
            {routes.map(route => (
              <div key={route.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                {editingId === route.id ? (
                  <div className="space-y-3">
                    <input defaultValue={route.routeName} onChange={e => setRouteForm(f => ({ ...f, routeName: e.target.value }))} className="w-full px-3 py-2 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                    <input defaultValue={route.startLocation} onChange={e => setRouteForm(f => ({ ...f, startLocation: e.target.value }))} className="w-full px-3 py-2 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                    <input defaultValue={route.endLocation} onChange={e => setRouteForm(f => ({ ...f, endLocation: e.target.value }))} className="w-full px-3 py-2 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                    <div className="flex gap-2">
                      <button onClick={() => handleEditRoute(route)} className="flex-1 py-2 bg-green-600 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-1"><Save className="w-3.5 h-3.5" /> {t('save')}</button>
                      <button onClick={() => setEditingId(null)} className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-xl text-sm font-medium">{t('cancel')}</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{route.routeName}</h3>
                      <p className="text-sm text-gray-500">{route.startLocation} → {route.endLocation}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {route.distanceKm ? `${route.distanceKm} km` : ''} {route.avgTravelTimeMins ? `• ${route.avgTravelTimeMins} min` : ''}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setEditingId(route.id); setRouteForm({ routeName: route.routeName, startLocation: route.startLocation, endLocation: route.endLocation, distanceKm: String(route.distanceKm || ''), avgTravelTimeMins: String(route.avgTravelTimeMins || '') }); }} className="p-2 hover:bg-blue-50 rounded-full"><Edit2 className="w-4 h-4 text-blue-500" /></button>
                      <button onClick={() => handleDeleteRoute(route.id)} className="p-2 hover:bg-red-50 rounded-full"><Trash2 className="w-4 h-4 text-red-400" /></button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Buses List */}
        {activeTab === 'buses' && (
          <div className="space-y-3">
            {buses.map(bus => {
              const route = routes.find(r => r.id === bus.routeId);
              return (
                <div key={bus.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bus.isDeviating ? 'bg-orange-100' : 'bg-green-100'}`}>
                      <BusIcon className={`w-5 h-5 ${bus.isDeviating ? 'text-orange-600' : 'text-green-600'}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{bus.id.toUpperCase()}</h3>
                      <p className="text-sm text-gray-500">{route?.routeName || bus.routeId}</p>
                      <p className="text-xs text-gray-400">{Math.round(bus.speedKmH || 0)} km/h • Next: {bus.nextStop}</p>
                    </div>
                  </div>
                  <button onClick={() => handleDeleteBus(bus.id)} className="p-2 hover:bg-red-50 rounded-full"><Trash2 className="w-4 h-4 text-red-400" /></button>
                </div>
              );
            })}
            {buses.length === 0 && <p className="text-center py-8 text-gray-400">{t('noActiveBuses')}</p>}
          </div>
        )}

        {/* Alerts List */}
        {activeTab === 'alerts' && (
          <div className="space-y-3">
            {alerts.map(alert => (
              <div key={alert.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                {editingId === alert.id ? (
                  <div className="space-y-3">
                    <textarea defaultValue={alert.message} onChange={e => setAlertForm(f => ({ ...f, message: e.target.value }))} rows={2} className="w-full px-3 py-2 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                    <div className="flex gap-2">
                      {(['low', 'medium', 'high'] as const).map(sev => (
                        <button key={sev} onClick={() => setAlertForm(f => ({ ...f, severity: sev }))} className={`flex-1 py-1.5 rounded-xl text-xs font-medium capitalize transition-colors ${(alertForm.severity || alert.severity) === sev ? sev === 'high' ? 'bg-red-600 text-white' : sev === 'medium' ? 'bg-yellow-500 text-white' : 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                          {t(sev)}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleEditAlert(alert)} className="flex-1 py-2 bg-green-600 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-1"><Save className="w-3.5 h-3.5" /> {t('save')}</button>
                      <button onClick={() => setEditingId(null)} className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-xl text-sm font-medium">{t('cancel')}</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`w-3 h-3 rounded-full mt-1.5 shrink-0 ${alert.severity === 'high' ? 'bg-red-500' : alert.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'}`} />
                      <div>
                        <p className="text-sm text-gray-900">{alert.message}</p>
                        <p className="text-xs text-gray-400 mt-1 capitalize">{alert.severity} • {alert.routeId || 'All routes'}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => { setEditingId(alert.id); setAlertForm({ message: alert.message, severity: alert.severity, routeId: alert.routeId || '' }); }} className="p-2 hover:bg-blue-50 rounded-full"><Edit2 className="w-4 h-4 text-blue-500" /></button>
                      <button onClick={() => handleDeleteAlert(alert.id)} className="p-2 hover:bg-red-50 rounded-full"><Trash2 className="w-4 h-4 text-red-400" /></button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {alerts.length === 0 && <p className="text-center py-8 text-gray-400">{t('noAlerts')}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
