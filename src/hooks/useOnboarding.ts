import { useCallback, useState } from "react";

const KEY = "fc:onboarded";

/** 저장 자체가 막힌 환경(프라이빗 모드 등)에서는 매번 뜨는 걸 막기 위해
 * 읽기 실패를 "이미 봤음"으로 처리해요. */
function isOnboarded(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return true;
  }
}

function markOnboarded(): void {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    /* noop */
  }
}

/**
 * 첫 방문에만 도는 홈 코치마크. 화면을 한 번씩 누르면 다음 단계로 넘어가요.
 * 투어 중엔 화면 클릭을 전부 가로채 다른 탭으로 못 벗어나니, 진행 중 이탈로
 * 단계가 어긋나는 걱정 없이 이 컴포넌트 안에서만 상태를 들고 있어요.
 */
export function useOnboarding(total: number) {
  const [index, setIndex] = useState(() => (isOnboarded() ? -1 : 0));

  const skip = useCallback(() => {
    markOnboarded();
    setIndex(-1);
  }, []);

  const next = useCallback(() => {
    setIndex((prev) => {
      if (prev < 0) return prev;
      if (prev + 1 >= total) {
        markOnboarded();
        return -1;
      }
      return prev + 1;
    });
  }, [total]);

  return { index, next, skip };
}
