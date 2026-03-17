import React from 'react';
import { Bell, AlertTriangle, Info, Shield, MapPin } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useTranslation } from '../i18n/useTranslation';
import { SAMPLE_ALERTS, ALL_ROUTES } from '../data/hanobus_routes';

export default function AlertsPage() {
  const { alerts } = useStore();
  const { t, language } = useTranslation();

  // Merge dataset alerts with any Firestore alerts
  const datasetAlerts = SAMPLE_ALERTS.filter(a => a.active).map(a => {
    const route = ALL_ROUTES.find(r => String(r.id) === String(a.routeId));
    return {
      id: a.id,
      routeId: a.routeId,
      severity: a.severity as 'high' | 'medium' | 'low',
      title: language === 'rw' ? a.titleRw : a.titleEn,
      message: language === 'rw' ? a.messageRw : a.messageEn,
      timestamp: a.timestamp,
      routeName: route?.shortName || route?.name || `Route ${a.routeId}`,
      routeCode: route?.code || a.routeId,
      routeColor: route?.color || '#3b82f6',
      source: 'dataset' as const,
    };
  });

  // Map Firestore alerts too (backward compat)
  const firestoreAlerts = alerts.map(a => {
    const routeId = a.routeId?.replace('route-', '') || '';
    const route = ALL_ROUTES.find(r => String(r.id) === routeId);
    return {
      id: a.id,
      routeId: routeId,
      severity: a.severity,
      title: a.severity === 'high' ? t('criticalAlert') : a.severity === 'medium' ? t('warning') : t('info'),
      message: a.message,
      timestamp: a.timestamp?.toDate ? a.timestamp.toDate().toISOString() : new Date().toISOString(),
      routeName: route?.shortName || route?.name || (a.routeId ? `Route ${routeId}` : ''),
      routeCode: route?.code || routeId,
      routeColor: route?.color || '#3b82f6',
      source: 'firestore' as const,
    };
  });

  // Deduplicate by id, dataset takes priority
  const seenIds = new Set(datasetAlerts.map(a => a.id));
  const combinedAlerts = [
    ...datasetAlerts,
    ...firestoreAlerts.filter(a => !seenIds.has(a.id)),
  ];

  // Sort: high first, then medium, then low
  const severityOrder = { high: 0, medium: 1, low: 2 };
  combinedAlerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  const formatTime = (timestamp: any) => {
    if (!timestamp) return t('justNow');
    const date = typeof timestamp === 'string' ? new Date(timestamp) : (timestamp.toDate ? timestamp.toDate() : new Date(timestamp));
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);

    if (diffInMinutes < 1) return t('justNow');
    if (diffInMinutes < 60) return `${diffInMinutes} ${t('minsAgo')}`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} ${t('hoursAgo')}`;
    return `${Math.floor(diffInHours / 24)} ${t('daysAgo')}`;
  };

  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case 'high':
        return {
          bg: 'bg-red-50',
          iconBg: 'bg-red-100',
          iconColor: 'text-red-600',
          badgeBg: 'bg-red-100',
          badgeText: 'text-red-700',
          badgeBorder: 'border-red-200',
          label: t('alertHigh'),
          icon: <AlertTriangle className="h-5 w-5" />,
        };
      case 'medium':
        return {
          bg: 'bg-amber-50',
          iconBg: 'bg-amber-100',
          iconColor: 'text-amber-600',
          badgeBg: 'bg-amber-100',
          badgeText: 'text-amber-700',
          badgeBorder: 'border-amber-200',
          label: t('alertMedium'),
          icon: <AlertTriangle className="h-5 w-5" />,
        };
      default:
        return {
          bg: 'bg-green-50',
          iconBg: 'bg-green-100',
          iconColor: 'text-green-600',
          badgeBg: 'bg-green-100',
          badgeText: 'text-green-700',
          badgeBorder: 'border-green-200',
          label: t('alertLow'),
          icon: <Info className="h-5 w-5" />,
        };
    }
  };

  return (
    <div className="min-h-full bg-gray-50 flex flex-col">
      <div className="bg-blue-600 px-6 pt-12 pb-6 text-white shadow-md">
        <h1 className="text-2xl font-bold">{t('serviceAlerts')}</h1>
        <p className="text-blue-100 mt-1">{t('stayUpdated')}</p>
        <div className="flex items-center gap-3 mt-3">
          <div className="flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1">
            <div className="w-2 h-2 rounded-full bg-red-400" />
            <span className="text-xs">{combinedAlerts.filter(a => a.severity === 'high').length} {t('high')}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1">
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-xs">{combinedAlerts.filter(a => a.severity === 'medium').length} {t('medium')}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1">
            <div className="w-2 h-2 rounded-full bg-green-400" />
            <span className="text-xs">{combinedAlerts.filter(a => a.severity === 'low').length} {t('low')}</span>
          </div>
        </div>
      </div>

      <div className="p-4 flex-1 overflow-y-auto pb-4">
        <div className="space-y-3">
          {combinedAlerts.length > 0 ? (
            combinedAlerts.map((alert) => {
              const config = getSeverityConfig(alert.severity);
              return (
                <div key={alert.id} className={`${config.bg} p-4 rounded-2xl shadow-sm border border-gray-100`}>
                  {/* Header: severity icon + title + time */}
                  <div className="flex items-start gap-3">
                    <div className={`h-10 w-10 rounded-xl ${config.iconBg} ${config.iconColor} flex items-center justify-center shrink-0`}>
                      {config.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-gray-900 leading-tight text-sm">{alert.title}</h3>
                        <span className="text-[10px] text-gray-400 whitespace-nowrap mt-0.5">{formatTime(alert.timestamp)}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">{alert.message}</p>
                    </div>
                  </div>

                  {/* Footer: route badge + severity badge */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200/50">
                    {/* Route info */}
                    {alert.routeName && (
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: alert.routeColor }}
                        />
                        <span className="text-xs font-medium text-gray-700">
                          {alert.routeCode} · {alert.routeName}
                        </span>
                      </div>
                    )}

                    {/* Severity badge */}
                    <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border ${config.badgeBg} ${config.badgeText} ${config.badgeBorder}`}>
                      {config.label}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Bell className="h-8 w-8 text-gray-300" />
              </div>
              <p className="text-sm text-gray-400">{t('noAlerts')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
