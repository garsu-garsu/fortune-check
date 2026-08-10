// 생년월일을 숫자 8자리로 받아요.
// 달력(<input type="date">)은 1970년대생이 오늘에서 50번 넘게 뒤로 굴려야 해서
// "생년월일 넣기가 힘들다"는 리뷰가 나왔어요. 주민번호 앞자리처럼 그냥 찍는 게 빨라요.

const MIN_YEAR = 1930;

/** 입력 중인 숫자를 1970.03.15 꼴로 — 자리수만큼만 점을 찍어요. */
export function formatBirthDigits(digits: string): string {
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}.${digits.slice(4)}`;
  return `${digits.slice(0, 4)}.${digits.slice(4, 6)}.${digits.slice(6)}`;
}

/**
 * 숫자 8자리(YYYYMMDD) → "YYYY-MM-DD".
 * iso 는 완성된 날짜일 때만 채워지고, error 는 사용자에게 바로 보여줄 문장이에요.
 * (아직 덜 친 상태는 둘 다 비어 있어요 — 치는 중에 빨간 글씨를 띄우지 않으려고요)
 */
export function parseBirthDigits(
  digits: string,
  maxISO: string,
): { iso: string; error: string | null } {
  const none = { iso: "", error: null };

  // 연도는 4자리만 채워도 바로 짚어줘요 — 8자리 다 치고 나서 틀렸다고 하면 화가 나요.
  if (digits.length >= 4) {
    const y = Number(digits.slice(0, 4));
    const maxYear = Number(maxISO.slice(0, 4));
    if (y < MIN_YEAR || y > maxYear)
      return { iso: "", error: `${MIN_YEAR}년 ~ ${maxYear}년 사이로 넣어주세요.` };
  }
  if (digits.length < 8) return none;

  const y = Number(digits.slice(0, 4));
  const m = Number(digits.slice(4, 6));
  const d = Number(digits.slice(6, 8));
  if (m < 1 || m > 12) return { iso: "", error: "월은 01~12 사이로 넣어주세요." };

  // 말일은 달마다 다르고 윤년도 있어요 — Date 로 되돌려서 확인해요.
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (d < 1 || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d)
    return { iso: "", error: `${m}월에는 없는 날짜예요.` };

  const iso = `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  if (iso > maxISO) return { iso: "", error: "오늘보다 뒤 날짜는 넣을 수 없어요." };
  return { iso, error: null };
}

/** 확인용 문장 — 1970-03-15 → "1970년 3월 15일생" */
export function birthLabel(iso: string): string {
  return `${Number(iso.slice(0, 4))}년 ${Number(iso.slice(5, 7))}월 ${Number(iso.slice(8, 10))}일생`;
}
