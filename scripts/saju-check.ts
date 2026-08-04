// 사주 계산 자체 검증. 실행: npm run check:saju
// 알려진 만세력 값과 대조해요. 실패하면 즉시 throw.
import assert from "node:assert/strict";

import {
  computeSaju,
  dayPillarOf,
  solarLongitude,
  stemElement,
  tenGodOf,
} from "../src/data/saju.ts";

// ── 일주(60갑자) — 만세력 기준값 ──
assert.equal(dayPillarOf("1970-01-01").name, "신사");
assert.equal(dayPillarOf("2000-01-01").name, "무오");
assert.equal(dayPillarOf("1900-01-01").name, "갑술");

// 60일 뒤는 같은 간지로 돌아와야 해요
assert.equal(dayPillarOf("2026-01-01").name, dayPillarOf("2026-03-02").name);

// ── 년주 — 입춘 경계 ──
// 1984년은 갑자년(60갑자의 시작)
assert.equal(computeSaju("1984-06-01").year.name, "갑자");
// 2024년은 갑진년
assert.equal(computeSaju("2024-06-01").year.name, "갑진");
// 2024-01-15는 입춘 전 → 전년도(2023 계묘)로 잡혀야 해요
assert.equal(computeSaju("2024-01-15").year.name, "계묘");
// 2024-02-10은 입춘 후 → 갑진
assert.equal(computeSaju("2024-02-10").year.name, "갑진");

// ── 입춘 시점이 2월 3~5일 안에 있는지 ──
for (const y of [1950, 1984, 2000, 2024, 2026]) {
  const before = computeSaju(`${y}-02-02`).year.name;
  const after = computeSaju(`${y}-02-06`).year.name;
  assert.notEqual(before, after, `${y}년 입춘 경계가 2/2~2/6 사이에 없어요`);
}

// ── 월주 — 절기 기준 + 오호둔 ──
// 갑년의 인월은 병인월 (오호둔: 갑기년 병인두)
assert.equal(computeSaju("2024-02-10").month.name, "병인");
// 12월 하순은 자월
assert.equal(computeSaju("2024-12-25").month.branch, 0);
// 3월 초는 아직 인월(경칩 전)
assert.equal(computeSaju("2024-03-01").month.branch, 2);

// ── 태양 황경 ──
// 춘분(3/20 전후)에 0도 근처
const equinox = solarLongitude(Date.UTC(2024, 2, 20, 3, 6));
assert.ok(equinox < 1 || equinox > 359, `춘분 황경이 0도 근처가 아님: ${equinox}`);

// ── 시주 — 오둔시 ──
// 갑일의 자시는 갑자시
const dayGap = computeSaju("2024-06-01"); // 일간 확인용
const withHour = computeSaju("2024-06-01", "00:30");
assert.ok(withHour.hour !== null);
assert.equal(withHour.hour!.branch, 0); // 00:30 → 자시
// 자시 천간 = (일간 % 5) * 2
assert.equal(withHour.hour!.stem, ((dayGap.dayStem % 5) * 2) % 10);
// 생시 없으면 시주 없음
assert.equal(computeSaju("2024-06-01").hour, null);

// 11:30 → 오시(지지 6)
assert.equal(computeSaju("2024-06-01", "11:30").hour!.branch, 6);
// 23:30 → 자시(지지 0)
assert.equal(computeSaju("2024-06-01", "23:30").hour!.branch, 0);

// ── 오행 분포 ──
const s = computeSaju("1990-05-15");
const total = Object.values(s.elementCount).reduce((a, b) => a + b, 0);
assert.equal(total, 6, "생시 없으면 3주 6글자");
assert.equal(
  Object.values(computeSaju("1990-05-15", "14:00").elementCount).reduce(
    (a, b) => a + b,
    0,
  ),
  8,
  "생시 있으면 4주 8글자",
);

// ── 십성 ──
assert.equal(tenGodOf("목", "목"), "비겁");
assert.equal(tenGodOf("목", "화"), "식상"); // 목생화
assert.equal(tenGodOf("목", "토"), "재성"); // 목극토
assert.equal(tenGodOf("목", "금"), "관성"); // 금극목
assert.equal(tenGodOf("목", "수"), "인성"); // 수생목
assert.equal(tenGodOf("수", "목"), "식상"); // 수생목
assert.equal(tenGodOf("화", "금"), "재성"); // 화극금

// ── 십성이 날마다 바뀌는지 (운세 톤이 한 값에 고정되면 안 됨) ──
// 일진 천간은 10일 주기 → 십성 5종이 10일 안에 모두 나와야 해요.
{
  const me = computeSaju("1990-05-15");
  const seen = new Set<string>();
  const base = Date.UTC(2026, 0, 1);
  for (let i = 0; i < 10; i++) {
    const d = new Date(base + i * 86400000).toISOString().slice(0, 10);
    seen.add(tenGodOf(me.dayElement, stemElement(dayPillarOf(d).stem)));
  }
  assert.equal(seen.size, 5, `10일 안에 십성 5종이 다 나와야 하는데 ${seen.size}종`);
}

console.log("사주 계산 검증 통과");
