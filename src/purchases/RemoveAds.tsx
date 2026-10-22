// The one-time "Remove ads" purchase: connects to the App Store / Google Play,
// shows the local price, buys, and restores (automatically on launch, or on request).
import { ReactNode, createContext, useContext, useEffect, useRef, useState } from 'react';

import { localized } from '../i18n/lang';
import { usePrefs } from '../state/settings';
import { REMOVE_ADS_SKU, getIap, iapSupported } from './iap';

type Status = 'idle' | 'buying' | 'restoring';

const T = localized({
  en: {
    thanks: 'Thanks! Ads are gone for good.',
    failed: 'The purchase didn’t go through. You haven’t been charged.',
    offline: 'Can’t reach the store right now. Check your connection and try again.',
    restored: 'Purchase restored. Ads are off.',
    notFound: 'No purchase found for this account.',
    offlineLater: 'Can’t reach the store right now. Try again later.',
    pending: 'Purchase pending. Ads turn off as soon as it’s approved.',
  },
  es: {
    thanks: '¡Gracias! Los anuncios se fueron para siempre.',
    failed: 'La compra no se completó. No se te ha cobrado.',
    offline: 'No se puede conectar con la tienda ahora. Revisa tu conexión e inténtalo de nuevo.',
    restored: 'Compra restaurada. Los anuncios están desactivados.',
    notFound: 'No se encontró ninguna compra para esta cuenta.',
    offlineLater: 'No se puede conectar con la tienda ahora. Inténtalo más tarde.',
    pending: 'Compra pendiente. Los anuncios se quitan en cuanto se apruebe.',
  },
});

/** Which message to show; kept as a key so it follows the current language. */
type MessageKey = keyof typeof T;

interface RemoveAdsState {
  /** True when this build can talk to a store (not Expo Go or web). */
  available: boolean;
  /** Localized price from the store, e.g. "$2.99", once loaded. */
  price: string | null;
  status: Status;
  /** Last problem, in plain words, to show under the button. */
  message: string | null;
  buy: () => void;
  restore: () => void;
}

const Ctx = createContext<RemoveAdsState | null>(null);

export function RemoveAdsProvider({ children }: { children: ReactNode }) {
  const { ready, settings, updateSettings } = usePrefs();
  const [price, setPrice] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState<MessageKey | null>(null);
  const [connected, setConnected] = useState(false);
  const owned = useRef(settings.adsRemoved);
  // Connects to the store and loads the price; kept so Buy and Restore can retry after starting offline.
  const connectRef = useRef<(() => Promise<boolean>) | null>(null);
  const ensureConnected = async () => {
    if (connected) return true;
    try {
      return (await connectRef.current?.()) ?? false;
    } catch {
      return false;
    }
  };
  useEffect(() => {
    owned.current = settings.adsRemoved;
  });

  useEffect(() => {
    const iap = getIap();
    if (!iap || !ready) return;
    let alive = true;
    const unlock = () => {
      if (!owned.current) updateSettings({ adsRemoved: true });
    };
    const subs = [
      iap.purchaseUpdatedListener(async (purchase) => {
        if (purchase.productId !== REMOVE_ADS_SKU) return;
        if (purchase.purchaseState !== 'purchased') {
          // Waiting on a parent (Ask to Buy) or a slow payment method: free the buttons and say so.
          if (alive) {
            setStatus('idle');
            setMessage('pending');
          }
          return;
        }
        unlock();
        // Non-consumable: finishing it tells the store it was delivered (Google refunds unfinished ones after 3 days).
        await iap.finishTransaction({ purchase, isConsumable: false }).catch(() => {});
        if (alive) {
          setStatus('idle');
          setMessage('thanks');
        }
      }),
      iap.purchaseErrorListener((error) => {
        if (!alive) return;
        setStatus('idle');
        setMessage(iap.isUserCancelledError(error) ? null : 'failed');
      }),
    ];
    connectRef.current = async () => {
      await iap.initConnection();
      if (!alive) return false;
      setConnected(true);
      const products = await iap.fetchProducts({ skus: [REMOVE_ADS_SKU], type: 'in-app' });
      const product = (products ?? []).find((p) => p.id === REMOVE_ADS_SKU);
      if (alive && product) setPrice(product.displayPrice);
      return true;
    };
    (async () => {
      try {
        if (!(await connectRef.current!())) return;
        // Already bought on this account (new phone, reinstall)? Turn ads off quietly.
        const purchases = await iap.getAvailablePurchases();
        if (purchases.some((p) => p.productId === REMOVE_ADS_SKU)) unlock();
      } catch {
        // No store connection (offline, no Play account): Buy and Restore try again when tapped.
      }
    })();
    return () => {
      alive = false;
      connectRef.current = null;
      subs.forEach((s) => s.remove());
      iap.endConnection().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const buy = async () => {
    const iap = getIap();
    setMessage(null);
    if (!iap) {
      // Development without a store (Expo Go, web): simulate it so the flow can be tested.
      if (__DEV__) updateSettings({ adsRemoved: true });
      return;
    }
    setStatus('buying');
    if (!(await ensureConnected())) {
      setStatus('idle');
      setMessage('offline');
      return;
    }
    iap
      .requestPurchase({ type: 'in-app', request: { apple: { sku: REMOVE_ADS_SKU }, google: { skus: [REMOVE_ADS_SKU] } } })
      .catch(() => setStatus('idle'));
  };

  const restore = async () => {
    const iap = getIap();
    setMessage(null);
    if (!iap) return;
    setStatus('restoring');
    try {
      if (!(await ensureConnected())) throw new Error('offline');
      await iap.restorePurchases();
      const purchases = await iap.getAvailablePurchases();
      const found = purchases.some((p) => p.productId === REMOVE_ADS_SKU);
      if (found) updateSettings({ adsRemoved: true });
      setMessage(found ? 'restored' : 'notFound');
    } catch {
      setMessage('offlineLater');
    } finally {
      setStatus('idle');
    }
  };

  return (
    <Ctx.Provider value={{ available: iapSupported, price, status, message: message && T[message], buy: () => void buy(), restore: () => void restore() }}>
      {children}
    </Ctx.Provider>
  );
}

export function useRemoveAds(): RemoveAdsState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useRemoveAds must be used inside RemoveAdsProvider');
  return v;
}
