import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  appName: "fortune-check",
  brand: {
    primaryColor: "#6C5CE7", // 운세/별자리 무드의 인디고 바이올렛
  },
  permissions: [],
  webBundleDir: "dist",
  // 토스 네이티브 상단 바: 뒤로가기 버튼 사용 (graniteEvent.backEvent 로 연결)
  navigationBar: {
    withBackButton: true,
    withHomeButton: false,
  },
});
