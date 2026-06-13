// 결정적 운세 생성기 — seed(날짜×띠×별자리×카테고리)로 항상 같은 결과.
// 핵심: O/X로 "검증 가능한" 문장만 생성(모호한 "오늘 운이 좋아요" 금지).
// 톤: 가능성 화법, 위로·응원. 불안 조장·의료·투자 권유 금지.

export type Category = "overall" | "love" | "money" | "work";

export interface CategoryMeta {
  key: Category;
  label: string;
  emoji: string;
  detail: boolean; // true면 보상형 광고 게이트로 해금
}

export const CATEGORIES: CategoryMeta[] = [
  { key: "overall", label: "종합운", emoji: "🔮", detail: false },
  { key: "love", label: "애정운", emoji: "💗", detail: true },
  { key: "money", label: "금전운", emoji: "💰", detail: true },
  { key: "work", label: "직장운", emoji: "💼", detail: true },
];

export function categoryMeta(key: Category): CategoryMeta {
  return CATEGORIES.find((c) => c.key === key)!;
}

const POOLS: Record<Category, string[]> = {
  overall: [
    "전반적으로 무난하지만 오후에 한 번 변수가 생길 수 있는 하루예요.",
    "오늘은 서두르기보다 천천히 갈 때 더 잘 풀리는 날이에요.",
    "기분 좋은 작은 행운이 한 번쯤 찾아올 수 있어요.",
    "예상 밖의 연락이나 일정 변화가 있을 수 있는 날이에요.",
    "컨디션이 오전보다 오후에 좋아질 수 있어요.",
    "사소한 일에 신경 쓰기보다 큰 흐름을 보면 좋은 하루예요.",
    "오늘 내린 선택이 생각보다 잘 맞아떨어질 수 있어요.",
    "주변의 도움으로 일이 한결 수월해질 수 있어요.",
  ],
  love: [
    "오늘 먼저 연락 오는 사람에게서 반가운 소식이 있을 수 있어요.",
    "가까운 사람과 사소한 오해가 생길 수 있으니 한 박자 천천히 답해보세요.",
    "오후에 누군가의 칭찬이나 호감 표현을 받을 수 있어요.",
    "오늘은 약속이 갑자기 바뀌거나 미뤄질 수 있어요.",
    "오래 연락이 뜸했던 사람에게서 연락이 올 수 있어요.",
    "함께 식사하는 자리에서 분위기가 화기애애할 거예요.",
    "안부를 묻는 메시지를 받으면 오늘 안에 답하는 게 좋아요.",
    "오늘 나눈 대화 한마디가 관계를 더 가깝게 만들 수 있어요.",
  ],
  money: [
    "오후에 예상 밖의 지출이 생길 수 있으니 결제 전 한 번 더 확인해요.",
    "작지만 기분 좋은 할인이나 적립을 받을 수 있어요.",
    "충동구매 욕구가 올라올 수 있어요. 장바구니에 하루만 담아두세요.",
    "예상보다 가벼운 식대나 교통비로 이득을 볼 수 있어요.",
    "잊고 있던 환급·포인트·잔돈이 떠오를 수 있어요.",
    "오늘 큰 금액 결정은 내일로 미루는 편이 나아요.",
    "누군가에게 한 턱 쏘거나 얻어먹을 일이 생길 수 있어요.",
    "구독·정기결제 중 하나를 점검하면 새는 돈을 막을 수 있어요.",
  ],
  work: [
    "오전에 막혔던 일이 오후에 풀릴 수 있어요.",
    "예상치 못한 연락이나 요청이 하나 들어올 수 있어요.",
    "오늘 마무리한 일에서 작은 칭찬을 들을 수 있어요.",
    "회의나 대화가 예정보다 길어질 수 있어요.",
    "작은 실수가 보일 수 있으니 보내기 전 한 번 더 확인해요.",
    "도움을 청하면 의외로 흔쾌히 도와주는 사람이 있어요.",
    "집중이 잘 되는 시간대가 오후에 찾아올 수 있어요.",
    "급하게 처리할 일이 하나 추가될 수 있어요.",
  ],
};

const LUCKY_COLORS = [
  "라벤더",
  "민트",
  "코랄",
  "골드",
  "스카이블루",
  "올리브",
  "버건디",
  "아이보리",
];

export interface Fortune {
  text: string;
  score: number; // 운세 지수 0~100 (재미 요소)
  luckyColor: string;
  luckyNumber: number;
}

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 날짜×띠×별자리×카테고리 기반 결정적 운세. */
export function generateFortune(
  date: string,
  zodiac: string,
  starSign: string,
  category: Category,
): Fortune {
  const r = rng(hash(`${date}|${zodiac}|${starSign}|${category}`));
  const pool = POOLS[category];
  const text = pool[Math.floor(r() * pool.length)];
  const score = 45 + Math.floor(r() * 51); // 45~95
  const luckyColor = LUCKY_COLORS[Math.floor(r() * LUCKY_COLORS.length)];
  const luckyNumber = 1 + Math.floor(r() * 45);
  return { text, score, luckyColor, luckyNumber };
}
