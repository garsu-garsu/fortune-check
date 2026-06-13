import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  appName: "fortune-check",
  brand: {
    displayName: "운세 팩트체크", // 화면에 노출될 앱의 한글 이름
    primaryColor: "#6C5CE7", // 운세/별자리 무드의 인디고 바이올렛
    icon: "", // 배포 시 아이콘 이미지 주소
  },
  web: {
    host: "localhost",
    port: 5173,
    commands: {
      dev: "vite dev",
      build: "vite build",
    },
  },
  permissions: [],
  outdir: "dist",
  // 토스 네이티브 상단 바: 뒤로가기 버튼 사용 (graniteEvent.backEvent 로 연결)
  navigationBar: {
    withBackButton: true,
    withHomeButton: false,
  },
});
