import { useEffect, useState } from 'react';
import { api } from '../api';
import { useApp } from '../context';
import Icon from './Icon';

const canPush = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const toKey = (b64) => {
  const s = (b64 + '='.repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
};

// Remove this device's push subscription (call before logging out)
export async function pushLogout() {
  try {
    if (!canPush()) return;
    const reg = await navigator.serviceWorker.getRegistration(); if (!reg) return;
    const sub = await reg.pushManager.getSubscription(); if (!sub) return;
    await api('/push/unsubscribe', { method: 'POST', body: { endpoint: sub.endpoint } }).catch(() => {});
    await sub.unsubscribe();
  } catch { /* ignore */ }
}

// Captured early so the button can appear even if the event fires before this component mounts
let deferred = null;
if (typeof window !== 'undefined') window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; window.dispatchEvent(new Event('mt-install-ready')); });

export default function PwaControls() {
  const { toast } = useApp();
  const [installable, setInstallable] = useState(!!deferred);
  const [installed, setInstalled] = useState(isStandalone());
  const [subscribed, setSubscribed] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const ready = () => setInstallable(true);
    const done = () => { setInstalled(true); setInstallable(false); deferred = null; };
    window.addEventListener('mt-install-ready', ready); window.addEventListener('appinstalled', done);
    if (canPush()) navigator.serviceWorker.ready.then((r) => r.pushManager.getSubscription()).then((s) => setSubscribed(!!s)).catch(() => setSubscribed(false));
    else setSubscribed(false);
    return () => { window.removeEventListener('mt-install-ready', ready); window.removeEventListener('appinstalled', done); };
  }, []);

  const install = async () => {
    if (deferred) { deferred.prompt(); const r = await deferred.userChoice; deferred = null; setInstallable(false); if (r.outcome === 'accepted') toast('Installing the app...'); return; }
    if (isIOS()) toast('On iPhone: tap the Share button, then "Add to Home Screen".');
    else toast('Open your browser menu and choose "Install app" or "Add to Home screen".');
  };

  const enable = async () => {
    if (!canPush()) return toast(isIOS() && !isStandalone() ? 'On iPhone, first add the portal to your Home Screen, open it from there, then turn on notifications.' : 'This browser does not support notifications.');
    setBusy(true);
    try {
      const { key } = await api('/push/key');
      if (!key) throw new Error('Phone notifications are not set up on the server yet. Ask the admin.');
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') throw new Error('Notifications are blocked. Allow them in your browser settings for this site.');
      const reg = await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(key) }));
      await api('/push/subscribe', { method: 'POST', body: sub.toJSON() });
      await api('/push/test', { method: 'POST' });
      setSubscribed(true); toast('Notifications are on for this device');
    } catch (x) { toast(x.message); } finally { setBusy(false); }
  };

  const disable = async () => { setBusy(true); await pushLogout(); setSubscribed(false); setBusy(false); toast('Notifications turned off for this device'); };

  return <>
    {!installed && (installable || isIOS()) && <button className="nav-btn pwa-btn" onClick={install}><span className="ic"><Icon e="phone" /></span>Install app</button>}
    {subscribed === false && <button className="nav-btn pwa-btn" disabled={busy} onClick={enable}><span className="ic"><Icon e="bell" /></span>Turn on notifications</button>}
    {subscribed === true && <button className="nav-btn" disabled={busy} onClick={disable} title="Stop alerts on this device"><span className="ic"><Icon e="bell" /></span>Notifications on</button>}
  </>;
}