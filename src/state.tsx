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
}

const STORAGE_KEY = "fc:state:v1";

function load(): Persisted {
  if (typeof localStorage === "undefined")
    return { profile: null, viewed: {}, unlocked: {}, checks: {} };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Persisted;
  } catch {
    /* noop */
  }
  return { profile: null, viewed: {}, unlocked: {}, checks: {} };
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
  resetAll: () => void;
}

const StateContext = createContext<StateContextValue | null>(null);

function computeStreak(checks: Record<string, boolean>, today: string): number {
  // 검증이 1건 이상 있는 날짜 집합
  const days = new Set<string>();
  for (const key of Object.keys(checks)) days.add(key.split(":")[0]);
  // 오늘 또는 어제부터 연속으로 거슬러 올라가며 카운트
  let cursor = days.has(today) ? today : prevDate(today);
  if (!days.has(cursor)) return 0;
  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor = prevDate(cursor);
  }
  return streak;
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

  const resetAll = useCallback(() => {
    setState({ profile: null, viewed: {}, unlocked: {}, checks: {} });
  }, []);

  const value = useMemo<StateContextValue>(() => {
    const allChecks: CheckRow[] = Object.entries(state.checks).map(
      ([key, verdict]) => {
        const [date, category] = key.split(":");
        return { date, category: category as Category, verdict };
      },
    );
    const todayCheckedCount = allChecks.filter((c) => c.date === today).length;
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
      streak: computeStreak(state.checks, today),
      allChecks,
      resetAll,
    };
  }, [state, today, saveProfile, markViewed, unlockDetail, submitCheck, resetAll]);

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
