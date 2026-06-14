import type { ReactNode } from "react";

import { Top } from "@toss/tds-mobile";

import { palette } from "../theme";

interface ScreenLayoutProps {
  title?: string;
  subtitle?: string;
  headerRight?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}

/** 공통 화면 틀 — 본문 상단 큰 제목(TDS Top) + 스크롤 본문. 상단 바는 토스 네이티브가 처리. */
export function ScreenLayout({
  title,
  subtitle,
  headerRight,
  footer,
  children,
}: ScreenLayoutProps) {
  return (
    <div
      style={{
        height: "100%",
        minHeight: 0,
        background: palette.bg,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <main
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "8px 20px 24px",
          paddingTop: "max(8px, env(safe-area-inset-top))",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {title != null && (
          <Top
            title={
              <Top.TitleParagraph size={22} color={palette.ink}>
                {title}
              </Top.TitleParagraph>
            }
            subtitleBottom={
              subtitle != null ? (
                <Top.SubtitleParagraph size={15} color={palette.sub}>
                  {subtitle}
                </Top.SubtitleParagraph>
              ) : undefined
            }
            right={headerRight}
          />
        )}
        {children}
      </main>

      {footer != null && (
        <div
          style={{
            padding: "12px 20px",
            paddingBottom: "max(12px, env(safe-area-inset-bottom))",
          }}
        >
          {footer}
        </div>
      )}
    </div>
  );
}

/** 흰 카드 컨테이너 */
export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background: palette.card,
        borderRadius: 18,
        padding: 18,
        boxShadow: "0 2px 16px rgba(74,63,199,0.06)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
