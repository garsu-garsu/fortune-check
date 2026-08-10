// 태어난 시간 12시진 칸 검증. 실행: npm run check:hourslot
// 화면에 적힌 범위와 실제 계산이 어긋나면, 고른 대로 안 나오는 시주를 보게 돼요.
import assert from "node:assert/strict";

import { BIRTH_HOUR_SLOTS, BRANCHES, computeSaju } from "../src/data/saju.ts";

assert.equal(BIRTH_HOUR_SLOTS.length, 13, "12시진 + 자시 자정 전후 = 13칸");

const DAY = "1970-03-15";
for (const s of BIRTH_HOUR_SLOTS) {
  // 대표 시각으로 계산한 시지가 그 칸의 시진과 같아야 해요
  const saju = computeSaju(DAY, s.time);
  assert.ok(saju.hour, `${s.name} 시주가 안 나왔어요`);
  assert.equal(
    saju.hour.branch,
    s.branch,
    `${s.name}(${s.range}) 대표시각 ${s.time} → ${BRANCHES[saju.hour.branch]}시로 계산돼요`,
  );
  // 대표 시각을 넣어도 일주는 생년월일 그대로여야 해요(자정 넘김 사고 방지)
  assert.equal(
    saju.day.name,
    computeSaju(DAY).day.name,
    `${s.name}(${s.range}) 를 고르면 일주가 ${saju.day.name}로 바뀌어요`,
  );
}

// 범위의 양 끝도 그 칸 안에 들어와야 해요 (자정을 넘는 자시 두 칸 제외)
for (const s of BIRTH_HOUR_SLOTS) {
  const [from, to] = s.range.split("~");
  for (const t of [from, to]) {
    const h = computeSaju(DAY, t).hour;
    assert.ok(h, `${t} 시주 없음`);
    assert.equal(h.branch, s.branch, `${s.name} 범위 끝 ${t} 가 다른 시진으로 계산돼요`);
  }
}

// 칸 사이에 빈틈이나 겹침이 없어야 해요 — 13칸이 24시간을 정확히 덮어요
const minutes = new Set<number>();
for (const s of BIRTH_HOUR_SLOTS) {
  const [from, to] = s.range.split("~").map((v) => Number(v.slice(0, 2)) * 60 + Number(v.slice(3, 5)));
  for (let m = from; m <= (to < from ? to + 1440 : to); m++) {
    const key = m % 1440;
    assert.ok(!minutes.has(key), `${s.name}(${s.range}) 가 다른 칸과 겹쳐요`);
    minutes.add(key);
  }
}
assert.equal(minutes.size, 1440, "24시간을 다 덮지 못했어요");

console.log("hourslot-check: OK");
