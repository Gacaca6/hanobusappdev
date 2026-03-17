import { Alert } from './transitService';

let lastAlertIds: string[] = [];

export function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return Promise.resolve('denied' as NotificationPermission);
  }
  return Notification.requestPermission();
}

export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) return 'denied';
  return Notification.permission;
}

export function showAlertNotification(alert: Alert) {
  if (Notification.permission !== 'granted') return;

  const severityEmoji = alert.severity === 'high' ? '🔴' : alert.severity === 'medium' ? '🟡' : 'ℹ️';
  const title = `${severityEmoji} HanoBus Alert`;

  new Notification(title, {
    body: alert.message,
    icon: '/icons/icon-192.svg',
    tag: alert.id,
    requireInteraction: alert.severity === 'high',
  });
}

export function checkForNewAlerts(alerts: Alert[]) {
  if (Notification.permission !== 'granted') return;

  const currentIds = alerts.map(a => a.id);
  const newAlerts = alerts.filter(a => !lastAlertIds.includes(a.id));

  if (lastAlertIds.length > 0) {
    newAlerts.forEach(alert => showAlertNotification(alert));
  }

  lastAlertIds = currentIds;
}
