import type { CSSProperties } from "react";

/** 읽히지는 않되 뭐가 있는지는 보이게 — 잠긴 표·본문에 씌우는 흐림 */
export const BLURRED: CSSProperties = {
  filter: "blur(5px)",
  opacity: 0.65,
  userSelect: "none",
  pointerEvents: "none",
};

/**
 * 잠긴 글을 "앞 한 줄만 보이고 나머지는 흐림"으로 자르는 규칙.
 * 첫 문장까지 보여주되, 문장이 하나뿐이라 다 보여주게 되는 경우엔 글자 수로 잘라요.
 * (가릴 게 안 남으면 흐림 처리가 의미가 없어요.)
 */
export function splitTeaser(text: string): [string, string] {
  const m = text.match(/^[\s\S]*?[.!?]\s/);
  let head = m?.[0] ?? "";
  if (!head || head.length > 80 || head.length >= text.length - 4) {
    // 최소 12자는 보여주되, 가릴 몫은 반드시 남겨요
    const want = Math.max(12, Math.round(text.length * 0.35));
    head = text.slice(0, Math.min(Math.max(1, text.length - 2), want));
  }
  return [head, text.slice(head.length)];
}
