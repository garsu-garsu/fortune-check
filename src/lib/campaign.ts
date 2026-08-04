// 토스 네이티브 광고(앱 설치 유도 / 잠재고객 모으기 / 구매 유도) 유입 식별.
// 첫 진입 URL 의 utm_* 를 한 번만 저장해 두고 모든 이벤트에 붙여요.
// 이게 없으면 캠페인을 집행해도 어느 소재가 설치·리텐션을 만들었는지 못 봐서
// 예산 배분이 불가능해요.
// ponytail: 라스트터치가 아니라 첫 터치 기여만 봐요. 채널을 여러 개 돌리면 그때 확장.

const KEY = "fc:campaign";

interface Campaign {
  source: string;
  campaign: string;
}

let cached: Campaign | null | undefined;

/** 앱 진입 시 1회 호출. 이미 저장된 유입은 덮어쓰지 않아요. */
export function captureCampaign(): void {
  try {
    if (localStorage.getItem(KEY)) return;
    const q = new URLSearchParams(window.location.search);
    const source = q.get("utm_source") ?? "";
    const campaign = q.get("utm_campaign") ?? "";
    if (!source && !campaign) return;
    localStorage.setItem(KEY, JSON.stringify({ source, campaign }));
    cached = undefined;
  } catch {
    /* noop */
  }
}

/** 이벤트에 붙일 캠페인 파라미터. 유입 정보가 없으면 빈 객체. */
export function campaignParams(): Record<string, string> {
  if (cached === undefined) {
    try {
      const raw = localStorage.getItem(KEY);
      cached = raw ? (JSON.parse(raw) as Campaign) : null;
    } catch {
      cached = null;
    }
  }
  return cached
    ? { utm_source: cached.source, utm_campaign: cached.campaign }
    : {};
}
