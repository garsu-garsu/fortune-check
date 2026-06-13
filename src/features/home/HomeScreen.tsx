import { useEffect } from "react";

import { Button, Paragraph, useToast } from "@toss/tds-mobile";

import { Card, ScreenLayout } from "../../components/ScreenLayout";
import {
  CATEGORIES,
  generateFortune,
  type Category,
  type CategoryMeta,
} from "../../data/fortune";
import { shareApp } from "../../data/share";
import { EVENT, track } from "../../lib/analytics";
import { kstDate } from "../../lib/kst";
import { useAdGate } from "../../hooks/useAdGate";
import { useRouter } from "../../router";
import { useAppState } from "../../state";
import { palette } from "../../theme";

function ScoreBar({ score }: { score: number }) {
  return (
    <div style={{ marginTop: 10 }}>
      <div
        style={{
          height: 8,
          borderRadius: 8,
          background: palette.bg,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${score}%`,
            height: "100%",
            background: `linear-gradient(90deg, ${palette.primary}, ${palette.gold})`,
          }}
        />
      </div>
    </div>
  );
}

export function HomeScreen() {
  const { profile, today, markViewed, isUnlocked, unlockDetail } = useAppState();
  const { navigate } = useRouter();
  const { watchThen } = useAdGate();
  const { openToast } = useToast();

  // 종합운은 무료 → 진입 시 '확인함' 처리(밤 검증 자격)
  useEffect(() => {
    if (profile) {
      markViewed("overall");
      track(EVENT.fortuneViewed, { category: "overall" });
    }
  }, [profile, markViewed]);

  if (!profile) return null;

  const dateLabel = kstDate().replaceAll("-", ".");

  const unlock = (cat: Category, via: "ad" | "share") => {
    unlockDetail(cat);
    markViewed(cat);
    track(EVENT.detailUnlocked, { category: cat, via });
    track(EVENT.fortuneViewed, { category: cat });
  };

  const onAdUnlock = (cat: Category) => {
    watchThen(() => {
      unlock(cat, "ad");
      openToast("상세 운세를 해금했어요!");
    }, `detail_${cat}`);
  };

  const onShareUnlock = async (cat: Category) => {
    const ok = await shareApp("오늘 내 운세 적중률 도전 중!");
    if (ok) {
      track(EVENT.shareCompleted, { context: `unlock_${cat}` });
      unlock(cat, "share");
      openToast("공유 완료! 상세 운세를 해금했어요.");
    }
  };

  const renderDetail = (meta: CategoryMeta) => {
    const f = generateFortune(today, profile.zodiac, profile.starSign, meta.key);
    const opened = !meta.detail || isUnlocked(meta.key);
    return (
      <Card key={meta.key} style={{ marginTop: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20 }}>{meta.emoji}</span>
          <Paragraph typography="t5" fontWeight="bold" color={palette.ink}>
            {meta.label}
          </Paragraph>
          <span style={{ flex: 1 }} />
          <Paragraph typography="t6" fontWeight="bold" color={palette.primary}>
            {opened ? `${f.score}점` : "🔒"}
          </Paragraph>
        </div>

        {opened ? (
          <>
            <Paragraph
              typography="t6"
              color={palette.ink}
              style={{ marginTop: 10, lineHeight: 1.6 }}
            >
              {f.text}
            </Paragraph>
            <ScoreBar score={f.score} />
          </>
        ) : (
          <>
            <Paragraph
              typography="t7"
              color={palette.sub}
              style={{ marginTop: 8, lineHeight: 1.5 }}
            >
              광고를 보거나 공유하면 오늘의 {meta.label} 상세를 볼 수 있어요.
            </Paragraph>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <Button display="full" size="medium" onClick={() => onAdUnlock(meta.key)}>
                📺 광고 보고 해금
              </Button>
              <Button
                display="full"
                size="medium"
                variant="weak"
                onClick={() => onShareUnlock(meta.key)}
              >
                공유하고 해금
              </Button>
            </div>
          </>
        )}
      </Card>
    );
  };

  const overall = generateFortune(today, profile.zodiac, profile.starSign, "overall");

  return (
    <ScreenLayout
      title={`${profile.nickname ? profile.nickname + "님의 " : ""}오늘의 운세`}
      subtitle={`${dateLabel} · ${profile.zodiacEmoji} ${profile.zodiac} · ${profile.starSignEmoji} ${profile.starSign}`}
    >
      {/* 종합운 (무료, 강조 카드) */}
      <Card
        style={{
          marginTop: 4,
          background: `linear-gradient(135deg, ${palette.primary}, ${palette.primaryDeep})`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 22 }}>🔮</span>
          <Paragraph typography="t5" fontWeight="bold" color={palette.white}>
            종합운
          </Paragraph>
          <span style={{ flex: 1 }} />
          <Paragraph typography="t4" fontWeight="bold" color={palette.gold}>
            {overall.score}점
          </Paragraph>
        </div>
        <Paragraph
          typography="t5"
          color={palette.white}
          style={{ marginTop: 12, lineHeight: 1.65 }}
        >
          {overall.text}
        </Paragraph>
        <div
          style={{
            marginTop: 14,
            display: "flex",
            gap: 8,
          }}
        >
          <Chip label={`행운의 색 ${overall.luckyColor}`} />
          <Chip label={`행운의 숫자 ${overall.luckyNumber}`} />
        </div>
      </Card>

      {/* 상세운 3종 (보상형 광고 게이트) */}
      {CATEGORIES.filter((c) => c.detail).map(renderDetail)}

      {/* 공유 + 밤 검증 안내 */}
      <Card style={{ marginTop: 16, textAlign: "center" }}>
        <Paragraph typography="t6" fontWeight="bold" color={palette.ink}>
          밤이 되면 검증해요 ✅
        </Paragraph>
        <Paragraph typography="t7" color={palette.sub} style={{ marginTop: 6, lineHeight: 1.5 }}>
          오늘 확인한 운세가 실제로 맞았는지 O/X로 체크하면 적중률이 쌓여요.
        </Paragraph>
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <Button
            display="full"
            variant="weak"
            onClick={async () => {
              const ok = await shareApp(
                `오늘의 종합운 ${overall.score}점! 내 운세 적중률 쌓는 중`,
              );
              if (ok) track(EVENT.shareCompleted, { context: "today_card" });
            }}
          >
            오늘 운세 공유
          </Button>
          <Button display="full" onClick={() => navigate({ name: "verify" })}>
            검증하러 가기
          </Button>
        </div>
      </Card>
    </ScreenLayout>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span
      style={{
        fontSize: 12,
        fontWeight: 600,
        color: palette.white,
        background: "rgba(255,255,255,0.18)",
        borderRadius: 999,
        padding: "5px 11px",
      }}
    >
      {label}
    </span>
  );
}
