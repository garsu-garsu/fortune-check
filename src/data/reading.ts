// 사주 원국 해석 — 엔진이 계산한 값에서 풀이 문장을 만들어요.
// 미리 쓴 문장을 뽑는 게 아니라 원국 구조에서 생성하므로,
// 사람마다 조합이 달라지고 같은 글이 잘 나오지 않아요.
//
// 톤 원칙: 단정하지 않아요("~합니다" 대신 "~한 편이에요").
//          불안을 조장하거나 의료·투자를 권하지 않아요.
//          약점은 반드시 활용법과 함께 말해요.

import {
  BRANCHES,
  STEMS,
  climateOf,
  currentFortune10,
  fortuneDirectionOf,
  isNobleman,
  isYangStem,
  lifeStageOf,
  majorFortunesOf,
  principalStemOf,
  sinsalOf,
  stemElement,
  strengthOf,
  tenGodFullOf,
  usefulElementsOfV2,
  voidBranchesOf,
  type Element,
  type Fortune10,
  type Gender,
  type Saju,
  type Sinsal,
  type TenGodFull,
} from "./saju.ts";

/** 일간 10종 — 명리에서 쓰는 표준 물상(物象) */
const DAY_MASTER: Record<
  string,
  { image: string; nature: string; watch: string }
> = {
  갑: {
    image: "곧게 자라는 큰 나무",
    nature: "위로 뻗는 힘이 있어 방향이 정해지면 밀고 나가는 편이에요. 앞에 서는 자리가 어색하지 않아요.",
    watch: "한번 정한 길을 굽히기 어려워해요. 돌아가는 길도 길이라고 생각하면 훨씬 편해져요.",
  },
  을: {
    image: "바위도 감고 오르는 덩굴",
    nature: "환경에 맞춰 모양을 바꾸는 재주가 뛰어나요. 어디에 두어도 결국 자리를 잡아요.",
    watch: "기댈 곳을 먼저 찾다 보니 결정을 미룰 때가 있어요. 작은 것부터 혼자 정해보면 좋아요.",
  },
  병: {
    image: "온 세상을 비추는 태양",
    nature: "숨기는 게 없고 표현이 시원해요. 사람이 모이는 자리에서 힘이 나요.",
    watch: "빛이 세면 그늘도 짙어요. 상대가 부담스러워하는 순간을 한 박자 늦게 알아채요.",
  },
  정: {
    image: "어둠을 밝히는 등불",
    nature: "은은하고 오래가는 따뜻함이 있어요. 가까운 사람을 세심하게 챙겨요.",
    watch: "바람에 흔들리듯 기분의 진폭이 커요. 혼자 정리하는 시간이 꼭 필요해요.",
  },
  무: {
    image: "묵직하게 앉은 큰 산",
    nature: "쉽게 흔들리지 않아요. 사람들이 기대고 싶어 하는 무게가 있어요.",
    watch: "한번 굳으면 바꾸기 어려워요. 남의 말을 끝까지 듣는 것만으로 많은 게 풀려요.",
  },
  기: {
    image: "무엇이든 길러내는 논밭",
    nature: "받아들이고 키우는 힘이 있어요. 실속을 챙기는 감각이 좋아요.",
    watch: "속으로 계산이 길어질 때가 있어요. 생각을 말로 꺼내면 오해가 줄어요.",
  },
  경: {
    image: "다듬어지지 않은 원석",
    nature: "맺고 끊는 게 분명해요. 결정을 미루지 않아 일이 빨리 굴러가요.",
    watch: "말이 곧아서 날카롭게 닿을 수 있어요. 한 문장만 부드럽게 바꿔도 달라져요.",
  },
  신: {
    image: "잘 벼려진 보석",
    nature: "섬세하고 정확해요. 남이 못 보는 차이를 알아채요.",
    watch: "기준이 높아 스스로를 몰아붙여요. 80점에서 멈추는 연습이 도움이 돼요.",
  },
  임: {
    image: "끝이 보이지 않는 큰 물",
    nature: "품이 넓고 생각이 깊어요. 큰 그림을 그리는 데 강해요.",
    watch: "흐름을 따라가다 방향이 자주 바뀌어요. 하나를 끝까지 붙드는 힘이 관건이에요.",
  },
  계: {
    image: "소리 없이 스미는 이슬비",
    nature: "감이 예민하고 속이 깊어요. 분위기를 먼저 읽어요.",
    watch: "겉으로 잘 드러내지 않아 혼자 앓기 쉬워요. 먼저 말하는 게 늘 이득이에요.",
  },
};

const ELEMENT_TRAIT: Record<Element, string> = {
  목: "뻗어나가고 시작하는 기운",
  화: "드러내고 밝히는 기운",
  토: "품고 중재하는 기운",
  금: "정리하고 매듭짓는 기운",
  수: "스며들고 궁리하는 기운",
};

const TEN_GOD_LIFE: Record<TenGodFull, string> = {
  비견: "내 힘으로 서려는 마음이 강해요. 동업보다 각자 몫이 분명한 관계가 편해요.",
  겁재: "경쟁 속에서 오히려 힘이 나요. 다만 돈은 남과 섞지 않는 편이 좋아요.",
  식신: "꾸준히 만들어내는 재주가 있어요. 먹고 즐기는 복이 따라와요.",
  상관: "틀을 벗어나는 아이디어가 나와요. 표현이 세서 오해를 살 때가 있어요.",
  편재: "큰 흐름의 돈을 다루는 감각이 있어요. 들어오는 만큼 나가기도 해요.",
  정재: "성실하게 쌓아 올리는 재물운이에요. 급하게 불리려 하지 않을 때 가장 좋아요.",
  편관: "압박을 견디는 힘이 있어요. 위기에서 실력이 나와요.",
  정관: "질서와 책임을 지키는 자리에서 인정받아요. 조직과 궁합이 좋아요.",
  편인: "남다른 시각과 눈치가 있어요. 관심 분야가 자주 바뀌어요.",
  정인: "배우고 정리하는 힘이 좋아요. 도와주는 사람이 잘 붙어요.",
};

const SINSAL_READING: Record<Sinsal, string> = {
  도화: "사람을 끄는 기운이 있어요. 첫인상에서 얻는 게 많아요.",
  역마: "한자리에 오래 있기보다 움직일 때 일이 풀려요. 이동·출장·이사와 인연이 있어요.",
  화개: "혼자 파고드는 재주가 있어요. 예술·연구·종교 쪽 감각이 남달라요.",
};

export interface ReadingSection {
  title: string;
  body: string;
}

export interface SajuReading {
  /** 한 줄 요약 */
  headline: string;
  sections: ReadingSection[];
  /** 대운 (성별 미입력이면 빈 배열) */
  fortunes: Fortune10[];
  currentFortune: Fortune10 | null;
}

function joinKo(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")}와(과) ${items[items.length - 1]}`;
}

/** 만 나이 근사 — 대운 구간 판정에만 써요 */
function ageOf(birthDate: string, today: string): number {
  return Math.max(0, Number(today.slice(0, 4)) - Number(birthDate.slice(0, 4)));
}

export function readSaju(
  saju: Saju,
  birthDate: string,
  birthTime: string | undefined,
  gender: Gender | undefined,
  today: string,
): SajuReading {
  const dayStemName = STEMS[saju.dayStem];
  const master = DAY_MASTER[dayStemName];
  const strength = strengthOf(saju);
  const useful = usefulElementsOfV2(saju);
  const climate = climateOf(saju.month.branch);
  const sections: ReadingSection[] = [];

  // ── 일간 ──
  sections.push({
    title: `일간 ${dayStemName}${saju.dayElement} — ${master.image}`,
    body: `${master.nature}\n\n${master.watch}`,
  });

  // ── 신강약 (득령·득지·득세) ──
  const got: string[] = [];
  if (strength.hasSeason) got.push("태어난 달");
  if (strength.hasGround) got.push("일지");
  if (strength.hasCrowd) got.push("주변 글자");
  const strengthBody =
    strength.verdict === "신강"
      ? `${got.length ? joinKo(got) + "이(가) 나를 받쳐줘서 " : ""}기운이 넉넉한 편이에요. 채우기보다 쓰고 덜어낼 때 잘 풀려요. 일을 벌이고 사람을 만나고 결과로 내보내는 쪽이 맞아요.`
      : strength.verdict === "신약"
        ? `나를 받쳐주는 글자가 적은 편이에요. 약하다는 뜻이 아니라, 혼자 다 짊어지기보다 배우고 기대고 회복하는 데 시간을 쓸 때 훨씬 멀리 간다는 뜻이에요.`
        : `받쳐주는 힘과 덜어내는 힘이 비슷해요. 한쪽으로 치우치지 않아 상황에 맞춰 쓰기 좋은 구조예요.`;
  sections.push({
    title: `${strength.verdict} — ${got.length ? got.join("·") + " 得" : "받쳐주는 자리가 적음"}`,
    body: strengthBody,
  });

  // ── 조후 + 용신 ──
  const climateBody =
    climate === "한랭"
      ? "겨울 기운을 타고나 속이 차분하고 신중해요. 따뜻한 기운(화)을 곁에 두면 훨씬 편해져요."
      : climate === "염열"
        ? "여름 기운을 타고나 열정이 빨리 붙어요. 식혀주는 기운(수)을 만나면 오래갈 수 있어요."
        : "치우치지 않은 계절에 태어나 온도가 무난해요. 계절보다 원국의 균형을 먼저 봐요.";
  sections.push({
    title: `조후 ${climate} · 반가운 기운 ${useful.join("·")}`,
    body: `${climateBody}\n\n지금 나에게 반가운 건 ${joinKo(useful.map((e) => `${e}(${ELEMENT_TRAIT[e]})`))}이에요. 이 기운이 들어오는 날과 시기에 일이 잘 풀려요.`,
  });

  // ── 오행 균형 ──
  const counts = Object.entries(saju.elementCount) as [Element, number][];
  const many = counts.filter(([, n]) => n >= 3).map(([e]) => e);
  const none = saju.missing;
  const balanceParts: string[] = [];
  if (many.length) {
    balanceParts.push(
      `${many.join("·")} 기운이 많아요. ${many.map((e) => ELEMENT_TRAIT[e]).join(", ")}이 강하게 나와요.`,
    );
  }
  if (none.length) {
    balanceParts.push(
      `${none.join("·")} 기운은 원국에 없어요. 없다고 나쁜 게 아니라, 그 부분은 타고나기보다 배워서 채우는 자리예요.`,
    );
  }
  if (!balanceParts.length) {
    balanceParts.push("다섯 기운이 고르게 퍼져 있어요. 크게 모자란 데 없이 두루 쓰는 구조예요.");
  }
  sections.push({ title: "오행 균형", body: balanceParts.join("\n\n") });

  // ── 십성 (월지 본기 = 사회적 성향의 뿌리) ──
  const monthGod = tenGodFullOf(saju.dayStem, principalStemOf(saju.month.branch));
  sections.push({
    title: `월지 십성 ${monthGod}`,
    body: `태어난 달은 사회에서 드러나는 결을 보여줘요.\n\n${TEN_GOD_LIFE[monthGod]}`,
  });

  // ── 일지 (배우자·가장 가까운 자리) + 십이운성 ──
  const dayStage = lifeStageOf(saju.dayStem, saju.day.branch);
  const dayGod = tenGodFullOf(saju.dayStem, principalStemOf(saju.day.branch));
  sections.push({
    title: `일지 ${BRANCHES[saju.day.branch]} · ${dayStage}`,
    body: `일지는 내가 깔고 앉은 자리이자 가장 가까운 사람과의 결이에요.\n\n${TEN_GOD_LIFE[dayGod]}\n\n십이운성으로는 ${dayStage}에 해당해요. ${stageWord(dayStage)}`,
  });

  // ── 신살 · 공망 ──
  const marks: string[] = [];
  const base = saju.day.branch;
  const branches = [saju.year.branch, saju.month.branch, saju.day.branch];
  if (saju.hour) branches.push(saju.hour.branch);
  const found = new Set<Sinsal>();
  for (const b of branches) {
    const s = sinsalOf(base, b);
    if (s) found.add(s);
  }
  for (const s of found) marks.push(`**${s}** ${SINSAL_READING[s]}`);
  if (branches.some((b) => isNobleman(saju.dayStem, b))) {
    marks.push("**천을귀인** 어려울 때 도와주는 사람이 나타나는 자리예요. 사람 복이 있는 편이에요.");
  }
  const [v1, v2] = voidBranchesOf(saju.day);
  marks.push(
    `**공망** ${BRANCHES[v1]}·${BRANCHES[v2]}. 이 기운이 오는 자리는 결과가 더디게 맺혀요. 조급해하지 않으면 오히려 편한 자리예요.`,
  );
  sections.push({ title: "신살", body: marks.join("\n\n") });

  // ── 대운 ──
  const fortunes = gender
    ? majorFortunesOf(saju, gender, birthDate, birthTime)
    : [];
  const current = gender
    ? currentFortune10(fortunes, ageOf(birthDate, today))
    : null;
  if (gender && current) {
    const dir = fortuneDirectionOf(saju, gender) ? "순행" : "역행";
    const curGod = tenGodFullOf(saju.dayStem, current.pillar.stem);
    const isGood = useful.includes(stemElement(current.pillar.stem));
    sections.push({
      title: `현재 대운 ${current.pillar.name} (${current.startAge}세~)`,
      body:
        `대운은 10년마다 바뀌는 큰 흐름이에요. ${dir}으로 흘러요.\n\n` +
        `지금은 ${curGod}의 대운이에요. ${TEN_GOD_LIFE[curGod]}\n\n` +
        (isGood
          ? "나에게 반가운 기운이 들어와 있는 시기라, 벌여둔 일이 결과로 이어지기 좋아요."
          : "반가운 기운은 아니라 속도가 더디게 느껴질 수 있어요. 확장보다 다지는 데 쓰면 다음 대운에서 크게 돌아와요."),
    });
  }

  const headline =
    `${master.image} 같은 ${dayStemName}${saju.dayElement} 일간, ` +
    `${strength.verdict}에 ${useful.join("·")} 기운이 반가운 사주예요.`;

  return { headline, sections, fortunes, currentFortune: current };
}

function stageWord(stage: string): string {
  const map: Record<string, string> = {
    장생: "새로 시작하는 힘이 붙는 자리라 배우고 뻗어나갈 때 잘 맞아요.",
    목욕: "다듬어지는 중이라 기복이 있지만 그만큼 배우는 게 많아요.",
    관대: "제 몫을 하기 시작하는 자리예요. 자신감이 붙어요.",
    건록: "제 힘으로 서는 자리라 독립적으로 일할 때 가장 잘 나와요.",
    제왕: "기운이 가장 센 자리예요. 밀어붙이는 힘이 강하니 방향만 잘 잡으면 돼요.",
    쇠: "한 굽이 넘긴 자리라 무리하기보다 정리하고 지키는 데 강해요.",
    병: "속도를 줄이는 자리예요. 쉬어가는 걸 손해로 여기지 않으면 좋아요.",
    사: "겉으로 드러내기보다 안으로 파고드는 자리예요. 연구·기술과 잘 맞아요.",
    묘: "품고 저장하는 자리예요. 모으고 쌓는 일에 강해요.",
    절: "끊고 다시 시작하는 자리라 변화가 잦아요. 그 변화가 기회가 돼요.",
    태: "씨앗이 맺히는 자리예요. 준비하는 시기가 길지만 헛되지 않아요.",
    양: "자라나는 자리예요. 서두르지 않으면 꾸준히 좋아져요.",
  };
  return map[stage] ?? "";
}

/** 원국 표에 쓸 한 기둥 요약 */
export function pillarSummary(
  saju: Saju,
  which: "year" | "month" | "day" | "hour",
): { label: string; name: string; god: string; stage: string } | null {
  const p = saju[which];
  if (!p) return null;
  const label = { year: "년주", month: "월주", day: "일주", hour: "시주" }[which];
  return {
    label,
    name: p.name,
    god: which === "day" ? "일간(나)" : tenGodFullOf(saju.dayStem, p.stem),
    stage: lifeStageOf(saju.dayStem, p.branch),
  };
}

/** 천간이 양인지 — 표에서 음양 표시용 */
export function stemPolarity(stem: number): "양" | "음" {
  return isYangStem(stem) ? "양" : "음";
}
