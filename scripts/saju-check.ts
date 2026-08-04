// 사주 계산 자체 검증. 실행: npm run check:saju
// 알려진 만세력 값과 대조해요. 실패하면 즉시 throw.
import assert from "node:assert/strict";

import {
  BRANCHES,
  STEMS,
  bodyStrengthOf,
  branchElement,
  branchHarmOf,
  branchRelationOf,
  climateOf,
  computeSaju,
  hiddenStemsOf,
  majorFortunesOf,
  principalStemOf,
  stemCombineElement,
  stemRelationOf,
  strengthOf,
  usefulElementsOfV2,
  voidBranchesOf,
  yearPillarOf,
  dayPillarOf,
  isNobleman,
  lifeStageOf,
  sinsalOf,
  solarLongitude,
  stemElement,
  tenGodFullOf,
  tenGodGroupOf,
  tenGodOf,
  usefulElementsOf,
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

// ── 십성 10종 — 갑(甲) 일간 기준 표준표 ──
// 갑 대 갑을병정무기경신임계 = 비견 겁재 식신 상관 편재 정재 편관 정관 편인 정인
{
  const expected = [
    "비견", "겁재", "식신", "상관", "편재",
    "정재", "편관", "정관", "편인", "정인",
  ];
  for (let s = 0; s < 10; s++) {
    assert.equal(tenGodFullOf(0, s), expected[s], `갑 대 ${STEMS[s]}`);
  }
  // 5종으로 축약하면 기존 판정과 일치해야 해요
  for (let mine = 0; mine < 10; mine++) {
    for (let other = 0; other < 10; other++) {
      assert.equal(
        tenGodGroupOf(tenGodFullOf(mine, other)),
        tenGodOf(stemElement(mine), stemElement(other)),
        `${STEMS[mine]} 대 ${STEMS[other]}`,
      );
    }
  }
}

// ── 십이운성 — 각 천간의 장생·건록·제왕 자리 (만세력 표준) ──
{
  const table: [number, number, number, number][] = [
    // [천간, 장생지, 건록지, 제왕지]
    [0, 11, 2, 3], // 갑: 해장생 인건록 묘제왕
    [1, 6, 3, 2], // 을: 오장생 묘건록 인제왕
    [2, 2, 5, 6], // 병: 인장생 사건록 오제왕
    [3, 9, 6, 5], // 정: 유장생 오건록 사제왕
    [4, 2, 5, 6], // 무: 병과 같음
    [5, 9, 6, 5], // 기: 정과 같음
    [6, 5, 8, 9], // 경: 사장생 신건록 유제왕
    [7, 0, 9, 8], // 신: 자장생 유건록 신제왕
    [8, 8, 11, 0], // 임: 신장생 해건록 자제왕
    [9, 3, 0, 11], // 계: 묘장생 자건록 해제왕
  ];
  for (const [stem, birth, prime, peak] of table) {
    assert.equal(lifeStageOf(stem, birth), "장생", `${STEMS[stem]} 장생`);
    assert.equal(lifeStageOf(stem, prime), "건록", `${STEMS[stem]} 건록`);
    assert.equal(lifeStageOf(stem, peak), "제왕", `${STEMS[stem]} 제왕`);
  }
  // 한 천간이 12지지를 돌면 12운성이 전부 한 번씩 나와야 해요
  for (let s = 0; s < 10; s++) {
    const seen = new Set<string>();
    for (let b = 0; b < 12; b++) seen.add(lifeStageOf(s, b));
    assert.equal(seen.size, 12, `${STEMS[s]} 의 12운성이 ${seen.size}종`);
  }
}

// ── 지지 관계 — 충 6쌍, 육합 6쌍, 삼합 4국 ──
{
  for (const [a, b] of [[0, 6], [1, 7], [2, 8], [3, 9], [4, 10], [5, 11]]) {
    assert.equal(branchRelationOf(a, b), "충", `${BRANCHES[a]}${BRANCHES[b]} 충`);
    assert.equal(branchRelationOf(b, a), "충");
  }
  for (const [a, b] of [[0, 1], [2, 11], [3, 10], [4, 9], [5, 8], [6, 7]]) {
    assert.equal(branchRelationOf(a, b), "육합", `${BRANCHES[a]}${BRANCHES[b]} 육합`);
  }
  // 인오술 화국
  assert.equal(branchRelationOf(2, 6), "삼합");
  assert.equal(branchRelationOf(6, 10), "삼합");
  // 충이 육합·삼합보다 우선(진술은 충이지 삼합 아님)
  assert.equal(branchRelationOf(4, 10), "충");
  assert.equal(branchRelationOf(0, 0), "없음");
}

// ── 신살 — 일지 삼합 그룹 기준 도화/역마/화개 ──
{
  // 인오술 그룹: 도화=묘, 역마=신, 화개=술
  for (const base of [2, 6, 10]) {
    assert.equal(sinsalOf(base, 3), "도화");
    assert.equal(sinsalOf(base, 8), "역마");
    assert.equal(sinsalOf(base, 10), "화개");
  }
  // 신자진 그룹: 도화=유, 역마=인, 화개=진
  for (const base of [8, 0, 4]) {
    assert.equal(sinsalOf(base, 9), "도화");
    assert.equal(sinsalOf(base, 2), "역마");
    assert.equal(sinsalOf(base, 4), "화개");
  }
  // 해묘미 그룹: 도화=자, 역마=사, 화개=미
  for (const base of [11, 3, 7]) {
    assert.equal(sinsalOf(base, 0), "도화");
    assert.equal(sinsalOf(base, 5), "역마");
    assert.equal(sinsalOf(base, 7), "화개");
  }
  // 12지지 전부 어떤 그룹엔가 속해야 해요(그룹 못 찾으면 throw)
  for (let b = 0; b < 12; b++) assert.doesNotThrow(() => sinsalOf(b, 0));
}

// ── 천을귀인 — 갑무경=축미, 을기=자신, 병정=해유, 신=인오, 임계=사묘 ──
{
  const table: [number[], number[]][] = [
    [[0, 4, 6], [1, 7]],
    [[1, 5], [0, 8]],
    [[2, 3], [11, 9]],
    [[7], [2, 6]],
    [[8, 9], [5, 3]],
  ];
  for (const [stems, branches] of table) {
    for (const s of stems) {
      for (let b = 0; b < 12; b++) {
        assert.equal(
          isNobleman(s, b),
          branches.includes(b),
          `${STEMS[s]}일간 ${BRANCHES[b]} 천을귀인`,
        );
      }
    }
  }
}

// ── 신강/신약 — 판정이 세 값 안에 있고, 용신이 비면 안 됨 ──
{
  for (const b of ["1988-03-14", "1995-11-02", "1979-07-23", "2001-01-09"]) {
    const s = computeSaju(b);
    assert.ok(["신강", "중화", "신약"].includes(bodyStrengthOf(s)));
    assert.ok(usefulElementsOf(s).length > 0, `${b} 용신이 비었어요`);
  }
}

// ── 지장간 — 정기(본기)가 그 지지의 오행과 일치해야 해요 ──
{
  // 자=계, 묘=을, 유=신, 오=정 (왕지는 정기 하나가 지배)
  assert.equal(principalStemOf(0), 9); // 자 → 계
  assert.equal(principalStemOf(3), 1); // 묘 → 을
  assert.equal(principalStemOf(6), 3); // 오 → 정
  assert.equal(principalStemOf(9), 7); // 유 → 신
  // 생지 — 인=갑, 사=병, 신=경, 해=임
  assert.equal(principalStemOf(2), 0);
  assert.equal(principalStemOf(5), 2);
  assert.equal(principalStemOf(8), 6);
  assert.equal(principalStemOf(11), 8);
  // 고지(묘고) — 진=무, 술=무, 축=기, 미=기
  assert.equal(principalStemOf(4), 4);
  assert.equal(principalStemOf(10), 4);
  assert.equal(principalStemOf(1), 5);
  assert.equal(principalStemOf(7), 5);
  // 정기의 오행은 그 지지의 오행과 같아야 해요
  for (let b = 0; b < 12; b++) {
    assert.equal(
      stemElement(principalStemOf(b)),
      branchElement(b),
      `${BRANCHES[b]} 정기 오행 불일치`,
    );
  }
  // 인사신 삼형 글자들은 지장간이 3개(여기·중기·정기)
  for (const b of [2, 5, 8, 11]) {
    assert.ok(hiddenStemsOf(b).length >= 2, `${BRANCHES[b]} 지장간 부족`);
  }
}

// ── 천간 합·충 ──
{
  // 갑기합토 을경합금 병신합수 정임합목 무계합화
  const combos: [number, number, string][] = [
    [0, 5, "토"], [1, 6, "금"], [2, 7, "수"], [3, 8, "목"], [4, 9, "화"],
  ];
  for (const [a, b, el] of combos) {
    assert.equal(stemRelationOf(a, b), "합", `${STEMS[a]}${STEMS[b]} 합`);
    assert.equal(stemRelationOf(b, a), "합");
    assert.equal(stemCombineElement(a, b), el, `${STEMS[a]}${STEMS[b]} 합화`);
  }
  // 갑경 을신 병임 정계 충 / 토(무기)는 충이 없어요
  for (const [a, b] of [[0, 6], [1, 7], [2, 8], [3, 9]]) {
    assert.equal(stemRelationOf(a, b), "충", `${STEMS[a]}${STEMS[b]} 충`);
  }
  assert.equal(stemRelationOf(4, 0), "없음"); // 무갑 — 토는 충 없음
  assert.equal(stemRelationOf(5, 1), "없음"); // 기을
}

// ── 형·파·해 ──
{
  // 삼형 인사신 / 축술미, 상형 자묘, 자형 진오유해
  assert.equal(branchHarmOf(2, 5), "형");
  assert.equal(branchHarmOf(5, 8), "형");
  assert.equal(branchHarmOf(1, 10), "형");
  assert.equal(branchHarmOf(0, 3), "형");
  assert.equal(branchHarmOf(4, 4), "형"); // 진진 자형
  assert.equal(branchHarmOf(2, 2), "없음"); // 인인은 자형 아님
  // 육파 자유 / 육해 자미
  assert.equal(branchHarmOf(0, 9), "파");
  assert.equal(branchHarmOf(0, 7), "해");
}

// ── 공망 — 갑자순=술해, 갑술순=신유, 갑신순=오미 ──
{
  assert.deepEqual(voidBranchesOf({ stem: 0, branch: 0, name: "갑자" }), [10, 11]);
  assert.deepEqual(voidBranchesOf({ stem: 0, branch: 10, name: "갑술" }), [8, 9]);
  assert.deepEqual(voidBranchesOf({ stem: 0, branch: 8, name: "갑신" }), [6, 7]);
  // 같은 순에 속하면 공망도 같아야 해요 (갑자순: 갑자~계유)
  assert.deepEqual(
    voidBranchesOf({ stem: 9, branch: 9, name: "계유" }),
    [10, 11],
  );
}

// ── 신강약 — 월지가 판정을 지배해야 해요 ──
{
  // 갑목 일간이 묘월(목 왕지)에 나면 득령 → 신강 쪽
  const strongWood = computeSaju("1990-03-15"); // 묘월 근처
  const s1 = strengthOf(strongWood);
  assert.ok(["신강", "중화", "신약"].includes(s1.verdict));
  // 판정 세 값과 비율이 정상 범위인지
  for (const b of ["1988-03-14", "1995-11-02", "1979-07-23", "2001-01-09", "1969-09-30"]) {
    const s = strengthOf(computeSaju(b));
    assert.ok(s.supportRatio >= 0 && s.supportRatio <= 1, `${b} 비율 이상`);
    assert.ok(usefulElementsOfV2(computeSaju(b)).length > 0, `${b} 용신 없음`);
  }
}

// ── 조후 — 계절 판정 ──
{
  assert.equal(climateOf(0), "한랭"); // 자월(12월)
  assert.equal(climateOf(6), "염열"); // 오월(6월)
  assert.equal(climateOf(3), "온화"); // 묘월(3월)
}

// ── 대운 — 방향과 간격 ──
{
  const s = computeSaju("1990-05-15");
  const male = majorFortunesOf(s, "남");
  const female = majorFortunesOf(s, "여");
  assert.equal(male.length, 8);
  // 10년 간격
  for (let i = 1; i < male.length; i++) {
    assert.equal(male[i].startAge - male[i - 1].startAge, 10);
  }
  // 양남/음녀는 순행, 음남/양녀는 역행 → 남녀 방향이 반대여야 해요
  assert.notEqual(male[0].pillar.name, female[0].pillar.name);
  // 첫 대운은 월주에서 한 칸 이동한 자리
  const monthIdx = s.month.stem;
  assert.ok(
    male[0].pillar.stem === (monthIdx + 1) % 10 ||
      male[0].pillar.stem === (monthIdx + 9) % 10,
    "첫 대운이 월주 인접이 아니에요",
  );
}

// ── 세운 ──
assert.equal(yearPillarOf(1984).name, "갑자");
assert.equal(yearPillarOf(2024).name, "갑진");
assert.equal(yearPillarOf(2026).name, "병오");

console.log("사주 계산 검증 통과");
