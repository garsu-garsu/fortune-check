// 모든 날짜 경계는 한국시간(Asia/Seoul) 기준이에요.
// (전국 랭킹 집계는 서버에서 다시 KST로 계산 — recipes-supabase.md)

function kstParts(d: Date): { y: number; m: number; day: number } {
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const kst = new Date(utc + 9 * 3600000);
  return { y: kst.getFullYear(), m: kst.getMonth() + 1, day: kst.getDate() };
}

/** KST 기준 오늘 날짜 (YYYY-MM-DD) */
export function kstDate(d = new Date()): string {
  const { y, m, day } = kstParts(d);
  return `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** KST 기준 이번 달 (YYYY-MM) */
export function kstMonth(d = new Date()): string {
  return kstDate(d).slice(0, 7);
}

/** YYYY-MM-DD 하루 전 */
export function prevDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - 1);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}
