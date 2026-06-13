// 생년월일 → 띠(12지) / 별자리(12궁) 산출.
// (음력 설 경계는 MVP에서 단순화 — 양력 연/월/일 기준. 정통 만세력은 2차.)

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

export function zodiacOf(birthDate: string): Zodiac {
  const year = Number(birthDate.slice(0, 4));
  return ANIMALS[((year % 12) + 12) % 12];
}

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
