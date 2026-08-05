// 띠 미리보기 매핑 검증. 실행: npm run check:preview
// ZODIAC_PICK(띠 고르기 UI)이 BRANCH_ANIMALS(지지 인덱스)와 순서가 같은지,
// 알려진 명리 관계가 맞는지, 십성이 항상 결과를 주는지 확인해요.
// 순서가 어긋나면 모든 사용자에게 틀린 궁합이 나가요 — 이 변경의 유일한 실질 위험이에요.
import assert from "node:assert/strict";

import {
  BRANCH_ANIMALS,
  branchElement,
  branchRelationOf,
  dayPillarOf,
  stemElement,
  tenGodOf,
} from "../src/data/saju.ts";
import { ALL_ZODIACS, ZODIAC_PICK, zodiacOf } from "../src/data/zodiac.ts";

assert.equal(ZODIAC_PICK.length, 12, "띠는 12개여야 해요");
ZODIAC_PICK.forEach((z, i) => {
  assert.equal(
    z.name,
    BRANCH_ANIMALS[i],
    `ZODIAC_PICK[${i}]="${z.name}" ≠ BRANCH_ANIMALS[${i}]="${BRANCH_ANIMALS[i]}" — 오프바이원 의심`,
  );
});

// ── 2026-08-05 알려진 명리 관계 ──
// 신해일(지지 해=11) → 뱀띠(5)=충, 호랑이띠(2)=육합, 토끼띠(3)·양띠(7)=삼합
const p = dayPillarOf("2026-08-05");
assert.equal(p.name, "신해");
assert.equal(p.branch, 11);

assert.equal(branchRelationOf(5, p.branch), "충");
assert.equal(branchRelationOf(2, p.branch), "육합");
assert.equal(branchRelationOf(3, p.branch), "삼합");
assert.equal(branchRelationOf(7, p.branch), "삼합");

// 십성은 12띠 전부 항상 결과가 있어야 해요(기본 풀이라 "없음"이 있으면 안 돼요)
const todayElement = stemElement(p.stem);
for (let b = 0; b < 12; b++) {
  assert.ok(tenGodOf(branchElement(b), todayElement), `띠 ${b} 십성이 비어요`);
}

// ── 띠는 입춘 기준 년주와 같아야 해요 ──
// 양력 연도 % 12 로 뽑던 시절엔 1/1~입춘 출생자(약 9%)가 홈 상단과 사주 카드에서
// 서로 다른 띠로 보였어요. 랭킹 서버에도 그 틀린 띠가 올라갔고요.
assert.equal(zodiacOf("2000-02-01").name, "토끼띠", "입춘 전이라 기묘년=토끼");
assert.equal(zodiacOf("1990-01-15").name, "뱀띠", "입춘 전이라 기사년=뱀");
assert.equal(zodiacOf("2000-02-10").name, "용띠", "입춘 후라 경진년=용");

// 이름 문자열은 랭킹 서버(Supabase)의 집계 키예요 — 집합이 바뀌면 기존 데이터와 갈라져요.
const NAMES = [
  "원숭이띠", "닭띠", "개띠", "돼지띠", "쥐띠", "소띠",
  "호랑이띠", "토끼띠", "용띠", "뱀띠", "말띠", "양띠",
];
assert.deepEqual(
  new Set(ALL_ZODIACS.map((z) => z.name)),
  new Set(NAMES),
  "띠 이름 집합이 바뀌면 서버 집계와 갈라져요",
);
// zodiacOf 가 내주는 이름·이모지도 같은 목록 안이어야 해요
for (let m = 1; m <= 12; m++) {
  const z = zodiacOf(`1995-${String(m).padStart(2, "0")}-15`);
  const known = ALL_ZODIACS.find((a) => a.name === z.name);
  assert.ok(known, `zodiacOf 가 모르는 띠 "${z.name}" 를 냈어요`);
  assert.equal(z.emoji, known.emoji, `${z.name} 이모지가 달라요`);
}

console.log("preview-check: OK");
