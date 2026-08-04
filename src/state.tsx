import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { generateFortune, type Category, type Fortune } from "./data/fortune";
import { submitVerdict } from "./data/ranking";
import { computeSaju, type Gender, type Saju } from "./data/saju";
import { starSignOf, zodiacOf } from "./data/zodiac";
import { daysBetween, kstDate, prevDate } from "./lib/kst";

/**
 * 사주를 볼 사람 한 명.
 * people[0] 은 항상 본인이에요 — 검증·적중률·연속기록은 본인 것만 쌓여요.
 * (남의 하루가 어땠는지는 내가 O/X로 판정할 수 없으니까요.)
 */
export interface Person {
  id: string;
  birthDate: string; // YYYY-MM-DD
  birthTime?: string;
  /** 본인은 닉네임, 추가한 사람은 이름/별명 */
  name?: string;
  /** 대운 방향(양남음녀 순행)에 필요. 없으면 대운을 안 보여줘요. */
  gender?: Gender;
  zodiac: string;
  zodiacEmoji: string;
  starSign: string;
  starSignEmoji: string;
}

/** 이전 버전(단일 프로필) 저장 형식 — 마이그레이션에만 써요 */
interface LegacyProfile {
  birthDate: string;
  birthTime?: string;
  nickname?: string;
  zodiac: string;
  zodiacEmoji: string;
  starSign: string;
  starSignEmoji: string;
}

interface Persisted {
  people: Person[];
  /** 지금 보고 있는 사람. people 에 없으면 본인으로 되돌아가요. */
  activeId: string;
  viewed: Record<string, true>; // `${date}:${cat}` 아침 확인 (본인만)
  unlocked: Record<string, true>; // `${date}:${cat}` 상세 해금 (본인만)
  checks: Record<string, boolean>; // `${date}:${cat}` → O(true)/X(false)
  saves: Record<string, true>; // 광고로 메운(지킨) 날짜 — 스트릭 유지에만 사용
  /**
   * `${date}:${cat}` → 아침에 실제로 보여준 운세.
   * 운세는 결정적으로 생성되지만 문장 풀이 바뀌면 결과도 바뀌어요.
   * 검증 앱이라 아침에 본 문장이 밤에 달라지면 안 되므로 확인 시점에 고정해요.
   */
  pinned: Record<string, Fortune>;
  /**
   * 사주 풀이 해금 — `${personId}:reading` / `${personId}:daewoon`.
   * 사주는 평생 바뀌지 않으니 한 번 열면 계속 열어둬요. 매일 다시 광고를
   * 보게 하면 짜증만 나고, 사람을 추가할 때마다 새 기회가 생겨요.
   */
  sajuUnlocks: Record<string, true>;
  /** 첫 프로필 저장일(YYYY-MM-DD). 신규 유예(전면광고 등) 판단에 써요. */
  installedAt?: string;
  /** 이전 버전 데이터 — 읽고 나면 people 로 옮겨요 */
  profile?: LegacyProfile | null;
}

const STORAGE_KEY = "fc:state:v1";

const EMPTY: Persisted = {
  people: [],
  activeId: "",
  viewed: {},
  unlocked: {},
  checks: {},
  saves: {},
  pinned: {},
  sajuUnlocks: {},
};

/** 기기 안에서만 쓰는 id — 충돌만 안 하면 돼요 */
function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function makePerson(
  birthDate: string,
  birthTime?: string,
  name?: string,
  gender?: Gender,
  id = newId(),
): Person {
  const z = zodiacOf(birthDate);
  const s = starSignOf(birthDate);
  return {
    id,
    birthDate,
    birthTime: birthTime || undefined,
    name: name || undefined,
    gender,
    zodiac: z.name,
    zodiacEmoji: z.emoji,
    starSign: s.name,
    starSignEmoji: s.emoji,
  };
}

/** 단일 프로필로 저장된 기존 사용자를 people[] 로 옮겨요. */
function migrate(s: Persisted): Persisted {
  if (s.people?.length) return s;
  if (!s.profile) return { ...s, people: [], activeId: "" };
  const me = makePerson(
    s.profile.birthDate,
    s.profile.birthTime,
    s.profile.nickname,
    undefined,
  );
  return {
    ...s,
    people: [me],
    activeId: me.id,
    profile: null,
    // 기존 사용자는 신규가 아니에요. 비워두면 daysSinceInstall 이 0이 되어
    // 신규 유예(전면광고 2일 스킵)에 영구히 걸려버려요.
    installedAt: s.installedAt ?? "1970-01-01",
  };
}

function load(): Persisted {
  if (typeof localStorage === "undefined") return EMPTY;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return migrate({ ...EMPTY, ...(JSON.parse(raw) as Partial<Persisted>) });
    }
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

/** 사주 풀이에서 광고로 여는 두 덩어리 */
export type SajuPart = "reading" | "daewoon";

export interface CheckRow {
  date: string;
  category: Category;
  verdict: boolean;
}

interface StateContextValue {
  /** 지금 보고 있는 사람 (홈·사주풀이가 이걸 써요) */
  profile: Person | null;
  /** 본인 — 검증·적중률·연속기록의 주체 */
  me: Person | null;
  /** 저장된 사람 전체 (0번이 본인) */
  people: Person[];
  /** 지금 보고 있는 사람이 본인인지 */
  isViewingSelf: boolean;
  /** 지금 보고 있는 사람의 사주 원국 (사주풀이 탭 전용) */
  saju: Saju | null;
  /** 본인의 사주 원국 — 홈·검증·통계는 항상 이걸 써요 */
  meSaju: Saju | null;
  today: string;
  saveProfile: (
    birthDate: string,
    birthTime?: string,
    nickname?: string,
    gender?: Gender,
  ) => void;
  /** 사람 추가(보상형 광고 뒤에 호출). 추가한 사람으로 바로 전환해요. */
  addPerson: (
    birthDate: string,
    birthTime?: string,
    name?: string,
    gender?: Gender,
  ) => void;
  selectPerson: (id: string) => void;
  /** 본인은 지울 수 없어요 */
  removePerson: (id: string) => void;
  isViewed: (cat: Category) => boolean;
  markViewed: (cat: Category) => void;
  /** 보고 있는 사람의 운세. 본인이면 아침에 고정된 문장을 우선 반환. */
  fortuneOf: (cat: Category, date?: string) => Fortune | null;
  isUnlocked: (cat: Category) => boolean;
  unlockDetail: (cat: Category) => void;
  /** 지금 보고 있는 사람의 사주 풀이가 열려 있는지 (사람별 영구) */
  isSajuUnlocked: (part: SajuPart) => boolean;
  /** 광고 시청 후 호출 */
  unlockSaju: (part: SajuPart) => void;
  verdictOf: (cat: Category, date?: string) => boolean | null;
  submitCheck: (cat: Category, verdict: boolean) => void;
  /** 오늘 검증한 카테고리 수 */
  todayCheckedCount: number;
  /** 연속 검증 기록(스트릭) */
  streak: number;
  /** 전체 검증 기록(개인 통계) */
  allChecks: CheckRow[];
  /** 설치(첫 프로필 저장) 이후 경과 일수. 신규 유예 판단용. */
  daysSinceInstall: number;
  /** 어제 검증 성적 — 오늘 다시 올 이유를 홈에서 보여주려고. 없으면 null */
  yesterday: { hit: number; total: number } | null;
  /** 어제를 놓쳐 연속 기록이 끊길 위기인지(광고로 지킬 수 있는 상태) */
  canSaveStreak: boolean;
  /** 지금 지키면 보존되는 연속 일수 */
  atRiskStreak: number;
  /** 광고 시청 후 호출 — 어제를 메워 연속 기록을 이어가요 */
  saveStreak: () => void;
  resetAll: () => void;
}

const StateContext = createContext<StateContextValue | null>(null);

/** 같은 문장이 며칠 만에 돌아오지 않게 제외할 기간 */
const NO_REPEAT_DAYS = 14;

/** 그 카테고리에서 최근 NO_REPEAT_DAYS 일 동안 이미 보여준 문장들 */
function recentTexts(
  pinned: Record<string, Fortune>,
  cat: Category,
  today: string,
): string[] {
  const out: string[] = [];
  let d = today;
  for (let i = 0; i < NO_REPEAT_DAYS; i++) {
    d = prevDate(d);
    const f = pinned[`${d}:${cat}`];
    if (f) out.push(f.text);
  }
  return out;
}

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

  const me = state.people[0] ?? null;
  const active =
    state.people.find((p) => p.id === state.activeId) ?? me;
  const isViewingSelf = active != null && me != null && active.id === me.id;

  const saveProfile = useCallback(
    (
      birthDate: string,
      birthTime?: string,
      nickname?: string,
      gender?: Gender,
    ) => {
      setState((prev) => {
        // 본인 자리(0번)만 갈아끼워요. 추가한 사람들은 그대로 둬요.
        const existing = prev.people[0];
        const person = makePerson(
          birthDate,
          birthTime,
          nickname,
          gender,
          existing?.id,
        );
        const people = [person, ...prev.people.slice(1)];
        return {
          ...prev,
          installedAt: prev.installedAt ?? today,
          people,
          activeId: person.id,
        };
      });
    },
    [today],
  );

  const addPerson = useCallback(
    (birthDate: string, birthTime?: string, name?: string, gender?: Gender) => {
      setState((prev) => {
        const person = makePerson(birthDate, birthTime, name, gender);
        return {
          ...prev,
          people: [...prev.people, person],
          activeId: person.id, // 추가하면 바로 그 사람 사주를 보여줘요
        };
      });
    },
    [],
  );

  const selectPerson = useCallback((id: string) => {
    setState((prev) =>
      prev.people.some((p) => p.id === id) ? { ...prev, activeId: id } : prev,
    );
  }, []);

  const removePerson = useCallback((id: string) => {
    setState((prev) => {
      if (prev.people[0]?.id === id) return prev; // 본인은 못 지워요
      const people = prev.people.filter((p) => p.id !== id);
      return {
        ...prev,
        people,
        activeId: prev.activeId === id ? people[0].id : prev.activeId,
      };
    });
  }, []);

  // 확인하는 순간의 운세를 고정해요(밤 검증 때 같은 문장을 봐야 하니까).
  // 언제나 owner(본인) 것을 고정해요 — 홈은 activeId 와 무관하게 본인을 보여주니까요.
  // 예전엔 activeId 가 다른 사람이면 통째로 건너뛰었는데, 읽기 경로만 me 로
  // 옮기고 이 가드를 남겨두는 바람에 사람을 추가한 사용자는 pin 이 영영 안 되고
  // 밤마다 검증 화면이 비었어요(연속기록도 조용히 끊기고요).
  const markViewed = useCallback(
    (cat: Category) => {
      setState((prev) => {
        const owner = prev.people[0];
        if (!owner) return prev;
        const key = `${today}:${cat}`;
        if (prev.viewed[key] && prev.pinned[key]) return prev;
        const s = computeSaju(owner.birthDate, owner.birthTime);
        return {
          ...prev,
          viewed: { ...prev.viewed, [key]: true },
          pinned: {
            ...prev.pinned,
            [key]: generateFortune(
              today,
              s,
              cat,
              recentTexts(prev.pinned, cat, today),
            ),
          },
        };
      });
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
      const z = me?.zodiac;
      if (z) void submitVerdict(z, cat, verdict);
    },
    [today, me],
  );

  // 광고로 '어제'를 메워 연속 기록을 이어가요(끊길 위기일 때만 UI에 노출).
  const saveStreak = useCallback(() => {
    const yesterday = prevDate(today);
    setState((prev) => ({
      ...prev,
      saves: { ...prev.saves, [yesterday]: true },
    }));
  }, [today]);

  const unlockSaju = useCallback((part: SajuPart) => {
    setState((prev) => {
      const id = prev.activeId || prev.people[0]?.id;
      if (!id) return prev;
      return {
        ...prev,
        sajuUnlocks: { ...prev.sajuUnlocks, [`${id}:${part}`]: true },
      };
    });
  }, []);

  const resetAll = useCallback(() => {
    setState(EMPTY);
  }, []);

  // 보고 있는 사람의 원국
  const saju = useMemo(
    () => (active ? computeSaju(active.birthDate, active.birthTime) : null),
    [active],
  );
  // 본인의 원국 — 운세 생성은 항상 본인 기준이어야 하는 자리가 있어요
  const mySaju = useMemo(
    () => (me ? computeSaju(me.birthDate, me.birthTime) : null),
    [me],
  );

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

    const yRows = allChecks.filter((c) => c.date === yesterday);

    return {
      profile: active,
      me,
      people: state.people,
      isViewingSelf,
      saju,
      meSaju: mySaju,
      today,
      saveProfile,
      addPerson,
      selectPerson,
      removePerson,
      isViewed: (cat) => state.viewed[`${today}:${cat}`] === true,
      markViewed,
      // 일일 운세는 언제나 본인 것이에요. 사람 전환은 사주풀이 탭 안에서만
      // 의미가 있고, 홈·검증·통계까지 남의 것으로 바뀌면 검증 루프가 깨져요.
      // 폴백도 고정 때와 같은 제외 목록을 넘겨야 같은 문장이 나와요.
      // 안 넘기면 첫 페인트와 고정 문장이 어긋나요.
      fortuneOf: (cat, date = today) =>
        state.pinned[`${date}:${cat}`] ??
        (mySaju
          ? generateFortune(
              date,
              mySaju,
              cat,
              recentTexts(state.pinned, cat, date),
            )
          : null),
      isUnlocked: (cat) => state.unlocked[`${today}:${cat}`] === true,
      unlockDetail,
      isSajuUnlocked: (part) =>
        active != null && state.sajuUnlocks[`${active.id}:${part}`] === true,
      unlockSaju,
      verdictOf: (cat, date = today) => {
        const v = state.checks[`${date}:${cat}`];
        return v === undefined ? null : v;
      },
      submitCheck,
      todayCheckedCount,
      streak: computeStreak(state.checks, state.saves, today),
      allChecks,
      daysSinceInstall: state.installedAt
        ? daysBetween(state.installedAt, today)
        : 0,
      yesterday: yRows.length
        ? { hit: yRows.filter((c) => c.verdict).length, total: yRows.length }
        : null,
      canSaveStreak,
      atRiskStreak,
      saveStreak,
      resetAll,
    };
  }, [
    state,
    active,
    me,
    isViewingSelf,
    saju,
    mySaju,
    today,
    saveProfile,
    addPerson,
    selectPerson,
    removePerson,
    markViewed,
    unlockDetail,
    unlockSaju,
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
