import { logger } from './logger';

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      logger.info('Service Worker registered', { scope: registration.scope });
      return registration;
    } catch (error) {
      logger.error('Service Worker registration failed', error);
      return null;
    }
  }
  return null;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if ('Notification' in window) {
    return await Notification.requestPermission();
  }
  return 'denied';
}

export async function subscribeToPushNotifications(): Promise<PushSubscription | null> {
  try {
    const registration = await navigator.serviceWorker.ready;
    
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
      ),
    });

    // Send subscription to server
    await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription),
    });

    return subscription;
  } catch (error) {
    logger.error('Failed to subscribe to push notifications', error);
    return null;
  }
}

export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      await subscription.unsubscribe();
      
      // Notify server
      await fetch('/api/notifications/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });
      
      return true;
    }
    
    return false;
  } catch (error) {
    logger.error('Failed to unsubscribe from push notifications', error);
    return false;
  }
}

export async function sendTestNotification(): Promise<boolean> {
  try {
    const response = await fetch('/api/notifications/test', {
      method: 'POST',
    });
    
    return response.ok;
  } catch (error) {
    logger.error('Failed to send test notification', error);
    return false;
  }
}

export function isNotificationSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
}

export function getNotificationPermissionStatus(): NotificationPermission {
  if ('Notification' in window) {
    return Notification.permission;
  }
  return 'denied';
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Show local notification (doesn't require permission)
export async function showLocalNotification(title: string, options?: NotificationOptions) {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        ...options,
      });
    } catch (error) {
      logger.error('Failed to show notification', error);
    }
  }
}
