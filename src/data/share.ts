import { getTossShareLink, share } from "@apps-in-toss/web-framework";

import { isInTossApp } from "../lib/tossEnv";

/** 공유 카드 텍스트로 앱 공유 → 성공 시 상세 1회 해금에 연결. */
export async function shareApp(message: string): Promise<boolean> {
  const text = `${message} 🔮 [운세 팩트체크]`;
  if (!isInTossApp()) return true; // 브라우저 개발 시 성공으로 간주
  try {
    let link = "";
    try {
      link = await getTossShareLink("/");
    } catch {
      /* noop */
    }
    await share({ message: link ? `${text}\n${link}` : text });
    return true;
  } catch {
    return false;
  }
}
