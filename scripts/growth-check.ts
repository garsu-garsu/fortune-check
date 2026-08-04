// 리텐션 로직 자체 검증. 실행: npm run check:growth
// 무료 상세운 로테이션과 날짜 계산이 깨지면 즉시 throw.
import assert from "node:assert/strict";

import { freeDetailOf } from "../src/data/fortune.ts";
import { daysBetween, prevDate } from "../src/lib/kst.ts";

// ── daysBetween — 월/연 경계를 넘어도 맞아야 해요 ──
assert.equal(daysBetween("2026-08-04", "2026-08-04"), 0);
assert.equal(daysBetween("2026-08-03", "2026-08-04"), 1);
assert.equal(daysBetween("2026-07-31", "2026-08-01"), 1);
assert.equal(daysBetween("2025-12-31", "2026-01-01"), 1);
assert.equal(daysBetween("2026-08-04", "2026-08-03"), -1); // 미래 설치일 방어
// 윤년 2월
assert.equal(daysBetween("2028-02-28", "2028-03-01"), 2);

// prevDate 와 앞뒤가 맞아야 해요
for (const d of ["2026-01-01", "2026-03-01", "2026-08-04"]) {
  assert.equal(daysBetween(prevDate(d), d), 1);
}

// ── freeDetailOf — 매일 하나가 결정적으로 열리고, 실제로 돌아가야 해요 ──
// 같은 날은 항상 같은 결과 (밤 검증 때 아침과 달라지면 안 됨)
assert.equal(freeDetailOf("2026-08-04"), freeDetailOf("2026-08-04"));

// 30일 동안 세 종류가 모두 최소 한 번은 나와야 해요.
// (한 종류로 쏠리면 "매일 바뀌는 무료" 라는 재방문 이유가 사라져요)
const seen = new Map<string, number>();
let cursor = "2026-08-04";
for (let i = 0; i < 30; i++) {
  const cat = freeDetailOf(cursor);
  seen.set(cat, (seen.get(cat) ?? 0) + 1);
  cursor = prevDate(cursor);
}
assert.deepEqual(
  [...seen.keys()].sort(),
  ["love", "money", "work"],
  `30일 중 일부 카테고리가 한 번도 안 열렸어요: ${JSON.stringify([...seen])}`,
);
// 어느 한 종이 30일 중 절반을 넘게 차지하면 편향이에요
for (const [cat, n] of seen) {
  assert.ok(n <= 15, `${cat} 가 30일 중 ${n}일 — 쏠림이에요`);
}

console.log("growth-check OK", Object.fromEntries(seen));
