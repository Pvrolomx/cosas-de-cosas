import { User } from './supabase';

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = typeof window !== 'undefined' ? window.atob(base64) : '';
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) output[i] = rawData.charCodeAt(i);
  return output;
}

export type PushState = 'unsupported' | 'denied' | 'default' | 'granted-unsubscribed' | 'granted-subscribed';

export async function checkPushState(): Promise<PushState> {
  if (typeof window === 'undefined') return 'unsupported';
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return 'unsupported';
  }
  if (Notification.permission === 'denied') return 'denied';
  if (Notification.permission === 'default') return 'default';

  // granted — verificar si hay subscription activa
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    return sub ? 'granted-subscribed' : 'granted-unsubscribed';
  } catch {
    return 'granted-unsubscribed';
  }
}

export async function enablePush(user: User): Promise<{ ok: boolean; error?: string }> {
  if (typeof window === 'undefined') return { ok: false, error: 'server context' };
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { ok: false, error: 'Este navegador no soporta notificaciones push.' };
  }
  if (!VAPID_PUBLIC) {
    return { ok: false, error: 'Configuración de servidor incompleta (VAPID).' };
  }

  // Pedir permiso
  let permission = Notification.permission;
  if (permission === 'default') {
    permission = await Notification.requestPermission();
  }
  if (permission !== 'granted') {
    return { ok: false, error: 'Permiso denegado. Actívalo desde la configuración del navegador.' };
  }

  try {
    const reg = await navigator.serviceWorker.ready;
    // Desuscribir cualquier sub vieja primero (por si cambiaron las VAPID)
    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      // solo si la key aplicationServerKey no coincide — fácil: siempre re-subscribir
      try { await existing.unsubscribe(); } catch {}
    }
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
    });

    // Guardar en backend
    const res = await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: user,
        subscription: sub.toJSON(),
        user_agent: navigator.userAgent,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { ok: false, error: err.error || `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || String(err) };
  }
}

export async function disablePush(): Promise<{ ok: boolean; error?: string }> {
  if (typeof window === 'undefined') return { ok: false };
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      const endpoint = sub.endpoint;
      await sub.unsubscribe();
      await fetch('/api/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint }),
      }).catch(() => {});
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

export function isIOSPWAInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  // iOS Safari PWA installation detection
  return (window.navigator as any).standalone === true;
}

export function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}
