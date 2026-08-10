// 생년월일 숫자 8자리 입력 검증. 실행: npm run check:birthdate
// 잘못 통과시키면 사주 전체가 틀린 날짜로 계산돼요 — 말일·윤년이 핵심이에요.
import assert from "node:assert/strict";

import { birthLabel, formatBirthDigits, parseBirthDigits } from "../src/lib/birthdate.ts";

const TODAY = "2026-08-11";
const iso = (d: string) => parseBirthDigits(d, TODAY).iso;
const err = (d: string) => parseBirthDigits(d, TODAY).error;

// 정상
assert.equal(iso("19700315"), "1970-03-15");
assert.equal(iso("20000229"), "2000-02-29", "2000년은 윤년");
assert.equal(iso("19301231"), "1930-12-31", "하한 연도는 통과");
assert.equal(iso(TODAY.replace(/-/g, "")), TODAY, "오늘 출생도 통과");

// 치는 중엔 조용해야 해요
assert.equal(err("197"), null);
assert.equal(err("19700"), null);
assert.equal(iso("1970031"), "", "덜 치면 값 없음");

// 말이 안 되는 날짜
assert.equal(iso("19700230"), "", "2월 30일은 없어요");
assert.equal(iso("19000101"), "", "1930년 이전");
assert.equal(iso("20990101"), "", "미래 연도");
assert.equal(iso("20260812"), "", "오늘보다 하루 뒤");
assert.equal(iso("19701301"), "", "13월");
assert.equal(iso("19701200"), "", "0일");
assert.equal(iso("19000229"), "", "1900년은 윤년이 아니지만 연도에서 먼저 걸려요");
assert.equal(iso("19980229"), "", "1998년은 윤년이 아니에요");
for (const d of ["19700230", "19000101", "20990101", "19701301"])
  assert.ok(err(d), `${d} 는 이유를 알려줘야 해요`);

// 화면 표시
assert.equal(formatBirthDigits("1970"), "1970");
assert.equal(formatBirthDigits("197003"), "1970.03");
assert.equal(formatBirthDigits("19700315"), "1970.03.15");
assert.equal(birthLabel("1970-03-15"), "1970년 3월 15일생");

console.log("birthdate-check: OK");
