// 대운 구간 판정 점검. 실행: npm run check:daewoon
// 대운수(startAge)는 출생부터의 경과 연수 = 만 나이 기준이에요.
// 연도 차만 보면 생일 전 사람이 한 대운 앞서가서, 간지도 십성 해설도 통째로 어긋나요.
import assert from "node:assert/strict";

import { readSaju } from "../src/data/reading.ts";
import { computeSaju, type Gender } from "../src/data/saju.ts";
import { prevDate } from "../src/lib/kst.ts";

function current(birth: string, gender: Gender, today: string) {
  const r = readSaju(computeSaju(birth), birth, undefined, gender, today);
  assert.ok(r.currentFortune, `${birth} ${gender} ${today}: 현재 대운이 없어요`);
  return r.currentFortune!;
}

// 1) 생일이 아직 안 지난 9~12월생 — 예전엔 한 칸 앞선 대운을 봤어요
const TODAY = "2026-08-06"; // 고정 기준일 (오늘이 지나도 깨지지 않게)
for (const [birth, gender, name, startAge] of [
  ["1953-12-15", "남", "정사", 63],
  ["1948-09-15", "남", "무진", 68],
  ["1949-11-15", "여", "임오", 67],
] as const) {
  const f = current(birth, gender, TODAY);
  assert.equal(f.pillar.name, name, `${birth} ${gender} 대운 간지`);
  assert.equal(f.startAge, startAge, `${birth} ${gender} 대운 시작 나이`);
}

// 2) 생일 경계 — 하루 전까지는 이전 대운, 생일 당일에 다음 대운으로 넘어가요
for (const [birth, gender] of [
  ["1953-12-15", "남"],
  ["1948-09-15", "남"],
  ["1949-11-15", "여"],
] as const) {
  const fortunes = readSaju(computeSaju(birth), birth, undefined, gender, TODAY).fortunes;
  for (const f of fortunes.slice(1)) {
    // 첫 대운 이전은 아직 대운이 없어서(null) 경계 비교 대상이 아니에요
    const y = Number(birth.slice(0, 4)) + f.startAge;
    const onBirthday = `${y}${birth.slice(4)}`;
    assert.equal(
      current(birth, gender, onBirthday).startAge,
      f.startAge,
      `${birth} ${gender}: 생일 당일 ${onBirthday}에 ${f.startAge}세 대운 시작`,
    );
    const before = current(birth, gender, prevDate(onBirthday));
    assert.equal(
      before.startAge,
      f.startAge - 10,
      `${birth} ${gender}: 생일 하루 전 ${prevDate(onBirthday)}은 아직 이전 대운`,
    );
    assert.notEqual(
      before.pillar.name,
      f.pillar.name,
      `${birth} ${gender}: 경계에서 간지가 실제로 바뀌어야 해요`,
    );
  }
}

console.log("✅ 대운 구간 판정(만 나이 기준)과 생일 경계가 모두 맞아요");
