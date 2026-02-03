'use client';

import React, { useEffect, useRef, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

const DISMISS_KEY = 'funvoyage:pwa-install-dismissed-at';
const DISMISS_DAYS = 7;

const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.userAgent.includes('Mac') && navigator.maxTouchPoints > 1);
const isSafari = () =>
  /safari/i.test(navigator.userAgent) && !/chrome|android|crios|fxios/i.test(navigator.userAgent);
const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

const shouldSuppressPrompt = () => {
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const dismissedAt = Number(raw);
  if (Number.isNaN(dismissedAt)) return false;
  const elapsedDays = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
  return elapsedDays < DISMISS_DAYS;
};

export const PwaInstallPrompt: React.FC = () => {
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [mode, setMode] = useState<'android' | 'ios' | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isStandalone()) return;
    if (shouldSuppressPrompt()) return;

    let showTimer: number | undefined;
    let iosTimer: number | undefined;

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      deferredPromptRef.current = event as BeforeInstallPromptEvent;
      setMode('android');
      showTimer = window.setTimeout(() => setIsVisible(true), 600);
    };

    const handleAppInstalled = () => {
      deferredPromptRef.current = null;
      setIsVisible(false);
      localStorage.setItem(DISMISS_KEY, Date.now().toString());
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    if (isIOS() && isSafari()) {
      setMode('ios');
      iosTimer = window.setTimeout(() => setIsVisible(true), 900);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      if (showTimer) window.clearTimeout(showTimer);
      if (iosTimer) window.clearTimeout(iosTimer);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    };
    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register, { once: true });
      return () => window.removeEventListener('load', register);
    }
  }, []);

  if (!isVisible || !mode) return null;

  const dismiss = () => {
    setIsVisible(false);
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
  };

  const handleInstall = async () => {
    const deferredPrompt = deferredPromptRef.current;
    if (!deferredPrompt) {
      dismiss();
      return;
    }

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    deferredPromptRef.current = null;
    if (choice.outcome === 'accepted') {
      setIsVisible(false);
      localStorage.setItem(DISMISS_KEY, Date.now().toString());
    } else {
      dismiss();
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-4 z-[70] px-4 pb-safe">
      <div className="mx-auto max-w-xl overflow-hidden rounded-bento border border-sand-200/70 bg-white/90 shadow-float backdrop-blur">
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-ocean-500 via-forest-400 to-coral-400 text-lg font-display text-white shadow-glow">
            FV
          </div>
          <div className="flex-1">
            <p className="text-xs uppercase tracking-[0.3em] text-sand-500">Install FunVoyage</p>
            <h2 className="mt-2 text-lg font-semibold text-sand-900">
              Keep your travel passport one tap away.
            </h2>
            <p className="mt-2 text-sm text-sand-700">
              {mode === 'android'
                ? 'Add FunVoyage to your home screen for a fast, app-like experience.'
                : 'Open the Share menu in Safari and tap "Add to Home Screen" to install.'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-sand-200/60 bg-sand-50/80 px-4 py-3">
          {mode === 'android' && (
            <button
              type="button"
              onClick={handleInstall}
              className="touch-target rounded-full bg-coral-500 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-coral-600"
            >
              Install app
            </button>
          )}
          <button
            type="button"
            onClick={dismiss}
            className="touch-target rounded-full border border-sand-300 px-4 py-2 text-sm font-medium text-sand-700 transition hover:border-sand-400 hover:text-sand-900"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
};
