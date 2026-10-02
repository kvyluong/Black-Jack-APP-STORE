import { getAds } from './config';

let started: Promise<void> | null = null;

/**
 * Gathers consent (GDPR/UMP form where required, plus the iOS ATT prompt when it
 * is configured in the AdMob console), then starts the SDK. Safe to call repeatedly.
 */
export function initAds(): Promise<void> {
  if (started) return started;
  const ads = getAds();
  if (!ads) return (started = Promise.resolve());
  started = (async () => {
    try {
      const consent = await ads.AdsConsent.gatherConsent();
      if (!consent.canRequestAds) return;
    } catch {
      // Consent form unavailable (e.g. offline); the SDK falls back to non-personalized behaviour.
    }
    await ads.default().initialize();
  })().catch(() => {});
  return started;
}

/** Whether the user must be offered a way to change their ad privacy choices (e.g. in the EEA). */
export async function privacyOptionsRequired(): Promise<boolean> {
  const ads = getAds();
  if (!ads) return false;
  try {
    const info = await ads.AdsConsent.getConsentInfo();
    return info.privacyOptionsRequirementStatus === ads.AdsConsentPrivacyOptionsRequirementStatus.REQUIRED;
  } catch {
    return false;
  }
}

export async function showPrivacyOptions(): Promise<void> {
  await getAds()?.AdsConsent.showPrivacyOptionsForm().catch(() => {});
}
