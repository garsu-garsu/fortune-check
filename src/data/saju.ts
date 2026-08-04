// 사주(四柱) 계산 — 년/월/일/시주 간지, 오행 분포, 십성 관계.
// 외부 라이브러리 없이 저정밀 태양 황경으로 절기를 직접 구해요.
//
// 정확도:
//  - 일주: 오차 없음(60갑자 순환은 결정적).
//  - 년주/월주: 절기 경계를 태양 황경으로 계산 → 실제 절입 시각과 수십 분 이내.
//  - 시주: 생시를 입력한 경우만. 진태양시 보정은 안 해요(경도차 ~30분).
// ponytail: 야자시(23~24시를 다음날로 보는 유파)는 채택 안 함 — KST 자정 기준.
//           유파 분기를 지원하려면 dayPillar에 옵션 추가.

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
  const utcMs = Date.UTC(y, m - 1, d, hour - 9, minute); // KST = UTC+9

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
