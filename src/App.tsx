import { closeView, graniteEvent } from "@apps-in-toss/web-framework";
import { useEffect } from "react";

import "./App.css";
import { BannerAd } from "./components/BannerAd";
import { BottomNav } from "./components/BottomNav";
import { HomeScreen } from "./features/home/HomeScreen";
import { OnboardingScreen } from "./features/onboarding/OnboardingScreen";
import { StatsScreen } from "./features/stats/StatsScreen";
import { VerifyScreen } from "./features/verify/VerifyScreen";
import { trackScreen } from "./lib/analytics";
import { RouterProvider, useRouter, type RouteName } from "./router";
import { StateProvider, useAppState } from "./state";
import { palette } from "./theme";

const TAB_SCREENS: RouteName[] = ["home", "verify", "stats"];

function CurrentScreen() {
  const { route } = useRouter();
  const { profile } = useAppState();

  // 프로필(생년월일)이 없으면 항상 온보딩
  if (!profile) return <OnboardingScreen />;

  switch (route.name) {
    case "onboarding":
      return <OnboardingScreen />;
    case "home":
      return <HomeScreen />;
    case "verify":
      return <VerifyScreen />;
    case "stats":
      return <StatsScreen />;
    default:
      return <HomeScreen />;
  }
}

function Shell() {
  const { route, back, canGoBack } = useRouter();
  const { profile } = useAppState();
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
      {showTabs && <BannerAd slot={route.name} />}
      {showTabs && <BottomNav />}
    </div>
  );
}

function App() {
  return (
    <StateProvider>
      <RouterProvider initial={{ name: "home" }}>
        <Shell />
      </RouterProvider>
    </StateProvider>
  );
}

export default App;
