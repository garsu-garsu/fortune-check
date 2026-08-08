import { requestReview } from "@apps-in-toss/web-framework";

const ASKED_KEY = "fc:review-asked";

/**
 * 앱 리뷰를 요청해요. 평생 1회만 — 토스가 자체 노출 제한도 걸어요.
 * 지원하지 않는 버전이거나 브라우저면 조용히 통과해요.
 */
export function askReviewOnce(): void {
  try {
    if (localStorage.getItem(ASKED_KEY)) return;
    if (!requestReview.isSupported()) return;
    localStorage.setItem(ASKED_KEY, "1");
    void requestReview();
  } catch {
    /* noop */
  }
}
