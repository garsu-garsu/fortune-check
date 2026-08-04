import { closeView, graniteEvent } from "@apps-in-toss/web-framework";
import { useEffect } from "react";

import "./App.css";
import { BottomNav } from "./components/BottomNav";
import { HomeScreen } from "./features/home/HomeScreen";
import { OnboardingScreen } from "./features/onboarding/OnboardingScreen";
import { SajuScreen } from "./features/saju/SajuScreen";
import { StatsScreen } from "./features/stats/StatsScreen";
import { VerifyScreen } from "./features/verify/VerifyScreen";
import { trackScreen } from "./lib/analytics";
import { captureCampaign } from "./lib/campaign";
import { RouterProvider, useRouter, type Route, type RouteName } from "./router";
import { StateProvider, useAppState } from "./state";
import { palette } from "./theme";

const TAB_SCREENS: RouteName[] = ["home", "saju", "verify", "stats"];

function CurrentScreen() {
  const { route } = useRouter();
  const { me: profile } = useAppState();

  // 프로필(생년월일)이 없으면 항상 온보딩
  if (!profile) return <OnboardingScreen />;

  switch (route.name) {
    case "onboarding":
      return <OnboardingScreen />;
    case "home":
      return <HomeScreen />;
    case "verify":
      return <VerifyScreen />;
    case "saju":
      return <SajuScreen />;
    case "stats":
      return <StatsScreen />;
    default:
      return <HomeScreen />;
  }
}

function Shell() {
  const { route, back, canGoBack } = useRouter();
  const { me: profile } = useAppState();
  const showTabs = profile != null && TAB_SCREENS.includes(route.name);

  useEffect(() => {
    trackScreen(profile == null ? "onboarding" : route.name);
  }, [route.name, profile]);

  // 토스 네이티브 상단 바 뒤로가기를 앱 내 이동에 연결
  useEffect(() => {
    try {
      return graniteEvent.addEventListener("backEvent", {
        onEvent: () => {
          if (canGoBack) back();
          else
            try {
              closeView();
            } catch {
              /* noop */
            }
        },
      });
    } catch {
      return undefined;
    }
  }, [back, canGoBack]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
        overflow: "hidden",
        background: palette.bg,
      }}
    >
      <div style={{ flex: 1, minHeight: 0 }}>
        <CurrentScreen />
      </div>
      {showTabs && <BottomNav />}
    </div>
  );
}

// 밤 알림은 /verify 로 들어와요 — 홈 대신 검증 화면에서 시작해요.
// 경로 끝 조각과 ?screen= 둘 다 보고, 모르는 값이면 평소대로 홈.
function initialRoute(): Route {
  try {
    const { pathname, search } = window.location;
    const screen =
      new URLSearchParams(search).get("screen") ??
      pathname.split("/").filter(Boolean).pop();
    if (screen === "verify" || screen === "stats" || screen === "saju") {
      return { name: screen };
    }
  } catch {
    /* noop */
  }
  return { name: "home" };
}

// 유입 캠페인은 첫 진입 URL 에만 있어요 — 렌더 전에 잡아둬야 해요.
captureCampaign();

function App() {
  return (
    <StateProvider>
      <RouterProvider initial={initialRoute()}>
        <Shell />
      </RouterProvider>
    </StateProvider>
  );
}

export default App;
