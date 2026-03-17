import React from 'react';
import { Bell, AlertTriangle, Info } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useTranslation } from '../i18n/useTranslation';

export default function AlertsPage() {
  const { alerts } = useStore();
  const { t } = useTranslation();

  const formatTime = (timestamp: any) => {
    if (!timestamp) return t('justNow');
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);

    if (diffInMinutes < 1) return t('justNow');
    if (diffInMinutes < 60) return `${diffInMinutes} ${t('minsAgo')}`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} ${t('hoursAgo')}`;
    return `${Math.floor(diffInHours / 24)} ${t('daysAgo')}`;
  };

  return (
    <div className="min-h-full bg-gray-50 flex flex-col">
      <div className="bg-blue-600 px-6 pt-12 pb-6 text-white shadow-md">
        <h1 className="text-2xl font-bold">{t('serviceAlerts')}</h1>
        <p className="text-blue-100 mt-1">{t('stayUpdated')}</p>
      </div>

      <div className="p-4 flex-1 overflow-y-auto pb-4">
        <div className="space-y-4">
          {alerts.length > 0 ? (
            alerts.map((alert) => (
              <div key={alert.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-start gap-4">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                  alert.severity === 'medium' ? 'bg-yellow-50 text-yellow-600' :
                  alert.severity === 'high' ? 'bg-red-50 text-red-600' :
                  'bg-blue-50 text-blue-600'
                }`}>
                  {alert.severity === 'medium' ? <AlertTriangle className="h-5 w-5" /> :
                   alert.severity === 'high' ? <AlertTriangle className="h-5 w-5" /> :
                   <Info className="h-5 w-5" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-gray-900 leading-tight">
                      {alert.severity === 'high' ? t('criticalAlert') : alert.severity === 'medium' ? t('warning') : t('info')}
                    </h3>
                    <span className="text-xs text-gray-400 whitespace-nowrap">{formatTime(alert.timestamp)}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-2 leading-relaxed">{alert.message}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              {t('noAlerts')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
