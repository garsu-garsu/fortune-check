// 운세 생성기 — 사주(일간)와 그날 일진(日辰)의 십성 관계로 톤을 정하고,
// 톤에 맞는 문장 풀에서 결정적으로 하나를 뽑아요.
// 핵심: O/X로 "검증 가능한" 문장만 생성(모호한 "오늘 운이 좋아요" 금지).
// 톤: 가능성 화법, 위로·응원. 불안 조장·의료·투자 권유 금지.

import {
  LIFE_STAGE_POWER,
  branchElement,
  branchRelationOf,
  dayPillarOf,
  lifeStageOf,
  stemElement,
  tenGodFullOf,
  tenGodOf,
  usefulElementsOfV2,
  type BranchRelation,
  type LifeStage,
  type Saju,
  type TenGod,
  type TenGodFull,
  // 확장자 명시 — scripts/*-check.ts 가 node 로 직접 불러와요
} from "./saju.ts";

export type Category = "overall" | "love" | "money" | "work" | "saju";
type Tone = "good" | "normal" | "caution";

/** 검증 화면을 나누는 축 — 운세 문장이냐 사주 풀이냐 */
export type CheckKind = "운세" | "사주";

/** 문장 풀에서 뽑는 운세만. 사주 일운은 풀이에서 나오므로 여기 없어요. */
export type FortuneCategory = Exclude<Category, "saju">;

export interface CategoryMeta {
  key: Category;
  label: string;
  emoji: string;
  detail: boolean; // true면 보상형 광고 게이트로 해금
  kind: CheckKind;
}

export const CATEGORIES: CategoryMeta[] = [
  { key: "overall", label: "종합운", emoji: "🔮", detail: false, kind: "운세" },
  { key: "love", label: "애정운", emoji: "💗", detail: true, kind: "운세" },
  { key: "money", label: "금전운", emoji: "💰", detail: true, kind: "운세" },
  { key: "work", label: "직장운", emoji: "💼", detail: true, kind: "운세" },
  // 홈에는 안 나와요 — 사주 탭에서 오늘 일운을 열어야 검증 대상이 돼요.
  { key: "saju", label: "사주 일운", emoji: "🧭", detail: false, kind: "사주" },
];

/** 홈에서 광고로 해금하는 상세운. 사주 일운은 홈에 없어서 여기 안 들어와요. */
export const DETAIL_CATEGORIES = CATEGORIES.filter(
  (c): c is CategoryMeta & { key: FortuneCategory } =>
    c.detail && c.kind === "운세",
);

export function categoryMeta(key: Category): CategoryMeta {
  return CATEGORIES.find((c) => c.key === key)!;
}

const DETAIL_KEYS: FortuneCategory[] = ["love", "money", "work"];

/**
 * 오늘 광고 없이 열어주는 상세운 1종(날짜로 결정, 매일 바뀜).
 * 무료 콘텐츠가 종합운 한 줄뿐이면 신규가 첫 화면에서 바로 나가요.
 * 매일 다른 종이 열려서 "오늘은 뭐가 열렸지" 자체가 재방문 이유가 돼요.
 */
export function freeDetailOf(date: string): FortuneCategory {
  return DETAIL_KEYS[hash(`free|${date}`) % DETAIL_KEYS.length];
}

// 톤은 이제 dayPower() 가 사주(용신·십이운성·합충·십성)로 계산해요.
// 십성 5종만 보던 고정 표(TONE)는 그 계산에 흡수됐어요.

const POOLS: Record<FortuneCategory, Record<Tone, string[]>> = {
  overall: {
    good: [
      "기분 좋은 작은 행운이 한 번쯤 찾아올 수 있어요.",
      "오늘 내린 선택이 생각보다 잘 맞아떨어질 수 있어요.",
      "주변의 도움으로 일이 한결 수월해질 수 있어요.",
      "미뤄두던 일 하나를 오늘 안에 끝낼 수 있어요.",
      "오후에 기분이 눈에 띄게 가벼워지는 순간이 있어요.",
      "찾던 물건이나 정보를 예상보다 빨리 찾을 수 있어요.",
      "누군가에게 고맙다는 말을 듣게 될 수 있어요.",
      "오늘 처음 해보는 일이 의외로 잘 풀릴 수 있어요.",
      "계획했던 일정이 막힘 없이 그대로 진행될 거예요.",
      "오늘 먹은 음식이 유난히 입에 맞을 수 있어요.",
      "오늘 받은 연락 중에 반가운 소식이 하나 있어요.",
      "길에서 아는 사람을 우연히 마주칠 수 있어요.",
      "오늘 고른 옷이나 물건이 유난히 마음에 들어요.",
      "막힐 줄 알았던 일이 한 번에 통과될 수 있어요.",
      "오늘 하루가 예상보다 짧게 느껴질 거예요.",
      "기다리던 답이 오늘 안에 도착할 수 있어요.",
    ],
    normal: [
      "전반적으로 무난하지만 오후에 한 번 변수가 생길 수 있는 하루예요.",
      "오늘은 서두르기보다 천천히 갈 때 더 잘 풀리는 날이에요.",
      "예상 밖의 연락이나 일정 변화가 있을 수 있는 날이에요.",
      "컨디션이 오전보다 오후에 좋아질 수 있어요.",
      "사소한 일에 신경 쓰기보다 큰 흐름을 보면 좋은 하루예요.",
      "오늘 하루는 어제와 비슷한 속도로 흘러갈 거예요.",
      "짧게라도 혼자 있는 시간이 한 번 생길 수 있어요.",
      "오늘 들은 이야기 중에 기억에 남는 한마디가 있을 거예요.",
      "이동 중에 생각이 정리되는 순간이 있어요.",
      "오늘은 새로 시작하기보다 있던 걸 다듬기 좋은 날이에요.",
      "오늘은 예정에 없던 이동이 한 번 생길 수 있어요.",
      "평소 지나치던 것이 오늘따라 눈에 들어와요.",
      "오늘 쓴 시간 중 절반은 준비하는 데 쓰게 돼요.",
      "누군가에게 짧게 부탁할 일이 하나 생겨요.",
      "날씨나 온도가 오늘 계획에 영향을 줄 수 있어요.",
      "저녁 무렵에 하루를 돌아보는 시간이 생겨요.",
    ],
    caution: [
      "오늘은 서두를수록 놓치는 게 생기니 한 박자 쉬어가요.",
      "오후에 예정이 한 번 어긋날 수 있어요.",
      "깜빡 잊고 지나칠 일이 하나 있을 수 있으니 메모해두세요.",
      "오늘은 말수를 조금 줄이면 편한 하루가 돼요.",
      "피로가 평소보다 빨리 올 수 있으니 중간에 쉬어가요.",
      "챙겨야 할 물건을 두고 나올 수 있으니 나서기 전 확인해요.",
      "기다리는 일이 생각보다 늦어질 수 있어요.",
      "오늘 결정은 하루 미뤄도 늦지 않아요.",
      "익숙한 길에서 예상 밖의 지체가 있을 수 있어요.",
      "오늘은 욕심내기보다 하나만 확실히 끝내는 게 좋아요.",
      "두 가지를 동시에 하려다 하나를 놓칠 수 있어요.",
      "연락을 놓쳐 나중에 확인하게 될 수 있어요.",
      "오늘 산 것 중 하나는 다시 생각하게 될 수 있어요.",
      "평소보다 기다리는 시간이 길어질 수 있어요.",
      "오늘은 확답보다 여지를 두는 편이 편해요.",
      "챙긴 줄 알았던 걸 다시 찾게 될 수 있어요.",
    ],
  },
  love: {
    good: [
      "오늘 먼저 연락 오는 사람에게서 반가운 소식이 있을 수 있어요.",
      "오후에 누군가의 칭찬이나 호감 표현을 받을 수 있어요.",
      "오래 연락이 뜸했던 사람에게서 연락이 올 수 있어요.",
      "함께 식사하는 자리에서 분위기가 화기애애할 거예요.",
      "오늘 나눈 대화 한마디가 관계를 더 가깝게 만들 수 있어요.",
      "사진이나 링크를 주고받으며 이야기가 길어질 수 있어요.",
      "상대가 먼저 약속을 제안해올 수 있어요.",
      "오늘 웃음이 터지는 순간이 한 번은 있어요.",
      "고민을 털어놓기 좋은 상대가 곁에 있어요.",
      "안부를 물었더니 생각보다 긴 답이 돌아올 수 있어요.",
      "오늘 보낸 메시지에 예상보다 빨리 답이 와요.",
      "상대가 내 이야기를 기억하고 먼저 꺼낼 수 있어요.",
      "같이 웃을 만한 이야깃거리가 하나 생겨요.",
      "오늘 만난 사람과 대화가 자연스럽게 이어져요.",
      "연락처에서 잊고 있던 이름을 다시 보게 돼요.",
      "고마운 마음을 표현할 기회가 한 번 와요.",
    ],
    normal: [
      "안부를 묻는 메시지를 받으면 오늘 안에 답하는 게 좋아요.",
      "오늘은 약속이 갑자기 바뀌거나 미뤄질 수 있어요.",
      "연락 빈도가 평소와 비슷하게 흘러가요.",
      "가벼운 대화가 오가지만 깊은 이야기까진 가지 않아요.",
      "상대의 근황을 우연히 알게 될 수 있어요.",
      "먼저 연락할지 말지 한 번 망설이는 순간이 있어요.",
      "오늘은 답장이 조금 늦게 올 수 있어요.",
      "함께 볼 만한 것을 추천받거나 추천하게 돼요.",
      "예전 사진이나 기록을 다시 보게 될 수 있어요.",
      "오늘은 표현보다 듣는 쪽이 편한 날이에요.",
      "먼저 연락이 올지 기다리게 되는 날이에요.",
      "약속을 잡되 시간은 나중에 정하게 될 수 있어요.",
      "대화 중에 서로 다른 취향을 확인하게 돼요.",
      "오늘 나눈 이야기는 짧지만 나쁘지 않아요.",
      "주변 사람의 소식을 전해 듣게 될 수 있어요.",
      "오늘은 관계에 큰 변화 없이 지나가요.",
    ],
    caution: [
      "가까운 사람과 사소한 오해가 생길 수 있으니 한 박자 천천히 답해보세요.",
      "말이 짧아지면 서운함으로 읽힐 수 있으니 한 줄 더 붙여요.",
      "약속 시간이 어긋나 기다리는 일이 생길 수 있어요.",
      "농담이 의도와 다르게 전달될 수 있어요.",
      "오늘은 비교하는 말을 피하는 게 좋아요.",
      "답장이 늦어도 넘겨짚지 않는 편이 나아요.",
      "서로 바빠 대화가 끊길 수 있어요.",
      "지난 이야기를 다시 꺼내면 길어질 수 있어요.",
      "오늘은 먼저 사과하는 쪽이 편해져요.",
      "단둘보다 여럿이 있는 자리가 편한 날이에요.",
      "읽고 답을 미루다 잊어버릴 수 있어요.",
      "오늘은 조언보다 들어주는 쪽이 편해요.",
      "약속 장소나 시간을 다시 확인하는 게 좋아요.",
      "평소 같은 말투가 오늘은 다르게 들릴 수 있어요.",
      "단체 대화방에서는 말을 아끼는 게 좋아요.",
      "서운한 마음이 들어도 오늘 꺼내지 않는 편이 나아요.",
    ],
  },
  money: {
    good: [
      "작지만 기분 좋은 할인이나 적립을 받을 수 있어요.",
      "예상보다 가벼운 식대나 교통비로 이득을 볼 수 있어요.",
      "잊고 있던 환급·포인트·잔돈이 떠오를 수 있어요.",
      "누군가에게 한 턱 얻어먹을 일이 생길 수 있어요.",
      "찾던 물건을 생각보다 싸게 구할 수 있어요.",
      "구독·정기결제 중 하나를 점검하면 새는 돈을 막을 수 있어요.",
      "오늘 미룬 결제 하나가 결과적으로 이득이 돼요.",
      "예정에 없던 소소한 수입이 생길 수 있어요.",
      "지갑이나 계좌를 확인했을 때 생각보다 여유가 있어요.",
      "오늘 산 물건이 값에 비해 만족스러울 거예요.",
      "찾아본 물건의 가격이 마침 내려가 있을 수 있어요.",
      "오늘 아낀 돈이 생각보다 큰 금액이 돼요.",
      "쿠폰이나 기프티콘을 제때 쓰게 될 수 있어요.",
      "예상했던 비용보다 적게 나올 수 있어요.",
      "안 쓰던 물건을 정리하다 값어치를 알게 돼요.",
      "오늘 받은 정산이나 입금이 기억보다 많아요.",
    ],
    normal: [
      "오늘 지출은 평소와 비슷한 선에서 마무리돼요.",
      "장바구니에 담아둔 걸 살지 말지 한 번 고민하게 돼요.",
      "결제 알림을 한 번쯤 확인하게 되는 날이에요.",
      "예산 안에서 무난하게 하루가 지나가요.",
      "가격을 비교해보고 사는 쪽으로 마음이 기울어요.",
      "오늘은 큰 지출도 큰 수입도 없는 하루예요.",
      "누군가와 더치페이나 정산 이야기가 오갈 수 있어요.",
      "필요한 물건 하나를 목록에 적어두게 돼요.",
      "오늘 쓴 돈이 기억보다 조금 적을 수 있어요.",
      "현금이나 카드를 꺼낼 일이 평소보다 적어요.",
      "결제 전에 한 번 멈추게 되는 순간이 있어요.",
      "가계부나 결제 내역을 훑어보게 될 수 있어요.",
      "필요한 것과 갖고 싶은 것을 구분하게 돼요.",
      "오늘 쓴 돈은 대부분 예정된 항목이에요.",
      "할인 소식을 접하지만 사지는 않게 돼요.",
      "교통비나 식비가 평소 수준으로 나가요.",
    ],
    caution: [
      "오후에 예상 밖의 지출이 생길 수 있으니 결제 전 한 번 더 확인해요.",
      "충동구매 욕구가 올라올 수 있어요. 장바구니에 하루만 담아두세요.",
      "오늘 큰 금액 결정은 내일로 미루는 편이 나아요.",
      "누군가에게 한 턱 쏠 일이 생길 수 있어요.",
      "생각보다 배송비나 수수료가 붙을 수 있어요.",
      "할인처럼 보이는 게 실제로는 아닐 수 있으니 원가를 봐요.",
      "잔돈이나 영수증을 챙기지 못하고 지나칠 수 있어요.",
      "예약이나 결제 취소 조건을 한 번 확인해두면 좋아요.",
      "오늘은 지갑을 여는 횟수가 평소보다 많아질 수 있어요.",
      "자동결제 하나가 오늘 빠져나갈 수 있어요.",
      "결제 단계에서 예상 못 한 금액이 붙을 수 있어요.",
      "오늘은 여러 곳에서 조금씩 새어나갈 수 있어요.",
      "무료 체험이 유료로 넘어가는 시점일 수 있어요.",
      "남의 권유로 지갑을 열게 될 수 있어요.",
      "환불이나 교환 기한을 놓칠 수 있으니 확인해요.",
      "카드 실적이나 한도를 한 번 볼 필요가 있어요.",
    ],
  },
  work: {
    good: [
      "오전에 막혔던 일이 오후에 풀릴 수 있어요.",
      "오늘 마무리한 일에서 작은 칭찬을 들을 수 있어요.",
      "도움을 청하면 의외로 흔쾌히 도와주는 사람이 있어요.",
      "집중이 잘 되는 시간대가 오후에 찾아와요.",
      "찾던 자료나 답을 예상보다 빨리 얻을 수 있어요.",
      "오늘 보낸 메시지에 빠른 답이 올 거예요.",
      "미뤄둔 일 하나를 오늘 끝낼 수 있어요.",
      "회의나 대화가 예정보다 일찍 끝날 수 있어요.",
      "새로 배운 것 하나가 바로 쓸모 있게 돼요.",
      "오늘 낸 의견이 그대로 받아들여질 수 있어요.",
      "오늘 한 일에 대해 좋은 피드백이 돌아와요.",
      "필요한 사람과 타이밍 좋게 이야기가 닿아요.",
      "반복하던 일에서 더 빠른 방법을 찾게 돼요.",
      "오늘 정리한 자료가 바로 쓰이게 돼요.",
      "막연하던 일의 방향이 오늘 또렷해져요.",
      "부탁한 일이 예상보다 일찍 처리돼요.",
    ],
    normal: [
      "예상치 못한 연락이나 요청이 하나 들어올 수 있어요.",
      "회의나 대화가 예정보다 길어질 수 있어요.",
      "오늘 할 일은 계획한 순서대로 흘러가요.",
      "하던 일을 이어서 하는 데 대부분의 시간을 쓰게 돼요.",
      "확인이 필요한 일 하나가 답을 기다리게 돼요.",
      "오늘은 새 일보다 정리할 일이 많아요.",
      "짧은 잡담이 한 번 오갈 수 있어요.",
      "일정표를 한 번 고쳐 쓰게 될 수 있어요.",
      "오늘 처리량은 평소와 비슷한 수준이에요.",
      "자리를 비운 사이 연락이 와 있을 수 있어요.",
      "오늘은 회신을 기다리는 시간이 꽤 있어요.",
      "할 일 목록에서 하나를 지우고 하나를 더해요.",
      "오늘 회의는 결론보다 공유 위주로 흘러가요.",
      "업무 도구나 환경을 손볼 일이 생겨요.",
      "익숙한 일을 익숙한 방식으로 처리하게 돼요.",
      "짧은 확인 요청이 몇 번 오갈 수 있어요.",
    ],
    caution: [
      "작은 실수가 보일 수 있으니 보내기 전 한 번 더 확인해요.",
      "급하게 처리할 일이 하나 추가될 수 있어요.",
      "오늘은 마감이 생각보다 촉박하게 느껴질 수 있어요.",
      "전달이 한 번에 안 되어 되묻는 일이 생길 수 있어요.",
      "예정된 일정이 밀리면서 뒤가 밀릴 수 있어요.",
      "오늘은 여러 일을 동시에 잡기보다 하나씩 끝내는 게 나아요.",
      "필요한 승인이나 답변이 늦어질 수 있어요.",
      "파일이나 링크를 잘못 보낼 수 있으니 한 번 더 봐요.",
      "오후에 집중이 흐트러지는 구간이 있어요.",
      "오늘 정한 것은 기록으로 남겨두는 게 좋아요.",
      "마무리보다 시작만 여러 개 생길 수 있어요.",
      "보낸 내용을 다시 고쳐 보내게 될 수 있어요.",
      "일정이 겹쳐 하나를 미루게 될 수 있어요.",
      "구두로 정한 것이 어긋날 수 있으니 남겨둬요.",
      "자료를 찾는 데 예상보다 시간이 걸려요.",
      "오늘은 무리한 약속을 하지 않는 게 좋아요.",
    ],
  },
};

const LUCKY_COLORS = [
  "라벤더", "민트", "코랄", "골드",
  "스카이블루", "올리브", "버건디", "아이보리",
];

/** 톤별 운세 지수 구간 */
const SCORE_RANGE: Record<Tone, [number, number]> = {
  good: [70, 95],
  normal: [55, 80],
  caution: [40, 68],
};

export interface Fortune {
  text: string;
  score: number; // 운세 지수 (재미 요소)
  luckyColor: string;
  luckyNumber: number;
  /** 오늘 일진이 내 일간에게 어떤 십성인지 (5종) */
  tenGod: TenGod;
  /** 음양까지 구분한 십성 (10종) */
  tenGodFull: TenGodFull;
  /** 오늘 일진 지지에서 내 일간의 십이운성 */
  lifeStage: LifeStage;
  /** 오늘 일진 지지와 내 일지의 관계 */
  relation: BranchRelation;
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

/**
 * 오늘 일진이 내 일간에게 어떤 십성인지.
 * 일진의 천간·지지 오행 중 천간을 기준으로 봐요(일간 대 일간).
 */
export function todayTenGod(date: string, saju: Saju): TenGod {
  const today = dayPillarOf(date);
  return tenGodOf(saju.dayElement, stemElement(today.stem));
}

/** 오늘 일진의 지지 오행 — 럭키 요소 변주에만 사용 */
function todayBranchSeed(date: string): number {
  const today = dayPillarOf(date);
  return today.branch + branchElement(today.branch).charCodeAt(0);
}

/** 카테고리별로 특히 반가운 십성 (+1) / 부담스러운 십성 (-1) */
const CATEGORY_AFFINITY: Record<FortuneCategory, Partial<Record<TenGodFull, number>>> = {
  overall: { 정인: 1, 식신: 1, 겁재: -1, 편관: -1 },
  love: { 정재: 1, 식신: 1, 상관: 1, 겁재: -1, 편관: -1 },
  money: { 정재: 1, 편재: 1, 겁재: -1, 상관: -1 },
  work: { 정관: 1, 정인: 1, 상관: -1, 겁재: -1 },
};

/**
 * 그날의 기운 세기를 사주로 계산해요. 톤과 점수가 여기서 나와요.
 * - 용신(반가운 오행)이 오는 날인가       : +2 / -1
 * - 일진 지지에서 내 일간의 십이운성       : -2 ~ +2
 * - 일진 지지와 내 일지의 관계(충/합)      : -2 ~ +1
 * - 십성과 카테고리의 궁합                 : -1 ~ +1
 */
function dayPower(date: string, saju: Saju, category: FortuneCategory) {
  const today = dayPillarOf(date);
  const tenGodFull = tenGodFullOf(saju.dayStem, today.stem);
  const useful = usefulElementsOfV2(saju);
  const stage = lifeStageOf(saju.dayStem, today.branch);
  const relation = branchRelationOf(saju.day.branch, today.branch);

  let power = 0;
  power += useful.includes(stemElement(today.stem)) ? 2 : -1;
  power += LIFE_STAGE_POWER[stage] - 2;
  power += relation === "충" ? -2 : relation === "없음" ? 0 : 1;
  power += CATEGORY_AFFINITY[category][tenGodFull] ?? 0;

  const tone: Tone = power >= 2 ? "good" : power <= -2 ? "caution" : "normal";
  return { power, tone, tenGodFull, stage, relation };
}

/**
 * 사주(일간) × 그날 일진 × 카테고리 기반 결정적 운세.
 * @param recentTexts 최근에 이미 보여준 문장들. 여기 있는 건 다시 안 뽑아요.
 *   같은 문장이 사흘 만에 돌아오면 검증이라는 행위 자체가 무의미해 보여요.
 */
export function generateFortune(
  date: string,
  saju: Saju,
  category: FortuneCategory,
  recentTexts: readonly string[] = [],
): Fortune {
  const tenGod = todayTenGod(date, saju);
  const { power, tone, tenGodFull, stage, relation } = dayPower(
    date,
    saju,
    category,
  );

  const r = rng(
    hash(`${date}|${saju.day.name}|${saju.year.name}|${category}|${tenGodFull}`),
  );

  // 최근 본 문장은 후보에서 빼요. 전부 빠지면(풀이 작으면) 원래 풀로 되돌려요.
  const full = POOLS[category][tone];
  const recent = new Set(recentTexts);
  const fresh = full.filter((t) => !recent.has(t));
  const pool = fresh.length > 0 ? fresh : full;
  const text = pool[Math.floor(r() * pool.length)];

  // 점수도 톤 구간 안에서 기운 세기에 따라 움직여요
  const [lo, hi] = SCORE_RANGE[tone];
  const span = hi - lo;
  const bias = Math.max(0, Math.min(1, (power + 4) / 10));
  const score =
    lo + Math.round(span * (0.3 * bias + 0.7 * r()));

  const luckyColor = LUCKY_COLORS[Math.floor(r() * LUCKY_COLORS.length)];
  const luckyNumber = 1 + ((Math.floor(r() * 45) + todayBranchSeed(date)) % 45);

  return {
    text,
    score,
    luckyColor,
    luckyNumber,
    tenGod,
    tenGodFull,
    lifeStage: stage,
    relation,
  };
}
