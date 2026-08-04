import { getTossShareLink, share } from "@apps-in-toss/web-framework";

import { isInTossApp } from "../lib/tossEnv";

// granite.config.ts 의 appName / brand.icon 과 맞춰야 해요.
const DEEP_LINK = "intoss://fortune-check";
const OG_IMAGE =
  "https://static.toss.im/appsintoss/13203/78c0dc73-c0da-4257-9686-7195c044727d.png";

/** 공유 카드 텍스트로 앱 공유 → 성공 시 상세 1회 해금에 연결. */
export async function shareApp(message: string): Promise<boolean> {
  const text = `${message} 🔮 [운세 팩트체크]`;
  if (!isInTossApp()) return true; // 브라우저 개발 시 성공으로 간주
  try {
    let link = "";
    try {
      // path 는 반드시 intoss:// 딥링크여야 해요. "/" 를 넘기면 링크 없이 공유돼요.
      link = await getTossShareLink(DEEP_LINK, OG_IMAGE);
    } catch (err) {
      console.error("getTossShareLink 실패", err);
    }
    await share({ message: link ? `${text}\n${link}` : text });
    return true;
  } catch {
    return false;
  }
}
