import { requestNotificationAgreement } from "@apps-in-toss/web-framework";

import { NOTIFY_TEMPLATE_CODE } from "../lib/env";
import { isInTossApp } from "../lib/tossEnv";

export type NotifyConsent =
  | "newAgreement"
  | "alreadyAgreed"
  | "agreementRejected";

/** 알림 동의 요청 가능 환경인지 (토스 앱 + 템플릿 코드 설정됨) */
export function canRequestNotifyConsent(): boolean {
  return isInTossApp() && NOTIFY_TEMPLATE_CODE !== "";
}

/**
 * 아침 운세 / 밤 검증 알림 동의 화면을 띄워요.
 * 브라우저이거나 템플릿 코드가 없으면 null 반환.
 */
export function requestNotifyConsent(): Promise<NotifyConsent | null> {
  if (!canRequestNotifyConsent()) return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const cleanup = requestNotificationAgreement({
        options: { templateCode: NOTIFY_TEMPLATE_CODE },
        onEvent: (result) => {
          resolve(result.type);
          cleanup();
        },
        onError: () => {
          resolve(null);
          cleanup();
        },
      });
    } catch {
      resolve(null);
    }
  });
}

const RETRY_KEY = "fc:notify-retried";

/**
 * 온보딩에서 알림을 거절/무시한 사람에게 딱 한 번 더 물어봐요.
 * 알림이 이 앱의 유일한 복귀 트리거라, 첫 검증을 마친 직후(만족도 최고점)에 요청해요.
 * 이미 동의한 사람에겐 토스가 alreadyAgreed 로 조용히 통과시켜요.
 */
export async function retryNotifyConsentOnce(): Promise<NotifyConsent | null> {
  try {
    if (localStorage.getItem(RETRY_KEY)) return null;
    if (!canRequestNotifyConsent()) return null;
    localStorage.setItem(RETRY_KEY, "1");
  } catch {
    return null;
  }
  return requestNotifyConsent();
}
