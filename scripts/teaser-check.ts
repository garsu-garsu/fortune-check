// 잠금 카드의 "앞 한 줄만 보이기" 규칙 점검. 실행: npm run check:teaser
// 규칙이 깨지면 전부 보이거나(광고 볼 이유 소멸) 아무것도 안 보여요(뭘 여는지 모름).
import assert from "node:assert/strict";

import { generateFortune } from "../src/data/fortune.ts";
import { computeSaju } from "../src/data/saju.ts";
import { periodReading, readSaju } from "../src/data/reading.ts";
import { dayPillarOf } from "../src/data/saju.ts";
import { splitTeaser } from "../src/lib/teaser.ts";

function check(text: string, where: string) {
  const [head, tail] = splitTeaser(text);
  assert.equal(head + tail, text, `${where}: 잘린 조각을 합치면 원문이어야 해요`);
  assert.ok(head.length > 0, `${where}: 보여줄 몫이 없어요 — "${text}"`);
  assert.ok(tail.length > 0, `${where}: 가릴 몫이 없어요 — "${text}"`);
  // 절반 넘게 보여주면 광고를 볼 이유가 사라져요(짧은 글은 최소 노출 12자 예외)
  assert.ok(
    head.length <= 12 || head.length <= text.length * 0.6,
    `${where}: 너무 많이 보여줘요 (${head.length}/${text.length}) — "${text}"`,
  );
}

// 1) 홈의 상세운 문장(대부분 한 문장)
const saju = computeSaju("1988-03-14", "09:20");
let n = 0;
for (const cat of ["love", "money", "work"] as const) {
  for (let d = 0; d < 60; d++) {
    const date = new Date(Date.UTC(2026, 0, 1 + d)).toISOString().slice(0, 10);
    check(generateFortune(date, saju, cat, []).text, `홈 ${cat} ${date}`);
    n++;
  }
}

// 2) 사주 풀이 본문(여러 문장·줄바꿈 포함)
for (const birth of ["1988-03-14", "1995-11-02", "1979-07-23", "2001-05-05"]) {
  const s = computeSaju(birth, "09:20");
  for (const sec of readSaju(s, birth, "09:20", "남", "2026-08-04").sections) {
    check(sec.body, `풀이 ${birth} ${sec.title}`);
    n++;
  }
  for (const unit of ["일", "월", "년"] as const) {
    for (const sec of periodReading(s, dayPillarOf("2026-08-04"), unit)) {
      check(sec.body, `기간 ${birth} ${unit} ${sec.title}`);
      n++;
    }
  }
}

// 3) 경계 케이스
assert.deepEqual(splitTeaser("짧다."), ["짧", "다."]);
const [h] = splitTeaser("첫 문장이에요. 둘째 문장이에요. 셋째도 있어요.");
assert.equal(h, "첫 문장이에요. ", "여러 문장이면 첫 문장까지");

console.log(`✅ ${n}개 문구 모두 "앞 일부만 노출" 규칙을 지켜요`);
