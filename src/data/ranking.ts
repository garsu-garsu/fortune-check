import { kstDate } from "../lib/kst";
import { ensureAnonAuth, supabase } from "../lib/supabase";
import type { Category } from "./fortune";
import { ALL_ZODIACS } from "./zodiac";

// 서버에는 개인정보 없이 {익명id, 날짜, 띠, 카테고리, O/X} 집계값만 저장해요.

/** 이 정도는 모여야 그 띠의 적중률을 말할 수 있어요 */
const MIN_SAMPLES = 10;
/** 이만큼의 띠가 남아야 "순위"라고 부를 수 있어요 */
const MIN_ZODIACS = 5;

export interface ZodiacRank {
  zodiac: string;
  emoji: string;
  hitRate: number; // 0~100
  samples: number;
}

/** 검증 결과를 전국 집계에 제출(있을 때만, 실패 무시). */
export async function submitVerdict(
  zodiac: string,
  category: Category,
  verdict: boolean,
): Promise<void> {
  if (supabase == null) return;
  try {
    await ensureAnonAuth();
    const { data } = await supabase.auth.getUser();
    const uid = data.user?.id;
    if (uid == null) return;
    await supabase.from("fortune_checks").upsert(
      {
        anon_id: uid,
        kst_date: kstDate(),
        zodiac,
        category,
        verdict,
      },
      { onConflict: "anon_id,kst_date,category" },
    );
  } catch (e) {
    console.error("랭킹 제출 실패:", e);
  }
}

/** 오늘 띠별 적중률 랭킹. Supabase 없으면 결정적 placeholder(데모용). */
export async function fetchZodiacRanking(): Promise<{
  ranks: ZodiacRank[];
  live: boolean;
}> {
  const date = kstDate();
  if (supabase != null) {
    try {
      await ensureAnonAuth();
      const { data, error } = await supabase.rpc("zodiac_ranking", {
        p_date: date,
      });
      if (!error && Array.isArray(data) && data.length > 0) {
        const ranks: ZodiacRank[] = data
          .map((row: { zodiac: string; hit_rate: number; samples: number }) => ({
            zodiac: row.zodiac,
            emoji: ALL_ZODIACS.find((z) => z.name === row.zodiac)?.emoji ?? "🔮",
            hitRate: Math.round(row.hit_rate),
            samples: row.samples,
          }))
          // 표본 두세 건으로 나온 100%를 "전국 집계"라고 보여주면 안 돼요.
          .filter((r) => r.samples >= MIN_SAMPLES);
        // 띠가 몇 개 안 남으면 순위 자체가 의미 없어요.
        if (ranks.length >= MIN_ZODIACS) return { ranks, live: true };
      }
    } catch (e) {
      console.error("랭킹 조회 실패:", e);
    }
  }
  // 집계가 없으면 빈 결과를 돌려줘요.
  // 예전엔 그럴듯한 숫자를 지어내 보여줬는데, 사용자에게는 그게 진짜 전국
  // 통계로 읽여요("내 띠는 오늘 전국 3위"). 없는 데이터는 없다고 말해야 해요.
  return { ranks: [], live: false };
}
