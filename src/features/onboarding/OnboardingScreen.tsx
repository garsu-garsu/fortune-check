import { useState } from "react";

import { Button, Paragraph, useToast } from "@toss/tds-mobile";

import { Card, ScreenLayout } from "../../components/ScreenLayout";
import { requestNotifyConsent } from "../../data/notify";
import { starSignOf, zodiacOf } from "../../data/zodiac";
import { EVENT, track } from "../../lib/analytics";
import { useRouter } from "../../router";
import { useAppState } from "../../state";
import { palette } from "../../theme";

const STEPS = [
  { emoji: "🔮", title: "아침엔 받아요", desc: "오늘의 운세를 종합·애정·금전·직장으로 확인해요." },
  { emoji: "✅", title: "밤엔 검증해요", desc: "운세가 실제로 맞았는지 O/X로 3초 체크인해요." },
  { emoji: "📊", title: "적중률을 쌓아요", desc: "나만의 운세 적중률과 전국 띠별 랭킹이 매일 쌓여요." },
];

export function OnboardingScreen() {
  const { reset } = useRouter();
  const { saveProfile } = useAppState();
  const { openToast } = useToast();

  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [nickname, setNickname] = useState("");
  const [busy, setBusy] = useState(false);

  const preview =
    birthDate.length === 10
      ? `${zodiacOf(birthDate).emoji} ${zodiacOf(birthDate).name} · ${starSignOf(birthDate).emoji} ${starSignOf(birthDate).name}`
      : null;

  const start = async () => {
    if (busy) return;
    if (birthDate.length !== 10) {
      openToast("생년월일을 입력해 주세요.");
      return;
    }
    setBusy(true);
    try {
      saveProfile(birthDate, birthTime, nickname.trim());
      track(EVENT.onboardingComplete, {});
      track(EVENT.signup, { method: "guest" });
      // 아침 운세 / 밤 검증 알림 동의 (토스 앱에서만 동작)
      const consent = await requestNotifyConsent();
      if (consent) track(EVENT.notifyConsent, { result: consent });
      reset({ name: "home" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenLayout
      title="운세 팩트체크"
      subtitle="읽고 끝이 아니라, 맞았는지 검증해요"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 4 }}>
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

      <Card style={{ marginTop: 16 }}>
        <Paragraph typography="t6" fontWeight="bold" color={palette.ink} style={{ marginBottom: 12 }}>
          내 정보 입력
        </Paragraph>

        <label style={labelStyle}>생년월일</label>
        <input
          type="date"
          value={birthDate}
          max="2010-12-31"
          min="1940-01-01"
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

        <label style={{ ...labelStyle, marginTop: 12 }}>닉네임 (선택)</label>
        <input
          type="text"
          value={nickname}
          maxLength={10}
          placeholder="예: 별보는사람"
          onChange={(e) => setNickname(e.target.value)}
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
      </Card>

      <Paragraph typography="t7" color={palette.sub} style={{ margin: "14px 4px 0", lineHeight: 1.5 }}>
        생년월일은 띠·별자리 산출에만 쓰이고 이 기기에만 저장돼요(서버 전송 안 함). 모든 보상은 앱 내 가상 보상이에요.
      </Paragraph>

      <div style={{ marginTop: 18 }}>
        <Button size="xlarge" display="full" loading={busy} onClick={start}>
          시작하기
        </Button>
      </div>
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

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 14px",
  borderRadius: 12,
  border: `1px solid ${palette.line}`,
  fontSize: 16,
  color: palette.ink,
  background: "#FBFAFF",
  outline: "none",
};
