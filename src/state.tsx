import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { Category } from "./data/fortune";
import { submitVerdict } from "./data/ranking";
import { starSignOf, zodiacOf } from "./data/zodiac";
import { kstDate, prevDate } from "./lib/kst";

export interface Profile {
  birthDate: string; // YYYY-MM-DD
  birthTime?: string; // 선택 입력
  nickname?: string;
  zodiac: string;
  zodiacEmoji: string;
  starSign: string;
  starSignEmoji: string;
}

interface Persisted {
  profile: Profile | null;
  viewed: Record<string, true>; // `${date}:${cat}` 아침 확인
  unlocked: Record<string, true>; // `${date}:${cat}` 상세 해금
  checks: Record<string, boolean>; // `${date}:${cat}` → O(true)/X(false)
  saves: Record<string, true>; // 광고로 메운(지킨) 날짜 — 스트릭 유지에만 사용
}

const STORAGE_KEY = "fc:state:v1";

const EMPTY: Persisted = {
  profile: null,
  viewed: {},
  unlocked: {},
  checks: {},
  saves: {},
};

function load(): Persisted {
  if (typeof localStorage === "undefined") return EMPTY;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...EMPTY, ...(JSON.parse(raw) as Partial<Persisted>) };
  } catch {
    /* noop */
  }
  return EMPTY;
}

function save(s: Persisted): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* noop */
  }
}

export interface CheckRow {
  date: string;
  category: Category;
  verdict: boolean;
}

interface StateContextValue {
  profile: Profile | null;
  today: string;
  saveProfile: (birthDate: string, birthTime?: string, nickname?: string) => void;
  isViewed: (cat: Category) => boolean;
  markViewed: (cat: Category) => void;
  isUnlocked: (cat: Category) => boolean;
  unlockDetail: (cat: Category) => void;
  verdictOf: (cat: Category, date?: string) => boolean | null;
  submitCheck: (cat: Category, verdict: boolean) => void;
  /** 오늘 검증한 카테고리 수 */
  todayCheckedCount: number;
  /** 연속 검증 기록(스트릭) */
  streak: number;
  /** 전체 검증 기록(개인 통계) */
  allChecks: CheckRow[];
  /** 어제를 놓쳐 연속 기록이 끊길 위기인지(광고로 지킬 수 있는 상태) */
  canSaveStreak: boolean;
  /** 지금 지키면 보존되는 연속 일수 */
  atRiskStreak: number;
  /** 광고 시청 후 호출 — 어제를 메워 연속 기록을 이어가요 */
  saveStreak: () => void;
  resetAll: () => void;
}

const StateContext = createContext<StateContextValue | null>(null);

/** 검증이 있는 날 + 광고로 지킨 날을 '출석'으로 보는 판정기 */
function presence(
  checks: Record<string, boolean>,
  saves: Record<string, true>,
): (d: string) => boolean {
  const days = new Set<string>();
  for (const key of Object.keys(checks)) days.add(key.split(":")[0]);
  return (d: string) => days.has(d) || saves[d] === true;
}

// 끝 날짜(endDay)에서 연속으로 거슬러 올라가며 카운트
function streakEndingAt(present: (d: string) => boolean, endDay: string): number {
  if (!present(endDay)) return 0;
  let cursor = endDay;
  let streak = 0;
  while (present(cursor)) {
    streak += 1;
    cursor = prevDate(cursor);
  }
  return streak;
}

function computeStreak(
  checks: Record<string, boolean>,
  saves: Record<string, true>,
  today: string,
): number {
  const present = presence(checks, saves);
  // 오늘 또는 어제를 기준 끝으로 잡고 연속 카운트
  const end = present(today) ? today : prevDate(today);
  return streakEndingAt(present, end);
}

export function StateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Persisted>(load);
  const today = kstDate();

  useEffect(() => {
    save(state);
  }, [state]);

  const saveProfile = useCallback(
    (birthDate: string, birthTime?: string, nickname?: string) => {
      const z = zodiacOf(birthDate);
      const s = starSignOf(birthDate);
      setState((prev) => ({
        ...prev,
        profile: {
          birthDate,
          birthTime: birthTime || undefined,
          nickname: nickname || undefined,
          zodiac: z.name,
          zodiacEmoji: z.emoji,
          starSign: s.name,
          starSignEmoji: s.emoji,
        },
      }));
    },
    [],
  );

  const markViewed = useCallback(
    (cat: Category) => {
      setState((prev) => ({
        ...prev,
        viewed: { ...prev.viewed, [`${today}:${cat}`]: true },
      }));
    },
    [today],
  );

  const unlockDetail = useCallback(
    (cat: Category) => {
      setState((prev) => ({
        ...prev,
        unlocked: { ...prev.unlocked, [`${today}:${cat}`]: true },
      }));
    },
    [today],
  );

  const submitCheck = useCallback(
    (cat: Category, verdict: boolean) => {
      setState((prev) => ({
        ...prev,
        checks: { ...prev.checks, [`${today}:${cat}`]: verdict },
      }));
      const z = state.profile?.zodiac;
      if (z) void submitVerdict(z, cat, verdict);
    },
    [today, state.profile],
  );

  // 광고로 '어제'를 메워 연속 기록을 이어가요(끊길 위기일 때만 UI에 노출).
  const saveStreak = useCallback(() => {
    const yesterday = prevDate(today);
    setState((prev) => ({
      ...prev,
      saves: { ...prev.saves, [yesterday]: true },
    }));
  }, [today]);

  const resetAll = useCallback(() => {
    setState(EMPTY);
  }, []);

  const value = useMemo<StateContextValue>(() => {
    const allChecks: CheckRow[] = Object.entries(state.checks).map(
      ([key, verdict]) => {
        const [date, category] = key.split(":");
        return { date, category: category as Category, verdict };
      },
    );
    const todayCheckedCount = allChecks.filter((c) => c.date === today).length;

    // 연속 기록 위기 판정: 어제는 비었고(놓침) 그제는 출석 → 어제만 메우면 기록 유지
    const present = presence(state.checks, state.saves);
    const yesterday = prevDate(today);
    const dayBefore = prevDate(yesterday);
    const canSaveStreak = !present(yesterday) && present(dayBefore);
    const atRiskStreak = canSaveStreak
      ? streakEndingAt(present, dayBefore)
      : 0;

    return {
      profile: state.profile,
      today,
      saveProfile,
      isViewed: (cat) => state.viewed[`${today}:${cat}`] === true,
      markViewed,
      isUnlocked: (cat) => state.unlocked[`${today}:${cat}`] === true,
      unlockDetail,
      verdictOf: (cat, date = today) => {
        const v = state.checks[`${date}:${cat}`];
        return v === undefined ? null : v;
      },
      submitCheck,
      todayCheckedCount,
      streak: computeStreak(state.checks, state.saves, today),
      allChecks,
      canSaveStreak,
      atRiskStreak,
      saveStreak,
      resetAll,
    };
  }, [
    state,
    today,
    saveProfile,
    markViewed,
    unlockDetail,
    submitCheck,
    saveStreak,
    resetAll,
  ]);

  return (
    <StateContext.Provider value={value}>{children}</StateContext.Provider>
  );
}

export function useAppState(): StateContextValue {
  const ctx = useContext(StateContext);
  if (ctx == null)
    throw new Error("useAppState must be used within StateProvider");
  return ctx;
}
