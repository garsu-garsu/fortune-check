import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

// 앱 내 화면 라우팅 (앱인토스 WebView 단일 SPA 패턴).
export type Route =
  | { name: "onboarding" }
  | { name: "home" } // 오늘의 운세
  | { name: "verify" } // 밤 O/X 검증
  | { name: "stats" }; // 적중률 통계 + 전국 랭킹

export type RouteName = Route["name"];

interface RouterContextValue {
  route: Route;
  navigate: (route: Route) => void;
  back: () => void;
  reset: (route: Route) => void;
  canGoBack: boolean;
}

const RouterContext = createContext<RouterContextValue | null>(null);

export function RouterProvider({
  children,
  initial = { name: "home" },
}: {
  children: ReactNode;
  initial?: Route;
}) {
  const [stack, setStack] = useState<Route[]>([initial]);

  const navigate = useCallback((route: Route) => {
    setStack((prev) => [...prev, route]);
  }, []);
  const back = useCallback(() => {
    setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);
  const reset = useCallback((route: Route) => {
    setStack([route]);
  }, []);

  const value = useMemo<RouterContextValue>(
    () => ({
      route: stack[stack.length - 1],
      navigate,
      back,
      reset,
      canGoBack: stack.length > 1,
    }),
    [stack, navigate, back, reset],
  );

  return (
    <RouterContext.Provider value={value}>{children}</RouterContext.Provider>
  );
}

export function useRouter(): RouterContextValue {
  const ctx = useContext(RouterContext);
  if (ctx == null) throw new Error("useRouter must be used within RouterProvider");
  return ctx;
}
