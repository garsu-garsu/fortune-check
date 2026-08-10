import { requestNotificationAgreement } from "@apps-in-toss/web-framework";

import { isInTossApp } from "../lib/tossEnv";

export type NotifyConsent =
  | "newAgreement"
  | "alreadyAgreed"
  | "agreementRejected";

/**
 * 알림 슬롯 — 콘솔에 등록한 발송 코드와 1:1로 짝지어요.
 * 코드를 바꾸면 콘솔의 발송 코드도 같이 바꿔야 알림 동의 화면이 떠요.
 */
export const MORNING_SLOTS = [
  { code: "fortune-check-am0700-p", label: "오전 7시" },
  { code: "fortune-check-am0730-p", label: "오전 7시 30분" },
  { code: "fortune-check-am0805-p", label: "오전 8시 5분" },
  { code: "fortune-check-am0835-p", label: "오전 8시 35분" },
  { code: "fortune-check-am0900-p", label: "오전 9시" },
] as const;

export const NIGHT_SLOTS = [
  { code: "fortune-check-pm2000-p", label: "오후 8시" },
  { code: "fortune-check-pm2105-p", label: "오후 9시 5분" },
  { code: "fortune-check-pm2200-p", label: "오후 10시" },
] as const;

export type NotifySlotCode =
  | (typeof MORNING_SLOTS)[number]["code"]
  | (typeof NIGHT_SLOTS)[number]["code"];

/** 온보딩에서 물어보는 기본 아침 알림 슬롯 (기존 단일 알림 코드와 동일). */
export const DEFAULT_MORNING_CODE: NotifySlotCode = "fortune-check-am0900-p";
/** 첫 검증 직후 재요청에 쓰는 기본 밤 알림 슬롯. */
export const DEFAULT_NIGHT_CODE: NotifySlotCode = "fortune-check-pm2000-p";

const AGREED_MORNING_KEY = "fc:notify-agreed-morning";
const AGREED_NIGHT_KEY = "fc:notify-agreed-night";

function isMorningCode(code: NotifySlotCode): boolean {
  return MORNING_SLOTS.some((s) => s.code === code);
}

/** 알림 동의 요청 가능 환경인지 (토스 앱 안) */
export function canRequestNotifyConsent(): boolean {
  return isInTossApp();
}

/** 동의한 아침 운세 알림 슬롯 코드 — 화면 표시용. 실제 발송 대상은 토스가 관리해요. */
export function agreedMorningSlot(): string | null {
  return localStorage.getItem(AGREED_MORNING_KEY);
}

/** 동의한 밤 검증 알림 슬롯 코드 — 화면 표시용. 실제 발송 대상은 토스가 관리해요. */
export function agreedNightSlot(): string | null {
  return localStorage.getItem(AGREED_NIGHT_KEY);
}

/**
 * 아침 운세 / 밤 검증 알림 동의 화면을 띄워요.
 * 브라우저이면 null 반환.
 */
export function requestNotifyConsent(
  code: NotifySlotCode,
): Promise<NotifyConsent | null> {
  if (!canRequestNotifyConsent()) return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const cleanup = requestNotificationAgreement({
        options: { templateCode: code },
        onEvent: (result) => {
          if (result.type !== "agreementRejected") {
            localStorage.setItem(
              isMorningCode(code) ? AGREED_MORNING_KEY : AGREED_NIGHT_KEY,
              code,
            );
          }
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
 * 온보딩에서 알림을 거절/무시한 사람에게 딱 한 번 더 물어봐요 (밤 검증 알림 기본값).
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
  return requestNotifyConsent(DEFAULT_NIGHT_CODE);
}
