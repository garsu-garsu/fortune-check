// 사주(四柱) 계산 — 년/월/일/시주 간지, 오행 분포, 십성 관계.
// 외부 라이브러리 없이 저정밀 태양 황경으로 절기를 직접 구해요.
//
// 정확도:
//  - 일주: 오차 없음(60갑자 순환은 결정적).
//  - 년주/월주: 절기 경계를 태양 황경으로 계산 → 실제 절입 시각과 수십 분 이내.
//  - 시주: 생시를 입력한 경우만. 진태양시 보정은 안 해요(경도차 ~30분).
// 자시(子時) 유파: 일주는 KST 자정에 바뀌어요. 23~24시 출생은 그날 일간을
// 유지하고 시지만 자시가 돼요 — 이게 야자시설(夜子時)이에요.
// 자시일수설(23시부터 다음날 일주)을 쓰면 일간 자체가 달라져요.
// 유파 분기를 지원하려면 computeSaju 에 옵션 추가.

export const STEMS = [
  "갑", "을", "병", "정", "무", "기", "경", "신", "임", "계",
] as const;
export const BRANCHES = [
  "자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해",
] as const;

export const BRANCH_ANIMALS = [
  "쥐", "소", "호랑이", "토끼", "용", "뱀",
  "말", "양", "원숭이", "닭", "개", "돼지",
] as const;

export type Element = "목" | "화" | "토" | "금" | "수";

/** 천간의 오행 (갑을=목, 병정=화, 무기=토, 경신=금, 임계=수) */
const STEM_ELEMENTS: Element[] = [
  "목", "목", "화", "화", "토", "토", "금", "금", "수", "수",
];

/** 지지의 오행 (인묘=목, 사오=화, 진술축미=토, 신유=금, 해자=수) */
const BRANCH_ELEMENTS: Element[] = [
  "수", "토", "목", "목", "토", "화",
  "화", "토", "금", "금", "토", "수",
];

export interface Pillar {
  stem: number; // 0~9
  branch: number; // 0~11
  /** 예: "경오" */
  name: string;
}

export interface Saju {
  year: Pillar;
  month: Pillar;
  day: Pillar;
  /** 생시를 입력하지 않으면 null */
  hour: Pillar | null;
  /** 일간 — 명리에서 '나 자신'에 해당하는 글자 */
  dayStem: number;
  dayElement: Element;
  /** 원국 여덟(또는 여섯) 글자의 오행 개수 */
  elementCount: Record<Element, number>;
  /** 가장 많은 오행 */
  strongest: Element;
  /** 원국에 하나도 없는 오행 */
  missing: Element[];
}

const RAD = Math.PI / 180;

/**
 * 한국 표준시는 늘 UTC+9가 아니었어요. 시주는 2시간 단위라 30~60분 오차면
 * 시지가 한 칸 밀려요(= 다른 시주). 유파 문제가 아니라 시계에 관한 사실이에요.
 *  - 1954-03-21 ~ 1961-08-09 : UTC+8:30
 *  - 1987·1988 여름 서머타임  : UTC+10
 */
const KST_HISTORY: { from: string; to: string; minutes: number }[] = [
  { from: "1954-03-21", to: "1961-08-09", minutes: 8.5 * 60 },
  { from: "1987-05-10", to: "1987-10-11", minutes: 10 * 60 },
  { from: "1988-05-08", to: "1988-10-09", minutes: 10 * 60 },
];

/** 그 날짜에 한국에서 쓰던 표준시 오프셋(분) */
export function koreaOffsetMinutes(date: string): number {
  for (const r of KST_HISTORY) {
    if (date >= r.from && date <= r.to) return r.minutes;
  }
  return 9 * 60;
}

function pillar(stem: number, branch: number): Pillar {
  return { stem, branch, name: STEMS[stem] + BRANCHES[branch] };
}

/** 간지 60갑자 인덱스 → Pillar */
function pillarFromIndex(index: number): Pillar {
  const i = ((index % 60) + 60) % 60;
  return pillar(i % 10, i % 12);
}

/** UTC 밀리초 → 태양 황경(도, 0~360). 저정밀 근사(오차 ~0.01°). */
export function solarLongitude(utcMs: number): number {
  const n = utcMs / 86400000 + 2440587.5 - 2451545.0;
  const meanLong = 280.46 + 0.9856474 * n;
  const meanAnom = (357.528 + 0.9856003 * n) * RAD;
  const lambda =
    meanLong + 1.915 * Math.sin(meanAnom) + 0.02 * Math.sin(2 * meanAnom);
  return ((lambda % 360) + 360) % 360;
}

/** 해당 연도 입춘(태양황경 315°)의 UTC 밀리초. 2월 1~8일 구간을 이분 탐색. */
function ipchunMs(year: number): number {
  // 이 구간에서 황경은 311~322°로 단조 증가 → 랩어라운드 걱정 없음
  let lo = Date.UTC(year, 1, 1);
  let hi = Date.UTC(year, 1, 8);
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (solarLongitude(mid) < 315) lo = mid;
    else hi = mid;
  }
  return hi;
}

/** 태양 황경 → 월지 인덱스. 입춘(315°)이 인(寅)월의 시작. */
function monthBranchOf(lambda: number): number {
  const offset = Math.floor((((lambda - 315) % 360) + 360) % 360 / 30);
  return (2 + offset) % 12;
}

/**
 * 월간(月干) — 오호둔(五虎遁): 년간이 갑/기면 인월이 병인, 을/경이면 무인…
 * 인월 천간 = (년간 % 5) * 2 + 2
 */
function monthStemOf(yearStem: number, monthBranch: number): number {
  const tigerStem = ((yearStem % 5) * 2 + 2) % 10;
  const monthsFromTiger = (monthBranch - 2 + 12) % 12;
  return (tigerStem + monthsFromTiger) % 10;
}

/**
 * 시간(時干) — 오둔시(五鼠遁): 일간이 갑/기면 자시가 갑자, 을/경이면 병자…
 * 자시 천간 = (일간 % 5) * 2
 */
function hourStemOf(dayStem: number, hourBranch: number): number {
  return (((dayStem % 5) * 2) % 10 + hourBranch) % 10;
}

/** 시각(0~23) → 시지. 23~01시가 자시. */
function hourBranchOf(hour: number): number {
  return Math.floor(((hour + 1) % 24) / 2);
}

/**
 * 생년월일(+선택 생시)로 사주를 계산해요.
 * @param birthDate "YYYY-MM-DD" (양력, KST 기준)
 * @param birthTime "HH:MM" 또는 undefined
 */
export function computeSaju(birthDate: string, birthTime?: string): Saju {
  const y = Number(birthDate.slice(0, 4));
  const m = Number(birthDate.slice(5, 7));
  const d = Number(birthDate.slice(8, 10));

  // 절기 판정은 KST 정오 기준(생시를 모르는 경우의 관례).
  const hour = birthTime ? Number(birthTime.slice(0, 2)) : 12;
  const minute = birthTime ? Number(birthTime.slice(3, 5)) : 0;
  const utcMs =
    Date.UTC(y, m - 1, d, hour, minute) -
    koreaOffsetMinutes(birthDate) * 60000;

  // 년주 — 입춘 이전이면 전년도
  const sajuYear = utcMs < ipchunMs(y) ? y - 1 : y;
  const yearIndex = ((sajuYear - 1984) % 60 + 60) % 60; // 1984 = 갑자년
  const yearPillar = pillarFromIndex(yearIndex);

  // 월주 — 절기(태양 황경) 기준
  const monthBranch = monthBranchOf(solarLongitude(utcMs));
  const monthPillar = pillar(
    monthStemOf(yearPillar.stem, monthBranch),
    monthBranch,
  );

  // 일주 — 1970-01-01(KST) = 신사일, 60갑자 인덱스 17
  const daysSinceEpoch = Math.floor(Date.UTC(y, m - 1, d) / 86400000);
  const dayPillar = pillarFromIndex(daysSinceEpoch + 17);

  // 시주 — 생시를 입력한 경우만
  const hourPillar = birthTime
    ? (() => {
        const hb = hourBranchOf(hour);
        return pillar(hourStemOf(dayPillar.stem, hb), hb);
      })()
    : null;

  const pillars = [yearPillar, monthPillar, dayPillar];
  if (hourPillar) pillars.push(hourPillar);

  const elementCount: Record<Element, number> = {
    목: 0, 화: 0, 토: 0, 금: 0, 수: 0,
  };
  for (const p of pillars) {
    elementCount[STEM_ELEMENTS[p.stem]] += 1;
    elementCount[BRANCH_ELEMENTS[p.branch]] += 1;
  }

  const entries = Object.entries(elementCount) as [Element, number][];
  const strongest = entries.reduce((a, b) => (b[1] > a[1] ? b : a))[0];
  const missing = entries.filter(([, n]) => n === 0).map(([e]) => e);

  return {
    year: yearPillar,
    month: monthPillar,
    day: dayPillar,
    hour: hourPillar,
    dayStem: dayPillar.stem,
    dayElement: STEM_ELEMENTS[dayPillar.stem],
    elementCount,
    strongest,
    missing,
  };
}

/** 오늘 날짜의 일진(日辰) — 그날 전체에 흐르는 기운 */
export function dayPillarOf(date: string): Pillar {
  const y = Number(date.slice(0, 4));
  const m = Number(date.slice(5, 7));
  const d = Number(date.slice(8, 10));
  return pillarFromIndex(Math.floor(Date.UTC(y, m - 1, d) / 86400000) + 17);
}

export function stemElement(stem: number): Element {
  return STEM_ELEMENTS[stem];
}
export function branchElement(branch: number): Element {
  return BRANCH_ELEMENTS[branch];
}

// ── 오행 생극(生剋) ──────────────────────────────────────────────
const ORDER: Element[] = ["목", "화", "토", "금", "수"];
/** 상생: 목→화→토→금→수→목 */
function generates(a: Element, b: Element): boolean {
  return ORDER[(ORDER.indexOf(a) + 1) % 5] === b;
}
/** 상극: 목→토→수→화→금→목 */
function controls(a: Element, b: Element): boolean {
  return ORDER[(ORDER.indexOf(a) + 2) % 5] === b;
}

/** 십성(十星) — 나(일간)와 상대 오행의 관계 */
export type TenGod = "비겁" | "식상" | "재성" | "관성" | "인성";

export const TEN_GOD_MEANING: Record<TenGod, string> = {
  비겁: "동료·경쟁",
  식상: "표현·활동",
  재성: "재물·결실",
  관성: "책임·질서",
  인성: "도움·배움",
};

/** 내 일간 오행 기준으로 상대 오행이 무슨 십성인지 */
export function tenGodOf(mine: Element, other: Element): TenGod {
  if (mine === other) return "비겁";
  if (generates(mine, other)) return "식상";
  if (controls(mine, other)) return "재성";
  if (controls(other, mine)) return "관성";
  return "인성"; // other가 나를 생함
}

// ── 십성 10종 (음양까지 구분) ────────────────────────────────────
// 5종은 방향만 보지만, 명리 해석의 결은 음양에서 갈려요.
// 같은 재성이라도 정재(꾸준한 월급)와 편재(들쭉날쭉한 큰 돈)는 전혀 달라요.

/** 천간 음양 — 갑병무경임(짝수 인덱스)=양, 을정기신계(홀수)=음 */
export function isYangStem(stem: number): boolean {
  return stem % 2 === 0;
}

export type TenGodFull =
  | "비견" | "겁재"
  | "식신" | "상관"
  | "편재" | "정재"
  | "편관" | "정관"
  | "편인" | "정인";

/**
 * 일간 대 상대 천간의 십성(10종).
 * 음양이 같으면 편(偏, 치우침), 다르면 정(正, 조화).
 * 단 비겁만 반대예요 — 같은 음양이 비견(대등한 동료), 다르면 겁재(뺏는 경쟁자).
 */
export function tenGodFullOf(mineStem: number, otherStem: number): TenGodFull {
  const mine = STEM_ELEMENTS[mineStem];
  const other = STEM_ELEMENTS[otherStem];
  const samePolarity = isYangStem(mineStem) === isYangStem(otherStem);
  if (mine === other) return samePolarity ? "비견" : "겁재";
  if (generates(mine, other)) return samePolarity ? "식신" : "상관";
  if (controls(mine, other)) return samePolarity ? "편재" : "정재";
  if (controls(other, mine)) return samePolarity ? "편관" : "정관";
  return samePolarity ? "편인" : "정인";
}

/** 10종 → 5종으로 축약 (기존 톤 판정에 계속 써요) */
export function tenGodGroupOf(full: TenGodFull): TenGod {
  if (full === "비견" || full === "겁재") return "비겁";
  if (full === "식신" || full === "상관") return "식상";
  if (full === "편재" || full === "정재") return "재성";
  if (full === "편관" || full === "정관") return "관성";
  return "인성";
}

export const TEN_GOD_FULL_MEANING: Record<TenGodFull, string> = {
  비견: "나와 대등한 사람, 독립",
  겁재: "경쟁, 나눠 갖기",
  식신: "느긋한 표현, 먹고 즐기기",
  상관: "튀는 표현, 규칙 깨기",
  편재: "큰 돈, 유동적인 기회",
  정재: "꾸준한 수입, 성실함",
  편관: "갑작스러운 압박, 도전",
  정관: "질서, 책임, 인정",
  편인: "특이한 재주, 눈치",
  정인: "정통한 배움, 보살핌",
};

// ── 십이운성(十二運星) ───────────────────────────────────────────
// 일간이 어떤 지지 위에서 얼마나 힘이 있는지. 같은 십성이 와도
// 제왕지에서 만나면 크게, 절지에서 만나면 약하게 작용해요.

export const LIFE_STAGES = [
  "장생", "목욕", "관대", "건록", "제왕", "쇠",
  "병", "사", "묘", "절", "태", "양",
] as const;
export type LifeStage = (typeof LIFE_STAGES)[number];

/** 천간별 장생지. 양간은 여기서 순행, 음간은 역행해요. */
const LIFE_STAGE_START = [11, 6, 2, 9, 2, 9, 5, 0, 8, 3];

export function lifeStageOf(stem: number, branch: number): LifeStage {
  const dir = isYangStem(stem) ? 1 : -1;
  const steps = ((((branch - LIFE_STAGE_START[stem]) * dir) % 12) + 12) % 12;
  return LIFE_STAGES[steps];
}

/** 십이운성의 기운 세기 (0=바닥, 4=절정). 문장 톤을 정할 때 써요. */
export const LIFE_STAGE_POWER: Record<LifeStage, number> = {
  장생: 3, 목욕: 2, 관대: 3, 건록: 4, 제왕: 4, 쇠: 2,
  병: 1, 사: 1, 묘: 1, 절: 0, 태: 1, 양: 2,
};

// ── 지지 관계 (충·합) ────────────────────────────────────────────
// 오늘 일진의 지지가 내 일지와 부딪히는지(충) 어울리는지(합).
// 충이면 변동·마찰, 합이면 협력·인연으로 읽어요.

export type BranchRelation = "충" | "육합" | "삼합" | "없음";

/** 육합: 자축, 인해, 묘술, 진유, 사신, 오미 */
const SIX_HARMONY: Record<number, number> = {
  0: 1, 1: 0, 2: 11, 11: 2, 3: 10, 10: 3,
  4: 9, 9: 4, 5: 8, 8: 5, 6: 7, 7: 6,
};

/** 삼합 그룹 — 인오술(화국), 신자진(수국), 사유축(금국), 해묘미(목국) */
const TRIPLE_GROUPS: number[][] = [
  [2, 6, 10], [8, 0, 4], [5, 9, 1], [11, 3, 7],
];

function tripleGroupOf(branch: number): number[] {
  return TRIPLE_GROUPS.find((g) => g.includes(branch))!;
}

export function branchRelationOf(a: number, b: number): BranchRelation {
  if (a === b) return "없음";
  if ((a + 6) % 12 === b) return "충"; // 정반대 자리
  if (SIX_HARMONY[a] === b) return "육합";
  if (tripleGroupOf(a).includes(b)) return "삼합";
  return "없음";
}

// ── 신살(神殺) ───────────────────────────────────────────────────
// 일지의 삼합 그룹을 기준으로 잡는 대표 3종.

export type Sinsal = "도화" | "역마" | "화개";

/** 삼합 그룹 대표지(첫 글자) → 도화/역마/화개 지지 */
const SINSAL_MAP: Record<number, Record<Sinsal, number>> = {
  2: { 도화: 3, 역마: 8, 화개: 10 }, // 인오술
  8: { 도화: 9, 역마: 2, 화개: 4 }, // 신자진
  5: { 도화: 6, 역마: 11, 화개: 1 }, // 사유축
  11: { 도화: 0, 역마: 5, 화개: 7 }, // 해묘미
};

export const SINSAL_MEANING: Record<Sinsal, string> = {
  도화: "사람을 끄는 매력",
  역마: "이동과 변화",
  화개: "혼자 파고드는 재주",
};

/** 기준 지지(보통 일지)에서 봤을 때 대상 지지가 어떤 신살인지 */
export function sinsalOf(baseBranch: number, target: number): Sinsal | null {
  const table = SINSAL_MAP[tripleGroupOf(baseBranch)[0]];
  for (const key of ["도화", "역마", "화개"] as Sinsal[]) {
    if (table[key] === target) return key;
  }
  return null;
}

/** 천을귀인(天乙貴人) — 일간 기준. 있으면 귀인의 도움을 뜻해요. */
const NOBLEMAN: number[][] = [
  [1, 7], [0, 8], [11, 9], [11, 9], [1, 7],
  [0, 8], [1, 7], [2, 6], [5, 3], [5, 3],
];

export function isNobleman(dayStem: number, branch: number): boolean {
  return NOBLEMAN[dayStem].includes(branch);
}

// ── 신강/신약 ────────────────────────────────────────────────────

export type BodyStrength = "신강" | "중화" | "신약";

/**
 * 일간을 돕는 기운(비겁·인성)이 원국에서 얼마나 되는지로 판정해요.
 * 신강이면 덜어내는 기운(식상·재성·관성)이, 신약이면 돕는 기운이 반가워요.
 */
export function bodyStrengthOf(saju: Saju): BodyStrength {
  let support = 0;
  let total = 0;
  for (const [el, n] of Object.entries(saju.elementCount) as [Element, number][]) {
    total += n;
    const god = tenGodOf(saju.dayElement, el);
    if (god === "비겁" || god === "인성") support += n;
  }
  const ratio = support / total;
  if (ratio >= 0.5) return "신강";
  if (ratio <= 0.3) return "신약";
  return "중화";
}

/** 지금 나에게 반가운 오행(용신 근사). 신강이면 덜어내고, 신약이면 채워요. */
export function usefulElementsOf(saju: Saju): Element[] {
  const strength = bodyStrengthOf(saju);
  const wanted: TenGod[] =
    strength === "신강"
      ? ["식상", "재성", "관성"]
      : strength === "신약"
        ? ["비겁", "인성"]
        : ["재성", "관성"];
  return ORDER.filter((el) => wanted.includes(tenGodOf(saju.dayElement, el)));
}

// ── 지장간(支藏干) ───────────────────────────────────────────────
// 지지 안에는 천간이 숨어 있어요. 이걸 안 보면 오행 세기가 통째로 틀어져요.
// 여기(餘氣)·중기(中氣)·정기(正氣) 순이고, 정기가 그 지지의 본체예요.

interface HiddenStem {
  stem: number;
  /** 그 지지 안에서 차지하는 비중 (정기가 가장 큼) */
  weight: number;
}

const HIDDEN_STEMS: HiddenStem[][] = [
  [{ stem: 9, weight: 1 }], // 자 — 계
  [{ stem: 5, weight: 0.6 }, { stem: 9, weight: 0.2 }, { stem: 7, weight: 0.2 }], // 축 — 기계신
  [{ stem: 0, weight: 0.6 }, { stem: 2, weight: 0.2 }, { stem: 4, weight: 0.2 }], // 인 — 갑병무
  [{ stem: 1, weight: 1 }], // 묘 — 을
  [{ stem: 4, weight: 0.6 }, { stem: 1, weight: 0.2 }, { stem: 9, weight: 0.2 }], // 진 — 무을계
  [{ stem: 2, weight: 0.6 }, { stem: 4, weight: 0.2 }, { stem: 6, weight: 0.2 }], // 사 — 병무경
  [{ stem: 3, weight: 0.7 }, { stem: 5, weight: 0.3 }], // 오 — 정기
  [{ stem: 5, weight: 0.6 }, { stem: 3, weight: 0.2 }, { stem: 1, weight: 0.2 }], // 미 — 기정을
  [{ stem: 6, weight: 0.6 }, { stem: 8, weight: 0.2 }, { stem: 4, weight: 0.2 }], // 신 — 경임무
  [{ stem: 7, weight: 1 }], // 유 — 신
  [{ stem: 4, weight: 0.6 }, { stem: 7, weight: 0.2 }, { stem: 3, weight: 0.2 }], // 술 — 무신정
  [{ stem: 8, weight: 0.7 }, { stem: 0, weight: 0.3 }], // 해 — 임갑
];

/** 지지에 숨은 천간들 (정기가 맨 앞) */
export function hiddenStemsOf(branch: number): number[] {
  return HIDDEN_STEMS[branch].map((h) => h.stem);
}

/** 지지의 본기(本氣) — 그 지지를 대표하는 천간 */
export function principalStemOf(branch: number): number {
  return HIDDEN_STEMS[branch][0].stem;
}

// ── 신강/신약 정밀 판정 (득령·득지·득세) ─────────────────────────
// 여덟 글자를 똑같이 세면 안 돼요. 월지(월령)가 압도적으로 무겁고,
// 그다음이 일지(내가 깔고 앉은 자리)예요.

export interface Strength {
  verdict: BodyStrength;
  /** 월지가 나를 돕는가 — 가장 무거운 한 표 */
  hasSeason: boolean;
  /** 일지가 나를 돕는가 */
  hasGround: boolean;
  /** 나머지 글자들이 나를 돕는가 */
  hasCrowd: boolean;
  /** 0~1로 정규화한 나를 돕는 세력 */
  supportRatio: number;
}

/** 천간이 일간을 돕는 편인지(비겁·인성) */
function supportsMe(dayElement: Element, stem: number): boolean {
  const god = tenGodOf(dayElement, STEM_ELEMENTS[stem]);
  return god === "비겁" || god === "인성";
}

/** 자리별 가중치 — 월지가 가장 무거워요 */
const POS_WEIGHT = { monthBranch: 3, dayBranch: 2, other: 1 };

/**
 * 득령(월지)·득지(일지)·득세(나머지)로 신강약을 봐요.
 * 지장간까지 비중을 실어서 계산해요.
 */
export function strengthOf(saju: Saju): Strength {
  const me = saju.dayElement;
  let support = 0;
  let total = 0;

  const add = (stem: number, weight: number) => {
    total += weight;
    if (supportsMe(me, stem)) support += weight;
  };

  const pillars = [saju.year, saju.month, saju.day, saju.hour].filter(
    (p): p is Pillar => p != null,
  );
  for (const p of pillars) {
    // 일간 자신은 세지 않아요(기준점이라)
    if (p !== saju.day) add(p.stem, POS_WEIGHT.other);
    const w =
      p === saju.month
        ? POS_WEIGHT.monthBranch
        : p === saju.day
          ? POS_WEIGHT.dayBranch
          : POS_WEIGHT.other;
    for (const h of HIDDEN_STEMS[p.branch]) add(h.stem, w * h.weight);
  }

  const hasSeason = HIDDEN_STEMS[saju.month.branch].some(
    (h) => h.weight >= 0.5 && supportsMe(me, h.stem),
  );
  const hasGround = HIDDEN_STEMS[saju.day.branch].some(
    (h) => h.weight >= 0.5 && supportsMe(me, h.stem),
  );
  const supportRatio = total === 0 ? 0 : support / total;
  // 월지가 무거우므로 득령을 한 번 더 반영하되, 보너스 폭을 중화 밴드보다
  // 좁게 둬요. ±0.15(스윙 0.30)는 중화 밴드(0.20)보다 넓어서 판정이 사실상
  // 득령 하나로 결정되고 득지·득세가 죽어버려요.
  const score = supportRatio + (hasSeason ? 0.07 : -0.07);

  return {
    verdict: score >= 0.55 ? "신강" : score <= 0.35 ? "신약" : "중화",
    hasSeason,
    hasGround,
    hasCrowd: supportRatio >= 0.5,
    supportRatio,
  };
}

// ── 조후(調候) ───────────────────────────────────────────────────
// 계절의 춥고 더움. 여름 태생이 화가 많으면 물이 급하고,
// 겨울 태생이 수가 많으면 불이 급해요. 용신 판정의 큰 축이에요.

export type Climate = "한랭" | "온화" | "염열";

/** 월지로 보는 계절 기운. 해자축=겨울, 사오미=여름. */
export function climateOf(monthBranch: number): Climate {
  if ([11, 0, 1].includes(monthBranch)) return "한랭";
  if ([5, 6, 7].includes(monthBranch)) return "염열";
  return "온화";
}

/** 조후로 급히 필요한 오행. 없으면 빈 배열. */
export function climateNeedOf(saju: Saju): Element[] {
  const climate = climateOf(saju.month.branch);
  if (climate === "한랭") return ["화"];
  if (climate === "염열") return ["수"];
  return [];
}

/**
 * 최종 용신 근사 — 조후를 먼저 보고, 없으면 억부(신강약)로 정해요.
 * 실제 명리도 조후가 급하면 조후를 우선해요.
 */
export function usefulElementsOfV2(saju: Saju): Element[] {
  const s = strengthOf(saju);
  const wanted: TenGod[] =
    s.verdict === "신강"
      ? ["식상", "재성", "관성"]
      : s.verdict === "신약"
        ? ["비겁", "인성"]
        : ["재성", "관성"];
  const balance = ORDER.filter((el) =>
    wanted.includes(tenGodOf(saju.dayElement, el)),
  );

  // 조후는 '우선 고려'지 '단독 결정'이 아니에요.
  // 예전엔 조후가 급하면 억부를 통째로 건너뛰어서, 재다신약 사주에게
  // 재성을 용신이라고 말하는 일이 생겼어요. 이제 앞에 세우되 억부를 남겨요.
  const urgent = climateNeedOf(saju).filter(
    (el) => saju.elementCount[el] <= 1 && !balance.includes(el),
  );
  return [...urgent, ...balance];
}

// ── 천간 합·충 ───────────────────────────────────────────────────
// 천간합: 갑기합토, 을경합금, 병신합수, 정임합목, 무계합화 (5 차이)
// 천간충: 갑경, 을신, 병임, 정계 (6 차이, 토는 충 없음)

export type StemRelation = "합" | "충" | "없음";

export function stemRelationOf(a: number, b: number): StemRelation {
  // 충은 "거리 6"이라 대칭이에요. mod-10 단방향 오프셋으로 재면 비대칭이 되어
  // 경갑(충)을 놓치고 경병(충 아님)을 충이라 답해요.
  // 거리 6짝은 갑경·을신·병임·정계뿐이라 토 예외 처리도 필요 없어요.
  if (Math.abs(a - b) === 6) return "충";
  if (((b - a) % 10 + 10) % 10 === 5) return "합";
  return "없음";
}

/** 천간합이 만들어내는 오행 (갑기→토, 을경→금, 병신→수, 정임→목, 무계→화) */
const COMBINE_ELEMENT: Element[] = ["토", "금", "수", "목", "화"];
export function stemCombineElement(a: number, b: number): Element | null {
  if (stemRelationOf(a, b) !== "합") return null;
  return COMBINE_ELEMENT[Math.min(a, b) % 5];
}

// ── 지지 형·파·해 ────────────────────────────────────────────────

export type BranchHarm = "형" | "파" | "해" | "없음";

/** 삼형: 인사신, 축술미 / 상형: 자묘 / 자형: 진진 오오 유유 해해 */
const PUNISH_GROUPS: number[][] = [[2, 5, 8], [1, 10, 7], [0, 3]];
const SELF_PUNISH = [4, 6, 9, 11];

/** 육파: 자유, 축진, 인해, 묘오, 사신, 미술 */
const BREAK_PAIRS: [number, number][] = [
  [0, 9], [1, 4], [2, 11], [3, 6], [5, 8], [7, 10],
];

/** 육해: 자미, 축오, 인사, 묘진, 신해, 유술 */
const HARM_PAIRS: [number, number][] = [
  [0, 7], [1, 6], [2, 5], [3, 4], [8, 11], [9, 10],
];

function inPairs(pairs: [number, number][], a: number, b: number): boolean {
  return pairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

export function branchHarmOf(a: number, b: number): BranchHarm {
  if (a === b) return SELF_PUNISH.includes(a) ? "형" : "없음";
  if (PUNISH_GROUPS.some((g) => g.includes(a) && g.includes(b))) return "형";
  if (inPairs(BREAK_PAIRS, a, b)) return "파";
  if (inPairs(HARM_PAIRS, a, b)) return "해";
  return "없음";
}

// ── 공망(空亡) ───────────────────────────────────────────────────
// 60갑자를 10개씩 여섯 순(旬)으로 나누면 지지 둘이 남아요. 그 둘이 공망.
// 공망에 든 자리는 힘이 비어 결과가 잘 안 맺힌다고 봐요.

export function voidBranchesOf(pillar: Pillar): [number, number] {
  // 순의 시작(갑) 위치를 찾아 거기서 10칸 뒤 두 지지가 공망
  const start = ((pillar.branch - pillar.stem) % 12 + 12) % 12;
  return [(start + 10) % 12, (start + 11) % 12];
}

export function isVoid(dayPillar: Pillar, branch: number): boolean {
  return voidBranchesOf(dayPillar).includes(branch);
}

// ── 대운(大運) ───────────────────────────────────────────────────
// 10년마다 바뀌는 큰 흐름. 월주에서 출발해 순행/역행해요.
// 방향: 양남·음녀는 순행, 음남·양녀는 역행.

export type Gender = "남" | "여";

export interface Fortune10 {
  /** 이 대운이 시작되는 나이(세는나이 근사) */
  startAge: number;
  pillar: Pillar;
}

/**
 * 절입(節入) 시각을 찾아요. 월지가 바뀌는 경계는 황경 315° + 30°k 지점이에요.
 * @param next true면 이 시점 이후 첫 절입, false면 이 시점이 속한 절기의 시작
 */
function termBoundaryMs(utcMs: number, next: boolean): number {
  const lambda = solarLongitude(utcMs);
  const k = Math.floor(((((lambda - 315) % 360) + 360) % 360) / 30);
  const target = (315 + 30 * (next ? k + 1 : k)) % 360;
  // 목표 황경과의 부호 있는 차이. 40일 구간에선 황경이 ~40° 움직이므로
  // ±180 안에 머물러 단조 증가해요.
  const g = (t: number) => (((solarLongitude(t) - target + 540) % 360) - 180);
  const DAY = 86400000;
  let lo = next ? utcMs : utcMs - 40 * DAY;
  let hi = next ? utcMs + 40 * DAY : utcMs;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (g(mid) < 0) lo = mid;
    else hi = mid;
  }
  return hi;
}

/**
 * 대운수 — 대운이 시작되는 나이.
 * 순행이면 생일부터 다음 절입까지, 역행이면 이전 절입부터 생일까지의
 * 날수를 3으로 나눠요(3일 = 1년). 최소 1.
 */
export function majorFortuneStartAge(
  birthDate: string,
  birthTime: string | undefined,
  forward: boolean,
): number {
  const y = Number(birthDate.slice(0, 4));
  const m = Number(birthDate.slice(5, 7));
  const d = Number(birthDate.slice(8, 10));
  const hh = birthTime ? Number(birthTime.slice(0, 2)) : 12;
  const mm = birthTime ? Number(birthTime.slice(3, 5)) : 0;
  const birth =
    Date.UTC(y, m - 1, d, hh, mm) - koreaOffsetMinutes(birthDate) * 60000;

  const boundary = termBoundaryMs(birth, forward);
  const days = Math.abs(boundary - birth) / 86400000;
  return Math.max(1, Math.round(days / 3));
}

/** 양남·음녀는 순행, 음남·양녀는 역행 */
export function fortuneDirectionOf(saju: Saju, gender: Gender): boolean {
  const yearIsYang = isYangStem(saju.year.stem);
  return (yearIsYang && gender === "남") || (!yearIsYang && gender === "여");
}

/**
 * 대운 목록(기본 8개 = 80년치). 월주에서 출발해 순행/역행해요.
 * 시작 나이는 절입까지의 실제 날수로 계산한 대운수예요.
 */
export function majorFortunesOf(
  saju: Saju,
  gender: Gender,
  birthDate: string,
  birthTime?: string,
  count = 8,
): Fortune10[] {
  const forward = fortuneDirectionOf(saju, gender);
  const startAge = majorFortuneStartAge(birthDate, birthTime, forward);
  const out: Fortune10[] = [];
  for (let i = 1; i <= count; i++) {
    const step = forward ? i : -i;
    const stem = ((saju.month.stem + step) % 10 + 10) % 10;
    const branch = ((saju.month.branch + step) % 12 + 12) % 12;
    out.push({ startAge: startAge + (i - 1) * 10, pillar: pillar(stem, branch) });
  }
  return out;
}

/** 나이로 지금 어느 대운에 있는지 */
export function currentFortune10(
  fortunes: Fortune10[],
  age: number,
): Fortune10 | null {
  let cur: Fortune10 | null = null;
  for (const f of fortunes) if (age >= f.startAge) cur = f;
  return cur;
}

/** 해당 연도의 세운(歲運) — 그해 간지 */
export function yearPillarOf(year: number): Pillar {
  return pillarFromIndex(((year - 1984) % 60 + 60) % 60);
}
