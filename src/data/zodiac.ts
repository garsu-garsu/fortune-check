// 생년월일 → 띠(12지) / 별자리(12궁) 산출.
// 띠는 사주 년주(입춘 기준)에서 뽑아요 — 별자리만 양력 월/일 기준이에요.

// 확장자를 붙여야 scripts/*.ts 가 node --experimental-strip-types 로 이 파일을 읽어요.
import { computeSaju } from "./saju.ts";

export interface Zodiac {
  name: string; // 예: "말띠"
  emoji: string;
}
export interface StarSign {
  name: string; // 예: "물병자리"
  emoji: string;
}

const ANIMALS: Zodiac[] = [
  { name: "원숭이띠", emoji: "🐵" },
  { name: "닭띠", emoji: "🐔" },
  { name: "개띠", emoji: "🐶" },
  { name: "돼지띠", emoji: "🐷" },
  { name: "쥐띠", emoji: "🐭" },
  { name: "소띠", emoji: "🐮" },
  { name: "호랑이띠", emoji: "🐯" },
  { name: "토끼띠", emoji: "🐰" },
  { name: "용띠", emoji: "🐲" },
  { name: "뱀띠", emoji: "🐍" },
  { name: "말띠", emoji: "🐴" },
  { name: "양띠", emoji: "🐑" },
];

/**
 * 띠 — 사주 년주의 지지예요. 양력 연도가 아니라 **입춘(立春)** 이 경계라
 * 1/1~입춘 출생자는 전년도 띠가 돼요(전체의 약 9%). 사주 카드와 어긋나면
 * 같은 화면에서 띠가 둘로 갈려요.
 */
export function zodiacOf(birthDate: string): Zodiac {
  const z = ZODIAC_PICK[computeSaju(birthDate).year.branch];
  return { name: `${z.name}띠`, emoji: z.emoji };
}

/**
 * 띠 고르기 UI 용 목록 — **지지(地支) 인덱스 순서**(0=자/쥐)예요.
 * 위 ANIMALS 는 `year % 12` 순서(0=원숭이)라 지지 인덱스와 달라요.
 * 사주 계산(branchRelationOf·sinsalOf 등)에 넘길 인덱스는 반드시 이 목록 기준이어야 해요.
 * saju.ts 의 BRANCH_ANIMALS 와 순서가 같은지는 `npm run check:preview` 가 지켜요.
 */
export const ZODIAC_PICK = [
  { emoji: "🐭", name: "쥐" }, { emoji: "🐮", name: "소" }, { emoji: "🐯", name: "호랑이" },
  { emoji: "🐰", name: "토끼" }, { emoji: "🐲", name: "용" }, { emoji: "🐍", name: "뱀" },
  { emoji: "🐴", name: "말" }, { emoji: "🐑", name: "양" }, { emoji: "🐵", name: "원숭이" },
  { emoji: "🐔", name: "닭" }, { emoji: "🐶", name: "개" }, { emoji: "🐷", name: "돼지" },
] as const;

const SIGNS: { name: string; emoji: string; from: [number, number] }[] = [
  { name: "염소자리", emoji: "♑", from: [12, 22] },
  { name: "물병자리", emoji: "♒", from: [1, 20] },
  { name: "물고기자리", emoji: "♓", from: [2, 19] },
  { name: "양자리", emoji: "♈", from: [3, 21] },
  { name: "황소자리", emoji: "♉", from: [4, 20] },
  { name: "쌍둥이자리", emoji: "♊", from: [5, 21] },
  { name: "게자리", emoji: "♋", from: [6, 22] },
  { name: "사자자리", emoji: "♌", from: [7, 23] },
  { name: "처녀자리", emoji: "♍", from: [8, 23] },
  { name: "천칭자리", emoji: "♎", from: [9, 23] },
  { name: "전갈자리", emoji: "♏", from: [10, 23] },
  { name: "사수자리", emoji: "♐", from: [11, 22] },
];

export function starSignOf(birthDate: string): StarSign {
  const m = Number(birthDate.slice(5, 7));
  const d = Number(birthDate.slice(8, 10));
  // 해당 월의 시작일 이상이면 그 별자리, 아니면 이전 항목
  let idx = SIGNS.findIndex(
    (s) => s.from[0] === m && d >= s.from[1],
  );
  if (idx === -1) {
    // 시작일 이전 → 이전 달 별자리
    const cur = SIGNS.findIndex((s) => s.from[0] === m);
    idx = (cur - 1 + SIGNS.length) % SIGNS.length;
  }
  const s = SIGNS[idx];
  return { name: s.name, emoji: s.emoji };
}

export const ALL_ZODIACS = ANIMALS;
