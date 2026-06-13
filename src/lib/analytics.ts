import { eventLog } from "@apps-in-toss/web-framework";

type Primitive = string | number | boolean;
type Params = Record<string, Primitive | null | undefined>;
type LogType = "event" | "screen" | "click" | "impression";

function clean(p: Params): Record<string, Primitive> {
  const o: Record<string, Primitive> = {};
  for (const [k, v] of Object.entries(p)) if (v != null) o[k] = v;
  return o;
}

export function track(
  name: string,
  params: Params = {},
  type: LogType = "event",
): void {
  try {
    void eventLog({ log_name: name, log_type: type, params: clean(params) }).catch(
      () => {},
    );
  } catch {
    /* noop */
  }
}

export function trackScreen(name: string, params: Params = {}): void {
  track(`screen_${name}`, params, "screen");
}

// 모든 앱 공통(앱 간 비교 가능) + 앱 고유 이벤트
export const EVENT = {
  signup: "signup_complete",
  adRewarded: "ad_rewarded",
  adInterstitial: "ad_interstitial_shown",
  adBannerImpression: "ad_banner_impression",
  shareCompleted: "share_completed",
  notifyConsent: "notify_consent",
  // 앱 고유
  onboardingComplete: "onboarding_complete",
  fortuneViewed: "fortune_viewed",
  verifySubmitted: "verify_submitted",
  streakMilestone: "streak_milestone",
  detailUnlocked: "detail_unlocked",
} as const;
