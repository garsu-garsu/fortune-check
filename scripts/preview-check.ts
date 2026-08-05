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
import { ZODIAC_PICK } from "../src/data/zodiac.ts";

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

console.log("preview-check: OK");
