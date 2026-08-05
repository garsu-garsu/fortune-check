import { useState } from "react";

import { Button, Paragraph, useToast } from "@toss/tds-mobile";

import { Card, ScreenLayout } from "../../components/ScreenLayout";
import { requestNotifyConsent } from "../../data/notify";
import { type Gender } from "../../data/saju";
import { starSignOf, zodiacOf } from "../../data/zodiac";
import { EVENT, track } from "../../lib/analytics";
import { useRouter } from "../../router";
import { useAppState } from "../../state";
import { palette } from "../../theme";

const STEPS = [
  { emoji: "🔮", title: "사주로 봐요", desc: "생년월일로 사주 원국을 계산해 오늘의 기운을 풀어요." },
  { emoji: "✅", title: "밤엔 검증해요", desc: "운세가 실제로 맞았는지 O/X로 3초 체크인해요." },
  { emoji: "📊", title: "적중률을 쌓아요", desc: "나에게 어떤 운이 잘 맞는지 매일 또렷해져요." },
];

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
      void requestNotifyConsent().then((consent) => {
        if (consent) track(EVENT.notifyConsent, { result: consent, where: "onboarding" });
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenLayout
      title="운세·사주 팩트체크"
      subtitle="사주로 보고, 밤에 맞았는지 검증해요"
    >
      <Card style={{ marginTop: 4 }}>
        <label style={labelStyle}>생년월일</label>
        <input
          type="date"
          value={birthDate}
          max="2010-12-31"
          min="1940-01-01"
          onChange={(e) => setBirthDate(e.target.value)}
          style={inputStyle}
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

        <button
          type="button"
          onClick={() => setShowOptional((v) => !v)}
          style={toggleStyle}
        >
          {showOptional
            ? "선택 입력 접기"
            : "태어난 시간·성별·닉네임 넣기 (선택)"}
        </button>

        {showOptional && (
          <>
            <label style={labelStyle}>태어난 시간</label>
            <input
              type="time"
              value={birthTime}
              onChange={(e) => setBirthTime(e.target.value)}
              style={inputStyle}
            />

            {/* 대운(10년 주기)은 양남·음녀 순행 / 음남·양녀 역행이라 성별이 있어야 계산돼요 */}
            <label style={{ ...labelStyle, marginTop: 12 }}>
              성별 (대운 계산에 필요)
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              {(["남", "여"] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGender(gender === g ? undefined : g)}
                  style={{
                    flex: 1,
                    padding: "12px 0",
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

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 20 }}>
        {STEPS.map((s, i) => (
          <Card key={s.title} style={{ display: "flex", alignItems: "center", gap: 14, padding: 16 }}>
            <div style={{ fontSize: 30, lineHeight: 1 }}>{s.emoji}</div>
            <div style={{ flex: 1 }}>
              <Paragraph typography="t6" fontWeight="bold" color={palette.ink} style={{ marginBottom: 3 }}>
                {i + 1}. {s.title}
              </Paragraph>
              <Paragraph typography="t7" color={palette.sub} style={{ lineHeight: 1.5 }}>
                {s.desc}
              </Paragraph>
            </div>
          </Card>
        ))}
      </div>

      <Paragraph typography="t7" color={palette.sub} style={{ margin: "14px 4px 0", lineHeight: 1.5 }}>
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
