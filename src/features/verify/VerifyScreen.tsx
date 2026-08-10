import { useState } from "react";

import { Button, Paragraph, useToast } from "@toss/tds-mobile";

import { NotifySlotCard } from "../../components/NotifySlotCard";
import { Card, ScreenLayout } from "../../components/ScreenLayout";
import {
  CATEGORIES,
  type CategoryMeta,
  type CheckKind,
} from "../../data/fortune";
import { NIGHT_SLOTS, agreedNightSlot, retryNotifyConsentOnce } from "../../data/notify";
import { shareApp } from "../../data/share";
import { EVENT, track } from "../../lib/analytics";
import { askReviewOnce } from "../../lib/review";
import { useAdGate } from "../../hooks/useAdGate";
import { useInterstitialAd } from "../../hooks/useInterstitialAd";
import { useRouter } from "../../router";
import { useAppState } from "../../state";
import { palette } from "../../theme";

export function VerifyScreen() {
  const {
    me: profile,
    fortuneOf,
    sajuLineOf,
    isViewed,
    verdictOf,
    submitCheck,
    streak,
    canSaveStreak,
    atRiskStreak,
    saveStreak,
    daysSinceInstall,
  } = useAppState();
  const { navigate } = useRouter();
  const { maybeShow } = useInterstitialAd(1);
  const { watchThen } = useAdGate();
  const { openToast } = useToast();
  const [kind, setKind] = useState<CheckKind>("운세");
  const [agreedNight, setAgreedNight] = useState(agreedNightSlot);

  // 연속 기록이 끊길 위기 → 광고 보고 어제를 메워 기록 유지(결정적 2nd-chance)
  const onSaveStreak = () => {
    watchThen(() => {
      saveStreak();
      track(EVENT.streakSaved, { saved_streak: atRiskStreak });
      openToast(`연속 ${atRiskStreak}일 기록을 지켰어요!`);
    }, "streak_save");
  };

  // 공유에는 광고를 걸지 않아요 — 유일한 바이럴 동선이라.
  const onShareToday = () => {
    void (async () => {
      const ok = await shareApp(
        `오늘 운세 검증 끝! 🔥 연속 ${streak}일째 적중률 쌓는 중`,
      );
      if (ok) track(EVENT.shareCompleted, { context: "verify_done" });
    })();
  };

  if (!profile) return null;

  // 전면광고·완료 판정은 두 세그먼트를 합쳐서 봐요(세션당 1회여야 하니까).
  const viewedCats = CATEGORIES.filter((c) => isViewed(c.key));
  const allDone =
    viewedCats.length > 0 &&
    viewedCats.every((c) => verdictOf(c.key) !== null);
  const shown = viewedCats.filter((c) => c.kind === kind);
  const pendingOf = (k: CheckKind) =>
    viewedCats.filter((c) => c.kind === k && verdictOf(c.key) === null).length;

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
      const reached = streak + 1;
      if (reached === 7 || reached === 14 || reached === 30) {
        track(EVENT.streakMilestone, { days: reached });
      }
      const done = () => {
        navigate({ name: "stats" });
        // 검증을 막 끝낸 지금이 만족도 최고점 — 알림 동의를 한 번 더,
        // 연속 7일부터는 스토어 리뷰를(둘 다 평생 1회).
        if (reached >= 7) askReviewOnce();
        else void retryNotifyConsentOnce().then((r) => {
          if (r) track(EVENT.notifyConsent, { result: r, where: "verify_done" });
        });
      };
      // 첫 이틀은 전면광고를 띄우지 않아요 — 신규 이탈이 가장 큰 구간이라
      // 여기서 얻는 노출 1회보다 살아남은 유저의 평생 노출이 훨씬 커요.
      if (daysSinceInstall < 2) done();
      else maybeShow(done, "verify_done");
    }
  };

  return (
    <ScreenLayout
      title="오늘 운세, 맞았어요?"
      subtitle="확인한 운세를 O/X로 검증하면 적중률이 쌓여요"
    >
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

      {/* 운세와 사주는 검증하는 대상이 달라서 세그먼트로 나눠요.
          적중률·연속기록은 하나로 유지돼요(둘로 나누면 둘 다 약해져요). */}
      <div
        style={{
          display: "flex",
          gap: 4,
          marginTop: 12,
          padding: 4,
          borderRadius: 12,
          background: palette.bg,
        }}
      >
        {(["운세", "사주"] as const).map((k) => {
          const on = kind === k;
          const pending = pendingOf(k);
          return (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              style={{
                flex: 1,
                padding: "13px 0",
                borderRadius: 9,
                border: "none",
                cursor: "pointer",
                fontSize: 15,
                fontWeight: 700,
                background: on ? palette.white : "transparent",
                color: on ? palette.primary : palette.sub,
              }}
            >
              {k === "운세" ? "🔮 운세" : "🧭 사주"}
              {pending > 0 ? ` ${pending}` : ""}
            </button>
          );
        })}
      </div>

      {shown.length === 0 ? (
        <Card style={{ marginTop: 12, textAlign: "center" }}>
          <div style={{ fontSize: 40 }}>🌙</div>
          <Paragraph typography="t6" fontWeight="bold" color={palette.ink} style={{ marginTop: 8 }}>
            {kind === "운세"
              ? "아직 확인한 운세가 없어요"
              : "아직 오늘 일운을 안 열었어요"}
          </Paragraph>
          <Paragraph typography="t6" color={palette.sub} style={{ marginTop: 6, lineHeight: 1.5 }}>
            {kind === "운세"
              ? "오늘 운세를 먼저 확인하면 검증할 수 있어요. (확인한 운세만 검증돼요)"
              : "사주 탭에서 오늘 일운 풀이를 열면 맞았는지 검증할 수 있어요."}
          </Paragraph>
          <div style={{ marginTop: 14 }}>
            <Button
              display="full"
              onClick={() =>
                navigate({ name: kind === "운세" ? "home" : "saju" })
              }
            >
              {kind === "운세" ? "오늘 운세 확인하러 가기" : "오늘 일운 열러 가기"}
            </Button>
          </div>
        </Card>
      ) : (
        shown.map((meta) => {
          // 아침(또는 연 시점)에 고정해둔 문장 — 그 사이 배포가 있어도 같은 문장을 봐요
          const text =
            meta.kind === "사주" ? sajuLineOf() : (fortuneOf(meta.key)?.text ?? null);
          const v = verdictOf(meta.key);
          if (!text) return null;
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
                {text}
              </Paragraph>

              {v === null ? (
                <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                  <Button
                    display="full"
                    onClick={() => onVerdict(meta, true)}
                    style={{ background: palette.good }}
                  >
                    {meta.kind === "사주" ? "⭕ 비슷했어요" : "⭕ 맞았어요"}
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

      {/* 알림 설정은 O/X 아래로 — 검증하러 온 사람 앞을 막지 않아요.
          동의를 묻기도 검증을 끝낸 뒤가 나아요(만족도가 가장 높은 순간). */}
      <NotifySlotCard
        title="밤 검증 알림, 몇 시에 받을까요?"
        slots={NIGHT_SLOTS}
        agreedCode={agreedNight}
        onAgreed={setAgreedNight}
        where="verify"
      />

      {allDone && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
          <Button display="full" onClick={() => navigate({ name: "stats" })}>
            내 적중률 보러 가기 📊
          </Button>
          {/* 오늘 검증을 막 끝낸 지금이 자랑하고 싶은 순간이에요 */}
          <Button display="full" variant="weak" onClick={onShareToday}>
            📤 오늘 검증 결과 공유하기
          </Button>
        </div>
      )}
    </ScreenLayout>
  );
}
