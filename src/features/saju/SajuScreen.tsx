import { useState } from "react";

import { Button, Paragraph, useToast } from "@toss/tds-mobile";

import { BannerAd } from "../../components/BannerAd";
import { Card, ScreenLayout } from "../../components/ScreenLayout";
import { Teaser } from "../../components/Teaser";
import {
  flowOf,
  periodReading,
  pillarSummary,
  readSaju,
  type ReadingSection,
} from "../../data/reading";
import {
  computeSaju,
  dayPillarOf,
  type Element,
  type Gender,
} from "../../data/saju";
import { EVENT, track } from "../../lib/analytics";
import { kstDate } from "../../lib/kst";
import { BLURRED } from "../../lib/teaser";
import { useAdGate } from "../../hooks/useAdGate";
import { useAppState } from "../../state";
import { palette } from "../../theme";

const ELEMENT_COLOR: Record<Element, string> = {
  목: "#2E9E5B",
  화: "#E1483F",
  토: "#B08447",
  금: "#8A8F98",
  수: "#2F6DB5",
};

export function SajuScreen() {
  const {
    profile,
    people,
    saju,
    isViewingSelf,
    addPerson,
    selectPerson,
    removePerson,
    saveProfile,
    resetAll,
    isSajuUnlocked,
    unlockSaju,
  } = useAppState();
  const { watchThen } = useAdGate();
  const { openToast } = useToast();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);

  if (!profile || !saju) return null;

  const today = kstDate();
  const readingOpen = isSajuUnlocked("reading");
  const daewoonOpen = isSajuUnlocked("daewoon");
  const reading = readSaju(
    saju,
    profile.birthDate,
    profile.birthTime,
    profile.gender,
    today,
  );

  const flow = flowOf(saju, today, reading.currentFortune);
  const dailyOpen = isSajuUnlocked("daily");
  const monthlyOpen = isSajuUnlocked("monthly");
  const yearlyOpen = isSajuUnlocked("yearly");
  const todayPillar = dayPillarOf(today);
  const nowPillars = computeSaju(today);
  const monthPillar = nowPillars.month;
  const yearPillar = nowPillars.year;
  const dailySections = periodReading(saju, todayPillar, "일");
  const monthlySections = periodReading(saju, monthPillar, "월");
  const yearlySections = periodReading(saju, yearPillar, "년");

  const pillars = (["hour", "day", "month", "year"] as const)
    .map((k) => pillarSummary(saju, k))
    .filter((p): p is NonNullable<typeof p> => p != null);

  const maxCount = Math.max(...Object.values(saju.elementCount));

  return (
    <ScreenLayout
      title={`${profile.name ? profile.name + "님의 " : "내 "}사주 풀이`}
      subtitle={`${profile.birthDate.replace(/-/g, ".")}${profile.birthTime ? " " + profile.birthTime : " (시간 미입력)"}`}
    >
      {/* 사람 전환 */}
      <div
        style={{
          display: "flex",
          gap: 6,
          overflowX: "auto",
          padding: "4px 0 2px",
        }}
      >
        {people.map((p, i) => {
          const on = p.id === profile.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => selectPerson(p.id)}
              style={{
                flexShrink: 0,
                padding: "7px 13px",
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                border: `1px solid ${on ? palette.primary : palette.line}`,
                background: on ? palette.primary : palette.white,
                color: on ? palette.white : palette.sub,
              }}
            >
              {i === 0 ? "나" : (p.name ?? "이름없음")}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setAdding(true)}
          style={{
            flexShrink: 0,
            padding: "7px 13px",
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            border: `1px dashed ${palette.line}`,
            background: palette.white,
            color: palette.primary,
          }}
        >
          + 사람 추가
        </button>
      </div>

      {adding && (
        <AddPersonCard
          onCancel={() => setAdding(false)}
          onSubmit={(birthDate, birthTime, name, gender) => {
            // 사람 추가는 보상형 광고를 본 뒤에 열려요
            watchThen(() => {
              addPerson(birthDate, birthTime, name, gender);
              track(EVENT.personAdded, { has_time: birthTime ? 1 : 0 });
              setAdding(false);
              openToast(`${name || "새 사람"}의 사주를 불러왔어요!`);
            }, "add_person");
          }}
        />
      )}

      {/* 온보딩 뒤엔 내 정보를 고칠 방법이 없었어요. "태어난 시간을 넣으면
          시주까지 봐요" 같은 안내를 따를 수가 없었고, 데이터 삭제 수단도 없었어요. */}
      {isViewingSelf && (
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <Button display="full" variant="weak" onClick={() => setEditing(true)}>
            내 정보 수정
          </Button>
          <Button
            display="full"
            variant="weak"
            onClick={() => {
              if (confirmingReset) {
                resetAll();
                openToast("모든 데이터를 삭제했어요.");
              } else {
                setConfirmingReset(true);
                openToast("한 번 더 누르면 모두 삭제돼요.");
              }
            }}
          >
            {confirmingReset ? "정말 삭제할까요?" : "내 데이터 삭제"}
          </Button>
        </div>
      )}

      {editing && (
        <AddPersonCard
          title="내 정보 수정"
          submitLabel="저장"
          initial={{
            name: profile.name ?? "",
            birthDate: profile.birthDate,
            birthTime: profile.birthTime ?? "",
            gender: profile.gender,
          }}
          onCancel={() => setEditing(false)}
          onSubmit={(birthDate, birthTime, name, gender) => {
            saveProfile(birthDate, birthTime, name, gender);
            setEditing(false);
            openToast("수정했어요.");
          }}
        />
      )}

      {!isViewingSelf && (
        <Card style={{ marginTop: 10, background: palette.bg }}>
          <Paragraph typography="t7" color={palette.sub} style={{ lineHeight: 1.5 }}>
            다른 사람의 사주는 <b>보기 전용</b>이에요. 검증과 적중률은 내 것만 쌓여요.
          </Paragraph>
          <div style={{ marginTop: 10 }}>
            <Button
              display="full"
              variant="weak"
              onClick={() => {
                removePerson(profile.id);
                openToast("삭제했어요.");
              }}
            >
              이 사람 삭제
            </Button>
          </div>
        </Card>
      )}

      {/* 한 줄 요약 */}
      <Card
        style={{
          marginTop: 12,
          background: `linear-gradient(135deg, ${palette.primary}, ${palette.primaryDeep})`,
        }}
      >
        <Paragraph
          typography="t5"
          fontWeight="bold"
          color={palette.white}
          style={{ lineHeight: 1.6 }}
        >
          {reading.headline}
        </Paragraph>
      </Card>

      {/* 원국 4기둥 */}
      <Card style={{ marginTop: 12 }}>
        <Paragraph typography="t6" fontWeight="bold" color={palette.ink}>
          사주 원국
        </Paragraph>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          {pillars.map((p) => (
            <div key={p.label} style={{ flex: 1, textAlign: "center" }}>
              <Paragraph typography="t7" color={palette.sub}>
                {p.label}
              </Paragraph>
              <div
                style={{
                  marginTop: 6,
                  padding: "12px 0",
                  borderRadius: 12,
                  background: palette.bg,
                  fontSize: 22,
                  fontWeight: 700,
                  color: palette.ink,
                }}
              >
                {p.name}
              </div>
              <Paragraph typography="t7" color={palette.primary} style={{ marginTop: 5 }}>
                {p.god}
              </Paragraph>
              <Paragraph typography="t7" color={palette.sub}>
                {p.stage}
              </Paragraph>
            </div>
          ))}
        </div>
        {/* 표 아래 두 줄이 무엇인지 어디에도 없었어요 — 이 화면의 대표 표인데
            첫 사용자에겐 한자 나열로만 보였어요. */}
        <Paragraph typography="t7" color={palette.sub} style={{ marginTop: 12, lineHeight: 1.5 }}>
          가운데 줄은 십성(사회에서 드러나는 역할), 아래 줄은 십이운성(그 자리 기운의
          세기)이에요.
        </Paragraph>
        {!profile.birthTime && (
          <div style={{ marginTop: 12 }}>
            <Button display="full" variant="weak" onClick={() => setEditing(true)}>
              태어난 시간 넣고 시주 보기
            </Button>
          </div>
        )}
      </Card>

      {/* 오행 균형 */}
      <Card style={{ marginTop: 12 }}>
        <Paragraph typography="t6" fontWeight="bold" color={palette.ink}>
          오행 분포
        </Paragraph>
        <div style={{ display: "flex", gap: 10, marginTop: 14, alignItems: "flex-end" }}>
          {(Object.entries(saju.elementCount) as [Element, number][]).map(
            ([el, n]) => (
              <div key={el} style={{ flex: 1, textAlign: "center" }}>
                <div
                  style={{
                    height: 70,
                    display: "flex",
                    alignItems: "flex-end",
                    justifyContent: "center",
                  }}
                >
                  <div
                    style={{
                      width: "70%",
                      height: `${maxCount === 0 ? 0 : (n / maxCount) * 100}%`,
                      minHeight: n === 0 ? 3 : 10,
                      borderRadius: 6,
                      background: n === 0 ? palette.line : ELEMENT_COLOR[el],
                    }}
                  />
                </div>
                <Paragraph
                  typography="t7"
                  fontWeight="bold"
                  color={n === 0 ? palette.sub : palette.ink}
                  style={{ marginTop: 6 }}
                >
                  {el} {n}
                </Paragraph>
              </div>
            ),
          )}
        </div>
      </Card>

      {/* 시간 단위 운의 사다리 — 명리에 주(週) 단위는 없어요.
          매달·매년 바뀌므로 다시 볼 이유가 되는 화면이라 무료로 둬요. */}
      <Card style={{ marginTop: 12 }}>
        <Paragraph typography="t6" fontWeight="bold" color={palette.ink}>
          지금 흐르는 운
        </Paragraph>
        <div style={{ marginTop: 10 }}>
          {flow.map((f) => (
            <div
              key={f.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 0",
                borderBottom: `1px solid ${palette.line}`,
              }}
            >
              <Paragraph typography="t7" color={palette.sub} style={{ width: 34 }}>
                {f.label}
              </Paragraph>
              <Paragraph typography="t7" color={palette.sub} style={{ width: 48 }}>
                {f.when}
              </Paragraph>
              <Paragraph
                typography="t6"
                fontWeight="bold"
                color={palette.ink}
                style={{ width: 44 }}
              >
                {f.pillar}
              </Paragraph>
              <Paragraph typography="t7" color={palette.primary} style={{ flex: 1 }}>
                {f.god}
              </Paragraph>
              <Paragraph
                typography="t7"
                fontWeight="bold"
                color={f.good ? palette.good : palette.sub}
              >
                {f.good ? "순풍" : "역풍"}
              </Paragraph>
            </div>
          ))}
        </div>
        <Paragraph typography="t7" color={palette.sub} style={{ marginTop: 10, lineHeight: 1.5 }}>
          위에서 아래로 갈수록 짧은 흐름이에요. 사주에는 주(週) 단위가 없어서 대운·세운·월운·일운으로 봐요.
        </Paragraph>
      </Card>

      {/* 오늘·이번 달 상세 — 내용이 실제로 매일·매달 새로 생기므로 그때마다 해금 */}
      <PeriodCard
        title="오늘 사주 상세 풀이"
        hint={`오늘 일진 ${todayPillar.name}이 내 원국에 어떻게 작용하는지 십성·십이운성·충합까지 풀어드려요.`}
        open={dailyOpen}
        sections={dailySections}
        onUnlock={() =>
          watchThen(() => {
            unlockSaju("daily");
            track(EVENT.detailUnlocked, { category: "saju_daily", via: "ad" });
            openToast("오늘 사주 풀이를 열었어요!");
          }, "saju_daily")
        }
        note="내일이 되면 새 풀이가 나와요."
      />

      <PeriodCard
        title={`${today.slice(0, 4)}년 사주 상세 풀이`}
        hint={`올해 세운 ${yearPillar.name}이 내 원국에 어떻게 작용하는지 풀어드려요.`}
        open={yearlyOpen}
        sections={yearlySections}
        onUnlock={() =>
          watchThen(() => {
            unlockSaju("yearly");
            track(EVENT.detailUnlocked, { category: "saju_yearly", via: "ad" });
            openToast("올해 사주 풀이를 열었어요!");
          }, "saju_yearly")
        }
        note="세운은 입춘에 바뀌어요. 새 세운이 시작되면 새 풀이가 나와요."
      />

      <PeriodCard
        title={`${Number(today.slice(5, 7))}월 사주 상세 풀이`}
        hint={`이번 달 월운 ${monthPillar.name}이 내 원국에 어떻게 작용하는지 풀어드려요.`}
        open={monthlyOpen}
        sections={monthlySections}
        onUnlock={() =>
          watchThen(() => {
            unlockSaju("monthly");
            track(EVENT.detailUnlocked, { category: "saju_monthly", via: "ad" });
            openToast("이번 달 사주 풀이를 열었어요!");
          }, "saju_monthly")
        }
        note="다음 달이 되면 새 풀이가 나와요."
      />

      <div style={{ marginTop: 12 }}>
        <BannerAd slot="saju_mid" />
      </div>

      {/* 풀이 본문 — 첫 섹션(일간)은 맛보기로 열어두고 나머지는 광고 해금.
          사주는 평생 안 바뀌니 한 번 열면 그 사람은 계속 열려 있어요. */}
      {reading.sections
        .slice(0, readingOpen ? undefined : 1)
        .map((s) => (
          <Card key={s.title} style={{ marginTop: 12 }}>
            <Paragraph typography="t6" fontWeight="bold" color={palette.primary}>
              {s.title}
            </Paragraph>
            <Paragraph
              typography="t6"
              color={palette.ink}
              style={{ marginTop: 8, lineHeight: 1.7, whiteSpace: "pre-line" }}
            >
              {s.body}
            </Paragraph>
          </Card>
        ))}

      {!readingOpen && reading.sections.length > 1 && (
        <Card style={{ marginTop: 12 }}>
          {/* 제목만 나열하면 뭘 여는지 감이 안 와요 — 다음 풀이의 실제 첫
              줄까지 보여주고 나머지를 가려요. */}
          <Paragraph typography="t6" fontWeight="bold" color={palette.primary}>
            🔒 {reading.sections[1].title}
          </Paragraph>
          <Teaser text={reading.sections[1].body} />
          <Paragraph
            typography="t7"
            color={palette.sub}
            style={{ marginTop: 8, lineHeight: 1.5 }}
          >
            남은 풀이 {reading.sections.length - 1}개 ·{" "}
            {reading.sections
              .slice(1)
              .map((s) => s.title.split(" —")[0])
              .join(" · ")}
          </Paragraph>
          <div style={{ marginTop: 12 }}>
            <Button
              display="full"
              onClick={() =>
                watchThen(() => {
                  unlockSaju("reading");
                  track(EVENT.detailUnlocked, { category: "saju_reading", via: "ad" });
                  openToast("사주 풀이를 열었어요!");
                }, "saju_reading")
              }
            >
              📺 광고 보고 전체 풀이 보기
            </Button>
          </div>
          <Paragraph typography="t7" color={palette.sub} style={{ marginTop: 10 }}>
            한 번 열면 이 사람 풀이는 계속 볼 수 있어요.
          </Paragraph>
        </Card>
      )}

      {/* 대운 흐름 — 별도 해금 */}
      {reading.fortunes.length > 0 && !daewoonOpen ? (
        <Card style={{ marginTop: 12 }}>
          <Paragraph typography="t6" fontWeight="bold" color={palette.ink}>
            🔒 대운 흐름 (10년 주기)
          </Paragraph>
          {/* 표 자체를 흐리게 — 뭐가 나오는지는 보이되 읽히지는 않게 */}
          <div style={{ display: "flex", gap: 6, marginTop: 12, ...BLURRED }}>
            {reading.fortunes.slice(0, 6).map((f) => (
              <div
                key={f.startAge}
                style={{
                  flex: 1,
                  textAlign: "center",
                  padding: "10px 6px",
                  borderRadius: 10,
                  background: palette.bg,
                }}
              >
                <Paragraph typography="t7" color={palette.sub}>
                  {f.startAge}세
                </Paragraph>
                <Paragraph
                  typography="t6"
                  fontWeight="bold"
                  color={palette.ink}
                  style={{ marginTop: 3 }}
                >
                  {f.pillar.name}
                </Paragraph>
              </div>
            ))}
          </div>
          <Paragraph typography="t7" color={palette.sub} style={{ marginTop: 10, lineHeight: 1.5 }}>
            10년마다 바뀌는 큰 흐름을 80년치로 봐요. 지금 어느 대운에 있는지도
            함께 알려드려요.
          </Paragraph>
          <div style={{ marginTop: 12 }}>
            <Button
              display="full"
              onClick={() =>
                watchThen(() => {
                  unlockSaju("daewoon");
                  track(EVENT.detailUnlocked, { category: "saju_daewoon", via: "ad" });
                  openToast("대운을 열었어요!");
                }, "saju_daewoon")
              }
            >
              📺 광고 보고 대운 보기
            </Button>
          </div>
        </Card>
      ) : reading.fortunes.length > 0 ? (
        <Card style={{ marginTop: 12 }}>
          <Paragraph typography="t6" fontWeight="bold" color={palette.ink}>
            대운 흐름 (10년 주기)
          </Paragraph>
          <div style={{ display: "flex", gap: 6, marginTop: 12, overflowX: "auto" }}>
            {reading.fortunes.map((f) => {
              const on = f.startAge === reading.currentFortune?.startAge;
              return (
                <div
                  key={f.startAge}
                  style={{
                    flexShrink: 0,
                    minWidth: 58,
                    textAlign: "center",
                    padding: "10px 6px",
                    borderRadius: 10,
                    background: on ? palette.primary : palette.bg,
                  }}
                >
                  <Paragraph
                    typography="t7"
                    color={on ? palette.white : palette.sub}
                  >
                    {f.startAge}세
                  </Paragraph>
                  <Paragraph
                    typography="t6"
                    fontWeight="bold"
                    color={on ? palette.white : palette.ink}
                    style={{ marginTop: 3 }}
                  >
                    {f.pillar.name}
                  </Paragraph>
                </div>
              );
            })}
          </div>
        </Card>
      ) : (
        <Card style={{ marginTop: 12 }}>
          <Paragraph typography="t7" color={palette.sub} style={{ lineHeight: 1.6 }}>
            대운은 10년마다 바뀌는 큰 흐름이에요. 남녀에 따라 흐르는 방향이 달라서,
            성별을 넣어야 볼 수 있어요.
          </Paragraph>
          <div style={{ marginTop: 12 }}>
            <Button display="full" variant="weak" onClick={() => setEditing(true)}>
              성별 넣고 대운 보기
            </Button>
          </div>
        </Card>
      )}

      <Paragraph
        typography="t7"
        color={palette.sub}
        style={{ margin: "16px 4px 0", lineHeight: 1.5 }}
      >
        시주는 진태양시(서울 기준 약 32분)를 보정해 계산해요. 시계 시각을 그대로 쓰는
        만세력과는 시주가 한 칸 다를 수 있어요.
      </Paragraph>
      <Paragraph
        typography="t7"
        color={palette.sub}
        style={{ margin: "10px 4px 0", lineHeight: 1.5 }}
      >
        사주 풀이는 재미로 보는 참고 정보예요. 생년월일·태어난 시간·성별은 사주 계산에만
        쓰이고 이 기기에만 저장돼요. 검증 결과는 이름·생년월일 없이 띠 단위 익명 집계로만
        서버에 저장돼요.
      </Paragraph>
    </ScreenLayout>
  );
}

/** 매번 새로 열리는 기간 풀이(오늘·이번 달) 카드 */
function PeriodCard({
  title,
  hint,
  open,
  sections,
  onUnlock,
  note,
}: {
  title: string;
  hint: string;
  open: boolean;
  sections: ReadingSection[];
  onUnlock: () => void;
  note: string;
}) {
  if (open) {
    return (
      <>
        {sections.map((s, i) => (
          <Card key={s.title} style={{ marginTop: 12 }}>
            {i === 0 && (
              <Paragraph
                typography="t7"
                color={palette.sub}
                style={{ marginBottom: 6 }}
              >
                {title}
              </Paragraph>
            )}
            <Paragraph typography="t6" fontWeight="bold" color={palette.primary}>
              {s.title}
            </Paragraph>
            <Paragraph
              typography="t6"
              color={palette.ink}
              style={{ marginTop: 8, lineHeight: 1.7, whiteSpace: "pre-line" }}
            >
              {s.body}
            </Paragraph>
          </Card>
        ))}
      </>
    );
  }
  return (
    <Card style={{ marginTop: 12 }}>
      <Paragraph typography="t6" fontWeight="bold" color={palette.ink}>
        🔒 {title}
      </Paragraph>
      {/* 첫 풀이의 앞 한 줄까지는 보여줘요 */}
      {sections[0] && (
        <>
          <Paragraph
            typography="t6"
            fontWeight="bold"
            color={palette.primary}
            style={{ marginTop: 10 }}
          >
            {sections[0].title}
          </Paragraph>
          <Teaser text={sections[0].body} />
        </>
      )}
      <Paragraph typography="t7" color={palette.sub} style={{ marginTop: 8, lineHeight: 1.5 }}>
        {hint}
      </Paragraph>
      <div style={{ marginTop: 12 }}>
        <Button display="full" onClick={onUnlock}>
          📺 광고 보고 이어서 보기
        </Button>
      </div>
      <Paragraph typography="t7" color={palette.sub} style={{ marginTop: 10 }}>
        {note}
      </Paragraph>
    </Card>
  );
}

function AddPersonCard({
  onSubmit,
  onCancel,
  title = "사람 추가",
  submitLabel = "📺 광고 보고 추가",
  initial,
}: {
  onSubmit: (
    birthDate: string,
    birthTime: string | undefined,
    name: string,
    gender: Gender | undefined,
  ) => void;
  onCancel: () => void;
  title?: string;
  submitLabel?: string;
  initial?: {
    name: string;
    birthDate: string;
    birthTime: string;
    gender: Gender | undefined;
  };
}) {
  const [birthDate, setBirthDate] = useState(initial?.birthDate ?? "");
  const [birthTime, setBirthTime] = useState(initial?.birthTime ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [gender, setGender] = useState<Gender | undefined>(initial?.gender);
  const { openToast } = useToast();

  const preview =
    birthDate.length === 10
      ? (() => {
          const s = computeSaju(birthDate, birthTime || undefined);
          return `${s.year.name}년 ${s.month.name}월 ${s.day.name}일`;
        })()
      : null;

  return (
    <Card style={{ marginTop: 12 }}>
      <Paragraph typography="t6" fontWeight="bold" color={palette.ink}>
        {title}
      </Paragraph>

      <label style={labelStyle}>이름 · 별명</label>
      <input
        type="text"
        value={name}
        maxLength={10}
        placeholder="예: 엄마, 김대리"
        onChange={(e) => setName(e.target.value)}
        style={inputStyle}
      />

      <label style={{ ...labelStyle, marginTop: 12 }}>생년월일</label>
      <input
        type="date"
        value={birthDate}
        max="2026-12-31"
        min="1930-01-01"
        onChange={(e) => setBirthDate(e.target.value)}
        style={inputStyle}
      />

      <label style={{ ...labelStyle, marginTop: 12 }}>태어난 시간 (선택)</label>
      <input
        type="time"
        value={birthTime}
        onChange={(e) => setBirthTime(e.target.value)}
        style={inputStyle}
      />

      <label style={{ ...labelStyle, marginTop: 12 }}>성별 (선택)</label>
      <div style={{ display: "flex", gap: 8 }}>
        {(["남", "여"] as const).map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => setGender(gender === g ? undefined : g)}
            style={{
              flex: 1,
              padding: "11px 0",
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              border: `1px solid ${gender === g ? palette.primary : palette.line}`,
              background: gender === g ? palette.primary : "#FBFAFF",
              color: gender === g ? palette.white : palette.sub,
            }}
          >
            {g}
          </button>
        ))}
      </div>

      {preview && (
        <div
          style={{
            marginTop: 12,
            padding: "10px 14px",
            borderRadius: 12,
            background: palette.bg,
            textAlign: "center",
          }}
        >
          <Paragraph typography="t6" fontWeight="bold" color={palette.primary}>
            {preview}
          </Paragraph>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <Button display="full" variant="weak" onClick={onCancel}>
          취소
        </Button>
        <Button
          display="full"
          onClick={() => {
            if (birthDate.length !== 10) {
              openToast("생년월일을 입력해 주세요.");
              return;
            }
            onSubmit(birthDate, birthTime || undefined, name.trim(), gender);
          }}
        >
          {submitLabel}
        </Button>
      </div>
      {!initial && (
        <Paragraph typography="t7" color={palette.sub} style={{ marginTop: 10, lineHeight: 1.5 }}>
          추가한 사람의 이름·생년월일·시간·성별은 이 기기에만 저장돼요. 본인 동의를 받고
          입력해 주세요. 언제든 삭제할 수 있어요.
        </Paragraph>
      )}
    </Card>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: palette.sub,
  marginBottom: 6,
  marginTop: 12,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  // date/time 은 내부 높이가 글자 입력과 달라서, 높이를 고정하지 않으면
  // 필드마다 세로 크기가 어긋나 보여요.
  height: 48,
  padding: "12px 14px",
  borderRadius: 12,
  border: `1px solid ${palette.line}`,
  fontSize: 16,
  color: palette.ink,
  background: "#FBFAFF",
  outline: "none",
};
