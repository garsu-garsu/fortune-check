import { Button, Paragraph, useToast } from "@toss/tds-mobile";

import { BannerAd } from "../../components/BannerAd";
import { Card, ScreenLayout } from "../../components/ScreenLayout";
import {
  CATEGORIES,
  generateFortune,
  type CategoryMeta,
} from "../../data/fortune";
import { EVENT, track } from "../../lib/analytics";
import { useAdGate } from "../../hooks/useAdGate";
import { useInterstitialAd } from "../../hooks/useInterstitialAd";
import { useRouter } from "../../router";
import { useAppState } from "../../state";
import { palette } from "../../theme";

export function VerifyScreen() {
  const {
    profile,
    today,
    isViewed,
    verdictOf,
    submitCheck,
    streak,
    canSaveStreak,
    atRiskStreak,
    saveStreak,
  } = useAppState();
  const { navigate } = useRouter();
  const { maybeShow } = useInterstitialAd(3);
  const { watchThen } = useAdGate();
  const { openToast } = useToast();

  // 연속 기록이 끊길 위기 → 광고 보고 어제를 메워 기록 유지(결정적 2nd-chance)
  const onSaveStreak = () => {
    watchThen(() => {
      saveStreak();
      track(EVENT.streakSaved, { saved_streak: atRiskStreak });
      openToast(`연속 ${atRiskStreak}일 기록을 지켰어요!`);
    }, "streak_save");
  };

  if (!profile) return null;

  const viewedCats = CATEGORIES.filter((c) => isViewed(c.key));
  const allDone =
    viewedCats.length > 0 &&
    viewedCats.every((c) => verdictOf(c.key) !== null);

  const onVerdict = (meta: CategoryMeta, verdict: boolean) => {
    const wasAllPending = !allDone;
    submitCheck(meta.key, verdict);
    track(EVENT.verifySubmitted, {
      category: meta.key,
      verdict: verdict ? "O" : "X",
    });
    openToast(verdict ? "맞았어요로 기록!" : "안 맞았어요로 기록!");
    // 검증을 모두 마치면 자연 경계에서 전면 광고(세션당 ≤1) 후 통계로
    const remaining = viewedCats.filter(
      (c) => c.key !== meta.key && verdictOf(c.key) === null,
    ).length;
    if (wasAllPending && remaining === 0) {
      if (streak + 1 === 7 || streak + 1 === 14 || streak + 1 === 30) {
        track(EVENT.streakMilestone, { days: streak + 1 });
      }
      maybeShow(() => navigate({ name: "stats" }), "verify_done");
    }
  };

  return (
    <ScreenLayout
      title="오늘 운세, 맞았어요?"
      subtitle="확인한 운세를 O/X로 검증하면 적중률이 쌓여요"
    >
      {/* 화면당 배너 1개 — 최상단 이미지 강조 */}
      <BannerAd slot="verify_top" />

      {/* 연속 기록 끊길 위기 → 광고 보고 지키기 (손실회피 2nd-chance) */}
      {canSaveStreak && (
        <Card
          style={{
            marginTop: 8,
            background: `linear-gradient(135deg, ${palette.bad}, #FF7043)`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 28 }}>⚠️</span>
            <div style={{ flex: 1 }}>
              <Paragraph typography="t6" fontWeight="bold" color={palette.white}>
                연속 {atRiskStreak}일 기록이 끊길 위기예요!
              </Paragraph>
              <Paragraph typography="t7" color={palette.white} style={{ opacity: 0.92 }}>
                어제 검증을 놓쳤어요. 지금 광고를 보면 기록을 이어갈 수 있어요.
              </Paragraph>
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <Button display="full" color="dark" onClick={onSaveStreak}>
              📺 광고 보고 연속 기록 지키기
            </Button>
          </div>
        </Card>
      )}

      {/* 스트릭 배너 */}
      <Card
        style={{
          marginTop: 8,
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: `linear-gradient(135deg, ${palette.gold}, #FF9F43)`,
        }}
      >
        <span style={{ fontSize: 30 }}>🔥</span>
        <div>
          <Paragraph typography="t6" fontWeight="bold" color={palette.white}>
            연속 검증 {streak}일째
          </Paragraph>
          <Paragraph typography="t7" color={palette.white} style={{ opacity: 0.9 }}>
            매일 검증하면 기록이 이어져요
          </Paragraph>
        </div>
      </Card>

      {viewedCats.length === 0 ? (
        <Card style={{ marginTop: 16, textAlign: "center" }}>
          <div style={{ fontSize: 40 }}>🌙</div>
          <Paragraph typography="t6" fontWeight="bold" color={palette.ink} style={{ marginTop: 8 }}>
            아직 확인한 운세가 없어요
          </Paragraph>
          <Paragraph typography="t7" color={palette.sub} style={{ marginTop: 6, lineHeight: 1.5 }}>
            오늘 운세를 먼저 확인하면 밤에 검증할 수 있어요. (아침에 본 운세만 검증돼요)
          </Paragraph>
          <div style={{ marginTop: 14 }}>
            <Button display="full" onClick={() => navigate({ name: "home" })}>
              오늘 운세 확인하러 가기
            </Button>
          </div>
        </Card>
      ) : (
        viewedCats.map((meta) => {
          const f = generateFortune(
            today,
            profile.zodiac,
            profile.starSign,
            meta.key,
          );
          const v = verdictOf(meta.key);
          return (
            <Card key={meta.key} style={{ marginTop: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 18 }}>{meta.emoji}</span>
                <Paragraph typography="t6" fontWeight="bold" color={palette.ink}>
                  {meta.label}
                </Paragraph>
              </div>
              <Paragraph
                typography="t6"
                color={palette.ink}
                style={{ marginTop: 8, lineHeight: 1.6 }}
              >
                {f.text}
              </Paragraph>

              {v === null ? (
                <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                  <Button
                    display="full"
                    onClick={() => onVerdict(meta, true)}
                    style={{ background: palette.good }}
                  >
                    ⭕ 맞았어요
                  </Button>
                  <Button
                    display="full"
                    variant="weak"
                    onClick={() => onVerdict(meta, false)}
                  >
                    ❌ 아니에요
                  </Button>
                </div>
              ) : (
                <div
                  style={{
                    marginTop: 12,
                    padding: "8px 12px",
                    borderRadius: 10,
                    background: palette.bg,
                    textAlign: "center",
                  }}
                >
                  <Paragraph
                    typography="t6"
                    fontWeight="bold"
                    color={v ? palette.good : palette.bad}
                  >
                    {v ? "⭕ 맞았어요로 기록됨" : "❌ 안 맞았어요로 기록됨"}
                  </Paragraph>
                </div>
              )}
            </Card>
          );
        })
      )}

      {allDone && (
        <div style={{ marginTop: 16 }}>
          <Button display="full" onClick={() => navigate({ name: "stats" })}>
            내 적중률 보러 가기 📊
          </Button>
        </div>
      )}
    </ScreenLayout>
  );
}
