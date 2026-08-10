import { useRef, useState } from "react";

import { Button, Paragraph, useToast } from "@toss/tds-mobile";

import { BirthDateField } from "../../components/BirthDateField";
import { BirthHourField } from "../../components/BirthHourField";
import { Card, ScreenLayout } from "../../components/ScreenLayout";
import { DEFAULT_MORNING_CODE, requestNotifyConsent } from "../../data/notify";
import { ELEMENT_TRAIT } from "../../data/reading";
import {
  SINSAL_MEANING,
  TEN_GOD_MEANING,
  branchElement,
  branchRelationOf,
  dayPillarOf,
  sinsalOf,
  stemElement,
  tenGodOf,
  type Gender,
} from "../../data/saju";
import { ZODIAC_PICK, starSignOf, zodiacOf } from "../../data/zodiac";
import { EVENT, track } from "../../lib/analytics";
import { kstDate } from "../../lib/kst";
import { useRouter } from "../../router";
import { useAppState } from "../../state";
import { palette } from "../../theme";

export function OnboardingScreen() {
  const { reset } = useRouter();
  const { saveProfile } = useAppState();
  const { openToast } = useToast();

  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [nickname, setNickname] = useState("");
  const [gender, setGender] = useState<Gender | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  // 선택 항목은 접어둬요 — 첫 화면에 필드가 4개 보이면 입력 자체를 포기해요.
  const [showOptional, setShowOptional] = useState(false);
  // "화면만 보고 이탈"과 "입력하다 이탈"을 구분하려고, 입력을 시작한 순간을 1회만 남겨요.
  const startedRef = useRef(false);
  // 띠 미리보기 — 지지 인덱스(0=자/쥐). 아직 안 골랐으면 null.
  const [pickedZodiac, setPickedZodiac] = useState<number | null>(null);

  const todayPillar = dayPillarOf(kstDate());
  const todayElement = stemElement(todayPillar.stem);

  const pickedGod =
    pickedZodiac != null ? tenGodOf(branchElement(pickedZodiac), todayElement) : null;
  const pickedRel =
    pickedZodiac != null ? branchRelationOf(pickedZodiac, todayPillar.branch) : null;
  const pickedSin =
    pickedZodiac != null ? sinsalOf(pickedZodiac, todayPillar.branch) : null;
  // 충/합/삼합이 있으면 그걸 보너스로, 없으면 신살이 있을 때만 보너스로 보여줘요.
  const pickedBonus =
    pickedRel === "충" ? (
      <>
        오늘 일진과 <b>충</b>이에요. 부딪히기 쉬우니 한 박자 늦춰도 좋아요.
      </>
    ) : pickedRel === "육합" ? (
      <>
        오늘 일진과 <b>합</b>이에요. 사람과 잘 맞는 흐름이에요.
      </>
    ) : pickedRel === "삼합" ? (
      <>
        오늘 일진과 <b>삼합</b>이에요. 일이 술술 풀리는 흐름이에요.
      </>
    ) : pickedSin ? (
      <>
        <b>{pickedSin}</b>의 기운이 있어요 — {SINSAL_MEANING[pickedSin]}.
      </>
    ) : null;

  const preview =
    birthDate.length === 10
      ? `${zodiacOf(birthDate).emoji} ${zodiacOf(birthDate).name} · ${starSignOf(birthDate).emoji} ${starSignOf(birthDate).name}`
      : null;

  const start = () => {
    if (busy) return;
    if (birthDate.length !== 10) {
      openToast("생년월일을 입력해 주세요.");
      return;
    }
    setBusy(true);
    try {
      saveProfile(birthDate, birthTime, nickname.trim(), gender);
      track(EVENT.onboardingComplete, {});
      track(EVENT.signup, { method: "guest" });
      // 운세를 먼저 보여주고 알림 동의를 물어요. 결과를 보기도 전에 시스템 팝업이
      // 뜨면 받은 것 없이 거절하게 돼요 — 화면을 넘긴 뒤에 요청해요.
      reset({ name: "home" });
      void requestNotifyConsent(DEFAULT_MORNING_CODE).then((consent) => {
        if (consent) track(EVENT.notifyConsent, { result: consent, where: "onboarding" });
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenLayout hideAd title="운세·사주 팩트체크"
      subtitle="사주로 보고, 맞았는지 검증해요"
    >
      {/* 입력 전에 오늘의 일진을 먼저 보여줘요 — 생년월일을 넣기 전에도 얻는 게 있어야 해요.
          단, 이건 모두에게 같은 일진이라 "운세"라는 말은 쓰지 않아요(개인 운세로 오해 방지). */}
      <Card style={{ marginTop: 4 }}>
        <Paragraph typography="t5" fontWeight="bold" color={palette.ink}>
          오늘은 {todayPillar.name}일
        </Paragraph>
        <Paragraph typography="t6" color={palette.ink} style={{ marginTop: 6, lineHeight: 1.6 }}>
          <b>{todayElement}</b> 기운이 도는 날이에요 — {ELEMENT_TRAIT[todayElement]}.
        </Paragraph>

        <Paragraph typography="t7" color={palette.sub} style={{ marginTop: 10, marginBottom: 6 }}>
          내 띠를 눌러보세요
        </Paragraph>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 4 }}>
          {ZODIAC_PICK.map((z, i) => (
            <button
              key={z.name}
              type="button"
              onClick={() => {
                setPickedZodiac(i);
                track(EVENT.previewTapped, { zodiac: z.name });
              }}
              style={{
                height: 44,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
                padding: 0,
                borderRadius: 10,
                border: `1px solid ${pickedZodiac === i ? palette.primary : palette.line}`,
                background: pickedZodiac === i ? palette.primary : "#FBFAFF",
                color: pickedZodiac === i ? palette.white : palette.ink,
                cursor: "pointer",
              }}
            >
              <span style={{ fontSize: 16, lineHeight: 1 }}>{z.emoji}</span>
              <span style={{ fontSize: 10, lineHeight: 1 }}>{z.name}</span>
            </button>
          ))}
        </div>

        {pickedZodiac == null || pickedGod == null ? (
          <Paragraph typography="t6" color={palette.sub} style={{ marginTop: 10, lineHeight: 1.5 }}>
            이건 오늘 모두에게 같은 일진이에요. 내 사주에 어떻게 작용하는지는 생년월일을 넣어야 볼 수 있어요.
          </Paragraph>
        ) : (
          <div style={{ marginTop: 10 }}>
            <Paragraph typography="t6" color={palette.ink} style={{ lineHeight: 1.5 }}>
              {ZODIAC_PICK[pickedZodiac].emoji} {ZODIAC_PICK[pickedZodiac].name}띠는 오늘{" "}
              <b>{pickedGod}</b>({TEN_GOD_MEANING[pickedGod]})의 기운과 만나요.
            </Paragraph>
            {pickedBonus && (
              <Paragraph typography="t6" color={palette.ink} style={{ marginTop: 4, lineHeight: 1.5 }}>
                {pickedBonus}
              </Paragraph>
            )}
            <Paragraph typography="t6" color={palette.sub} style={{ marginTop: 4, lineHeight: 1.5 }}>
              이건 태어난 해 하나로만 본 거예요. 생년월일을 넣으면 네 기둥 전부로 봐요.
            </Paragraph>
          </div>
        )}
      </Card>

      <Card style={{ marginTop: 12 }}>
        <BirthDateField
          value={birthDate}
          onChange={(iso) => {
            if (!startedRef.current) {
              startedRef.current = true;
              track(EVENT.onboardingStarted, {});
            }
            setBirthDate(iso);
          }}
        />

        {preview && (
          <div
            style={{
              marginTop: 14,
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

        {/* 대운(10년 주기)은 양남·음녀 순행 / 음남·양녀 역행이라 성별이 있어야 계산돼요.
            접어두면 대부분 안 넣고 지나가서 10년 흐름을 아예 못 보여줬어요. */}
        <label style={{ ...labelStyle, marginTop: 16 }}>
          성별 (10년 단위 큰 흐름을 보려면 필요해요)
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          {(["남", "여"] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGender(gender === g ? undefined : g)}
              style={{
                flex: 1,
                padding: "14px 0",
                borderRadius: 12,
                fontSize: 16,
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

        <button
          type="button"
          onClick={() => setShowOptional((v) => !v)}
          style={toggleStyle}
        >
          {showOptional
            ? "선택 입력 접기"
            : "태어난 시간·닉네임 넣기 (선택)"}
        </button>

        {showOptional && (
          <>
            <BirthHourField value={birthTime} onChange={setBirthTime} />

            <label style={{ ...labelStyle, marginTop: 12 }}>닉네임</label>
            <input
              type="text"
              value={nickname}
              maxLength={10}
              placeholder="예: 별보는사람"
              onChange={(e) => setNickname(e.target.value)}
              style={inputStyle}
            />
          </>
        )}
      </Card>

      <div style={{ marginTop: 14 }}>
        <Button size="xlarge" display="full" loading={busy} onClick={start}>
          내 운세 보기
        </Button>
      </div>

      {/* 앱이 뭘 해주는지는 여기서 설명하지 않아요 — 첫 화면(홈)에서 코치마크로 짚어줘요. */}
      <Paragraph typography="t6" color={palette.sub} style={{ margin: "20px 4px 0", lineHeight: 1.5 }}>
        생년월일·태어난 시간·성별은 사주·띠·별자리 계산에만 쓰이고 이 기기에만 저장돼요. 검증 결과는 이름·생년월일 없이 띠 단위 익명 집계로만 서버에 저장돼요. 모든 보상은 앱 내 가상 보상이에요.
      </Paragraph>
    </ScreenLayout>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: palette.sub,
  marginBottom: 6,
};

const toggleStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  margin: "14px 0",
  padding: 0,
  border: "none",
  background: "none",
  fontSize: 13,
  fontWeight: 600,
  color: palette.primary,
  textAlign: "left",
  cursor: "pointer",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  height: 48,
  padding: "12px 14px",
  borderRadius: 12,
  border: `1px solid ${palette.line}`,
  fontSize: 16,
  color: palette.ink,
  background: "#FBFAFF",
  outline: "none",
};
