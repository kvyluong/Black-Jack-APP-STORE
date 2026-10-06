// The one-time "Remove ads" purchase: connects to the App Store / Google Play,
// shows the local price, buys, and restores (automatically on launch, or on request).
import { ReactNode, createContext, useContext, useEffect, useRef, useState } from 'react';

import { useSettings } from '../state/settings';
import { REMOVE_ADS_SKU, getIap, iapSupported } from './iap';

type Status = 'idle' | 'buying' | 'restoring';

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
  const { ready, settings, updateSettings } = useSettings();
  const [price, setPrice] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const owned = useRef(settings.adsRemoved);
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
        if (purchase.productId !== REMOVE_ADS_SKU || purchase.purchaseState !== 'purchased') return;
        unlock();
        // Non-consumable: finishing it tells the store it was delivered (Google refunds unfinished ones after 3 days).
        await iap.finishTransaction({ purchase, isConsumable: false }).catch(() => {});
        if (alive) {
          setStatus('idle');
          setMessage('Thanks! Ads are gone for good.');
        }
      }),
      iap.purchaseErrorListener((error) => {
        if (!alive) return;
        setStatus('idle');
        setMessage(iap.isUserCancelledError(error) ? null : 'The purchase didn’t go through. You haven’t been charged.');
      }),
    ];
    (async () => {
      try {
        await iap.initConnection();
        if (!alive) return;
        setConnected(true);
        const products = await iap.fetchProducts({ skus: [REMOVE_ADS_SKU], type: 'in-app' });
        const product = (products ?? []).find((p) => p.id === REMOVE_ADS_SKU);
        if (alive && product) setPrice(product.displayPrice);
        // Already bought on this account (new phone, reinstall)? Turn ads off quietly.
        const purchases = await iap.getAvailablePurchases();
        if (purchases.some((p) => p.productId === REMOVE_ADS_SKU)) unlock();
      } catch {
        // No store connection (offline, no Play account): the button explains when tapped.
      }
    })();
    return () => {
      alive = false;
      subs.forEach((s) => s.remove());
      iap.endConnection().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const buy = () => {
    const iap = getIap();
    setMessage(null);
    if (!iap) {
      // Development without a store (Expo Go, web): simulate it so the flow can be tested.
      if (__DEV__) updateSettings({ adsRemoved: true });
      return;
    }
    if (!connected) {
      setMessage('Can’t reach the store right now. Check your connection and try again.');
      return;
    }
    setStatus('buying');
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
      await iap.restorePurchases();
      const purchases = await iap.getAvailablePurchases();
      const found = purchases.some((p) => p.productId === REMOVE_ADS_SKU);
      if (found) updateSettings({ adsRemoved: true });
      setMessage(found ? 'Purchase restored. Ads are off.' : 'No purchase found for this account.');
    } catch {
      setMessage('Can’t reach the store right now. Try again later.');
    } finally {
      setStatus('idle');
    }
  };

  return (
    <Ctx.Provider value={{ available: iapSupported, price, status, message, buy, restore: () => void restore() }}>
      {children}
    </Ctx.Provider>
  );
}

export function useRemoveAds(): RemoveAdsState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useRemoveAds must be used inside RemoveAdsProvider');
  return v;
}
