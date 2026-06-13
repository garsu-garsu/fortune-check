import { useEffect, useMemo, useState } from "react";

import { Button, Paragraph } from "@toss/tds-mobile";

import { BannerAd } from "../../components/BannerAd";
import { Card, ScreenLayout } from "../../components/ScreenLayout";
import { CATEGORIES, type Category } from "../../data/fortune";
import {
  fetchZodiacRanking,
  type ZodiacRank,
} from "../../data/ranking";
import { shareApp } from "../../data/share";
import { EVENT, track } from "../../lib/analytics";
import { kstMonth } from "../../lib/kst";
import { useAdGate } from "../../hooks/useAdGate";
import { useAppState } from "../../state";
import { palette } from "../../theme";

interface CatStat {
  label: string;
  emoji: string;
  total: number;
  hit: number;
}

function rate(hit: number, total: number): number {
  return total === 0 ? 0 : Math.round((hit / total) * 100);
}

export function StatsScreen() {
  const { profile, allChecks, streak } = useAppState();
  const { watchThen } = useAdGate();
  const [ranking, setRanking] = useState<ZodiacRank[]>([]);
  const [live, setLive] = useState(false);

  useEffect(() => {
    void (async () => {
      const r = await fetchZodiacRanking();
      setRanking(r.ranks);
      setLive(r.live);
    })();
  }, []);

  const month = kstMonth();
  const monthChecks = useMemo(
    () => allChecks.filter((c) => c.date.startsWith(month)),
    [allChecks, month],
  );

  const totalHit = monthChecks.filter((c) => c.verdict).length;
  const totalRate = rate(totalHit, monthChecks.length);

  const catStats: CatStat[] = useMemo(() => {
    return CATEGORIES.map((meta) => {
      const rows = monthChecks.filter((c) => c.category === (meta.key as Category));
      return {
        label: meta.label,
        emoji: meta.emoji,
        total: rows.length,
        hit: rows.filter((c) => c.verdict).length,
      };
    });
  }, [monthChecks]);

  const myZodiacRank =
    profile != null
      ? ranking.findIndex((r) => r.zodiac === profile.zodiac) + 1
      : 0;

  // 공유는 보상형 광고를 본 뒤 실행(공유 여부와 무관하게 광고 수익 확보)
  const shareMonthly = () => {
    watchThen(() => {
      void (async () => {
        const ok = await shareApp(
          `${month.replace("-", "년 ")}월 내 운세 적중률 ${totalRate}% (${monthChecks.length}회 검증)`,
        );
        if (ok) track(EVENT.shareCompleted, { context: "monthly_card" });
      })();
    }, "share_monthly");
  };

  return (
    <ScreenLayout
      title="내 적중률 통계"
      subtitle={`${month.replace("-", ".")} 기준`}
    >
      {/* 화면당 배너 1개 — 최상단 이미지 강조 */}
      <BannerAd slot="stats_top" />

      {/* 이번 달 적중률 (강조) */}
      <Card
        style={{
          marginTop: 8,
          textAlign: "center",
          background: `linear-gradient(135deg, ${palette.primary}, ${palette.primaryDeep})`,
        }}
      >
        <Paragraph typography="t7" color={palette.white} style={{ opacity: 0.85 }}>
          이번 달 운세 적중률
        </Paragraph>
        <Paragraph
          fontWeight="bold"
          color={palette.gold}
          style={{ fontSize: 52, lineHeight: 1.1, margin: "6px 0" }}
        >
          {totalRate}%
        </Paragraph>
        <Paragraph typography="t7" color={palette.white} style={{ opacity: 0.85 }}>
          {monthChecks.length}회 검증 · 🔥 연속 {streak}일
        </Paragraph>
      </Card>

      {/* 카테고리별 */}
      <Card style={{ marginTop: 12 }}>
        <Paragraph typography="t6" fontWeight="bold" color={palette.ink} style={{ marginBottom: 6 }}>
          카테고리별 적중률
        </Paragraph>
        {catStats.map((s) => (
          <div
            key={s.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 0",
              borderBottom: `1px solid ${palette.line}`,
            }}
          >
            <span style={{ fontSize: 18 }}>{s.emoji}</span>
            <Paragraph typography="t6" color={palette.ink} style={{ width: 64 }}>
              {s.label}
            </Paragraph>
            <div style={{ flex: 1, height: 8, borderRadius: 8, background: palette.bg, overflow: "hidden" }}>
              <div
                style={{
                  width: `${rate(s.hit, s.total)}%`,
                  height: "100%",
                  background: palette.primary,
                }}
              />
            </div>
            <Paragraph typography="t7" fontWeight="bold" color={palette.sub} style={{ width: 64, textAlign: "right" }}>
              {s.total === 0 ? "-" : `${rate(s.hit, s.total)}% (${s.total})`}
            </Paragraph>
          </div>
        ))}
        {monthChecks.length === 0 && (
          <Paragraph typography="t7" color={palette.sub} style={{ marginTop: 10, lineHeight: 1.5 }}>
            아직 검증 기록이 없어요. 오늘 운세를 확인하고 밤에 검증해 보세요.
          </Paragraph>
        )}
      </Card>

      {/* 전국 띠별 랭킹 */}
      <Card style={{ marginTop: 12 }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <Paragraph typography="t6" fontWeight="bold" color={palette.ink}>
            오늘 가장 잘 맞은 띠 🏆
          </Paragraph>
          <span style={{ flex: 1 }} />
          <Paragraph typography="t7" color={palette.sub}>
            {live ? "전국 집계" : "데모 집계"}
          </Paragraph>
        </div>
        {profile && myZodiacRank > 0 && (
          <Paragraph typography="t7" color={palette.primary} fontWeight="bold" style={{ marginTop: 4 }}>
            내 {profile.zodiac}는 오늘 전국 {myZodiacRank}위
          </Paragraph>
        )}
        <div style={{ marginTop: 10 }}>
          {ranking.slice(0, 6).map((r, i) => (
            <div
              key={r.zodiac}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 0",
              }}
            >
              <Paragraph
                typography="t6"
                fontWeight="bold"
                color={i === 0 ? palette.gold : palette.sub}
                style={{ width: 24 }}
              >
                {i + 1}
              </Paragraph>
              <span style={{ fontSize: 18 }}>{r.emoji}</span>
              <Paragraph
                typography="t6"
                color={r.zodiac === profile?.zodiac ? palette.primary : palette.ink}
                fontWeight={r.zodiac === profile?.zodiac ? "bold" : "medium"}
                style={{ flex: 1 }}
              >
                {r.zodiac}
              </Paragraph>
              <Paragraph typography="t6" fontWeight="bold" color={palette.ink}>
                {r.hitRate}%
              </Paragraph>
            </div>
          ))}
        </div>
      </Card>

      <div style={{ marginTop: 16 }}>
        <Button display="full" variant="weak" onClick={shareMonthly}>
          📺 광고 보고 월간 카드 공유
        </Button>
      </div>
    </ScreenLayout>
  );
}
