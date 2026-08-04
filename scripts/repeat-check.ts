// 운세 문장이 며칠 만에 반복되는지 측정. 실행: npm run check:repeat
// 매일 여는 앱에서 사흘 만에 같은 문장이 나오면 검증 자체가 무의미해 보여요.
// 앱과 똑같이 "최근 N일 본 문장 제외"를 적용한 상태로 잽니다.
import assert from "node:assert/strict";

import { generateFortune } from "../src/data/fortune.ts";
import { computeSaju } from "../src/data/saju.ts";

const NO_REPEAT_DAYS = 14; // state.tsx 와 같은 값
const CATS = ["overall", "love", "money", "work"] as const;
const BIRTHS = [
  "1988-03-14", "1995-11-02", "1979-07-23",
  "2001-01-09", "1969-09-30", "1990-05-15",
];

function nextDate(d: string): string {
  const [y, m, dd] = d.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, dd));
  t.setUTCDate(t.getUTCDate() + 1);
  return t.toISOString().slice(0, 10);
}

let worst = Infinity;
let worstLabel = "";

for (const cat of CATS) {
  let firstRepeatSum = 0;
  let uniqueSum = 0;

  for (const birth of BIRTHS) {
    const saju = computeSaju(birth);
    const history: string[] = []; // 날짜순으로 쌓이는 실제 노출 이력
    const seenAt = new Map<string, number>();
    let firstRepeat = Infinity;
    let day = "2026-08-04";

    for (let i = 1; i <= 120; i++) {
      // 앱과 동일하게 최근 10일치만 제외 목록으로 넘겨요
      const recent = history.slice(-NO_REPEAT_DAYS);
      const t = generateFortune(day, saju, cat, recent).text;
      if (seenAt.has(t)) {
        firstRepeat = Math.min(firstRepeat, i - seenAt.get(t)!);
      }
      seenAt.set(t, i);
      history.push(t);
      day = nextDate(day);
    }

    firstRepeatSum += firstRepeat === Infinity ? 120 : firstRepeat;
    uniqueSum += seenAt.size;

    if (firstRepeat < worst) {
      worst = firstRepeat;
      worstLabel = `${cat} / ${birth}`;
    }
  }

  console.log(
    `${cat.padEnd(8)} 120일간 서로 다른 문장 ${(uniqueSum / BIRTHS.length).toFixed(1)}개 · ` +
      `첫 반복까지 평균 ${(firstRepeatSum / BIRTHS.length).toFixed(1)}일`,
  );
}

console.log(`\n최악의 경우: ${worstLabel} — ${worst}일 만에 반복`);

// 제외 기간을 걸었으니 그 안에서는 절대 반복되면 안 돼요.
assert.ok(
  worst > NO_REPEAT_DAYS,
  `최근 ${NO_REPEAT_DAYS}일 제외를 걸었는데 ${worst}일 만에 반복됐어요 (${worstLabel})`,
);

console.log("repeat-check OK");
