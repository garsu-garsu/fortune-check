import { createClient } from "@supabase/supabase-js";

import { HAS_SUPABASE, SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

// 키가 없으면 null → 전국 랭킹은 로컬 placeholder 로 동작(그레이스풀 디그레이데이션).
export const supabase = HAS_SUPABASE
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

let ensured: Promise<void> | null = null;

/** 익명 로그인 보장(개인정보 0). 랭킹 집계용 익명 식별자만 만들어요. */
export function ensureAnonAuth(): Promise<void> {
  if (supabase == null) return Promise.resolve();
  if (ensured == null) {
    ensured = (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session == null) await supabase.auth.signInAnonymously();
      } catch (e) {
        console.error("익명 로그인 실패:", e);
      }
    })();
  }
  return ensured;
}
