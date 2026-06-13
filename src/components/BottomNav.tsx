import { Paragraph } from "@toss/tds-mobile";

import { useRouter, type Route, type RouteName } from "../router";
import { palette } from "../theme";

interface Tab {
  name: RouteName;
  label: string;
  emoji: string;
}

const TABS: Tab[] = [
  { name: "home", label: "오늘운세", emoji: "🔮" },
  { name: "verify", label: "검증", emoji: "✅" },
  { name: "stats", label: "통계", emoji: "📊" },
];

/** 메인 탭 하단 내비게이션 */
export function BottomNav() {
  const { route, reset } = useRouter();

  return (
    <nav
      style={{
        display: "flex",
        background: palette.white,
        borderTop: `1px solid ${palette.line}`,
        paddingBottom: "max(0px, env(safe-area-inset-bottom))",
      }}
    >
      {TABS.map((tab) => {
        const active = route.name === tab.name;
        return (
          <button
            key={tab.name}
            type="button"
            onClick={() => reset({ name: tab.name } as Route)}
            style={{
              flex: 1,
              border: "none",
              background: "transparent",
              padding: "9px 0 11px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              cursor: "pointer",
            }}
          >
            <span style={{ fontSize: 22, opacity: active ? 1 : 0.45 }}>
              {tab.emoji}
            </span>
            <Paragraph
              typography="t7"
              fontWeight={active ? "bold" : "medium"}
              color={active ? palette.primary : palette.sub}
            >
              {tab.label}
            </Paragraph>
          </button>
        );
      })}
    </nav>
  );
}
