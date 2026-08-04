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
import { kstDate, kstMonth } from "../../lib/kst";
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

/** 카테고리별 최소 표본 — 이보다 적으면 우연을 결론으로 말하게 돼요 */
const MIN_FOR_INSIGHT = 5;

export function StatsScreen() {
  const { me: profile, allChecks, streak } = useAppState();
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

  // 카테고리마다 최소 이만큼은 쌓여야 "잘 맞는다"고 말할 수 있어요.
  // 표본이 적으면 우연을 결론으로 말하게 돼요.
  const insight = useMemo(() => {
    const rows = CATEGORIES.map((meta) => {
      const r = allChecks.filter((c) => c.category === (meta.key as Category));
      return {
        label: meta.label,
        total: r.length,
        hit: r.filter((c) => c.verdict).length,
      };
    }).filter((r) => r.total >= MIN_FOR_INSIGHT);
    if (rows.length < 2) return null;
    const sorted = [...rows].sort(
      (a, b) => rate(b.hit, b.total) - rate(a.hit, a.total),
    );
    return {
      best: sorted[0],
      worst: sorted[sorted.length - 1],
      total: allChecks.length,
    };
  }, [allChecks]);

  // 이번 달 달력 — 앞쪽 빈칸은 요일 맞추기용
  const calendar = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    const firstWeekday = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const todayStr = kstDate();
    const cells: ({
      date: string;
      day: number;
      hit: number;
      total: number;
      today: boolean;
      future: boolean;
    } | null)[] = Array.from({ length: firstWeekday }, () => null);
    for (let d = 1; d <= lastDay; d++) {
      const date = `${month}-${String(d).padStart(2, "0")}`;
      const rows = allChecks.filter((c) => c.date === date);
      cells.push({
        date,
        day: d,
        hit: rows.filter((c) => c.verdict).length,
        total: rows.length,
        today: date === todayStr,
        future: date > todayStr,
      });
    }
    return cells;
  }, [allChecks, month]);

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
          typography="t1"
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

      {/* 개인화 인사이트 — 검증이 쌓여야 나오는 결론.
          숫자만 올라가고 끝나면 매일 검증할 이유가 없어요. */}
      <Card style={{ marginTop: 12 }}>
        <Paragraph typography="t6" fontWeight="bold" color={palette.ink}>
          나에게 잘 맞는 운세 🎯
        </Paragraph>
        {insight ? (
          <>
            <Paragraph
              typography="t6"
              color={palette.ink}
              style={{ marginTop: 8, lineHeight: 1.6 }}
            >
              지금까지 {insight.total}번 검증한 결과, <b>{insight.best.label}</b>이(가){" "}
              <b>{rate(insight.best.hit, insight.best.total)}%</b>로 가장 잘 맞았어요.
              {insight.worst && insight.worst.label !== insight.best.label && (
                <>
                  {" "}반대로 {insight.worst.label}은(는){" "}
                  {rate(insight.worst.hit, insight.worst.total)}%로 잘 안 맞는 편이에요.
                </>
              )}
            </Paragraph>
            <Paragraph typography="t7" color={palette.sub} style={{ marginTop: 8, lineHeight: 1.5 }}>
              검증이 쌓일수록 더 또렷해져요.
            </Paragraph>
          </>
        ) : (
          <Paragraph typography="t7" color={palette.sub} style={{ marginTop: 8, lineHeight: 1.5 }}>
            카테고리마다 {MIN_FOR_INSIGHT}번씩 검증하면 나에게 어떤 운이 잘 맞는지
            알려드려요. (지금 {allChecks.length}번)
          </Paragraph>
        )}
      </Card>

      {/* 이번 달 검증 달력 — 빈칸이 보이면 채우고 싶어져요 */}
      <Card style={{ marginTop: 12 }}>
        <Paragraph typography="t6" fontWeight="bold" color={palette.ink}>
          이번 달 검증 기록
        </Paragraph>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: 5,
            marginTop: 12,
          }}
        >
          {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
            <div key={d} style={{ textAlign: "center" }}>
              <Paragraph typography="t7" color={palette.sub}>
                {d}
              </Paragraph>
            </div>
          ))}
          {calendar.map((cell, i) =>
            cell === null ? (
              <div key={`pad-${i}`} />
            ) : (
              <div
                key={cell.date}
                title={cell.date}
                style={{
                  aspectRatio: "1",
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 600,
                  background: cell.future
                    ? "transparent"
                    : cell.total === 0
                      ? palette.bg
                      : `rgba(108, 92, 231, ${0.25 + 0.75 * (cell.hit / cell.total)})`,
                  color:
                    cell.total > 0 && cell.hit / cell.total > 0.4
                      ? palette.white
                      : palette.sub,
                  border: cell.today ? `2px solid ${palette.gold}` : "none",
                  boxSizing: "border-box",
                }}
              >
                {cell.day}
              </div>
            ),
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
          <Paragraph typography="t7" color={palette.sub}>
            안 함
          </Paragraph>
          {[0, 0.34, 0.67, 1].map((v) => (
            <div
              key={v}
              style={{
                width: 16,
                height: 16,
                borderRadius: 4,
                background: v === 0 ? palette.bg : `rgba(108, 92, 231, ${0.25 + 0.75 * v})`,
              }}
            />
          ))}
          <Paragraph typography="t7" color={palette.sub}>
            다 맞음
          </Paragraph>
        </div>
      </Card>

      {/* 전국 띠별 랭킹 */}
      <Card style={{ marginTop: 12 }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <Paragraph typography="t6" fontWeight="bold" color={palette.ink}>
            오늘 가장 잘 맞은 띠 🏆
          </Paragraph>
          <span style={{ flex: 1 }} />
          {live && (
            <Paragraph typography="t7" color={palette.sub}>
              전국 집계
            </Paragraph>
          )}
        </div>
        {!live && (
          <Paragraph typography="t7" color={palette.sub} style={{ marginTop: 8, lineHeight: 1.5 }}>
            아직 오늘 집계가 모이지 않았어요. 저녁에 다시 확인해 주세요.
          </Paragraph>
        )}
        {live && profile && myZodiacRank > 0 && (
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
