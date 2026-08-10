// 운세 팩트체크 — 전체 화면 스크린샷 (Playwright)
// 사전: dev 서버(http://localhost:5173) 실행. 광고/Supabase 키 없이도 흐름이 동작해요
// (보상형 게이트는 미설정 시 즉시 통과 → 상세 해금 가능).
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = "http://localhost:5173/";
const OUT = "screenshots";
mkdirSync(OUT, { recursive: true });

// 토스 콘솔 세로 스크린샷 규격은 636x1048 정확히 — 리사이즈가 안 되니
// 배율 2배로 렌더해서 그 해상도로 바로 찍어요(318x524 @2x = 636x1048).
const VIEWPORT = { width: 318, height: 524 };
let n = 0;

async function shot(page, name) {
  n += 1;
  const file = `${OUT}/${String(n).padStart(2, "0")}-${name}.png`;
  // 토스트("해금했어요!" 등)가 하단 탭을 가린 채 찍히지 않게 사라질 때까지 기다려요
  await page.waitForTimeout(2600);
  await page.screenshot({ path: file });
  console.log("📸", file);
}
async function waitText(page, text, timeout = 15000) {
  await page.getByText(text, { exact: false }).first().waitFor({ timeout });
}
async function tap(page, text) {
  const btn = page.getByRole("button", { name: text }).first();
  if (await btn.count()) {
    await btn.click();
    return;
  }
  await page.getByText(text, { exact: false }).first().click();
}

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: VIEWPORT,
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const page = await ctx.newPage();

// ── 온보딩 (띠 미리보기까지 띄운 상태) ──
await page.goto(BASE, { waitUntil: "networkidle" });
await waitText(page, "운세·사주 팩트체크");
await page.getByRole("button", { name: "말" }).first().click();
await page.locator('input[inputmode="numeric"]').first().fill("19960520");
await waitText(page, "자리"); // 별자리 미리보기가 떠야 입력 완료
await page.mouse.wheel(0, -2000);
await shot(page, "onboarding");
await tap(page, "내 운세 보기");

// ── 홈 (상세운 전부 해금 — 브라우저에선 광고 게이트가 즉시 통과) ──
await waitText(page, "오늘의 운세");
let guard = 0;
while (guard++ < 4) {
  const ad = page.getByRole("button", { name: "광고 보고 이어서 보기" }).first();
  if ((await ad.count()) === 0) break;
  await ad.click();
  await page.waitForTimeout(400);
}
await page.waitForTimeout(3000); // 해금 토스트가 하단 탭을 가리지 않게
await page.mouse.wheel(0, -3000);
await shot(page, "home");

// ── 스토어 스크린샷용 예시 기록 ──
// 갓 설치한 상태로 찍으면 통계가 "1회 검증 · 100%" 라 화면이 비어 보여요.
// 지난 20일치 O/X 를 로컬에 심어서 연속 기록·캘린더·적중률이 실제처럼 보이게 해요.
await page.evaluate(() => {
  const KEY = "fc:state:v1";
  const s = JSON.parse(localStorage.getItem(KEY));
  const cats = ["love", "money", "work"];
  for (let i = 1; i <= 20; i++) {
    const t = new Date(Date.now() - i * 86400000);
    const day = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
    s.checks[`${day}:overall`] = i % 4 !== 0;
    if (i % 3 === 0) s.checks[`${day}:${cats[i % 3]}`] = i % 5 !== 0;
  }
  localStorage.setItem(KEY, JSON.stringify(s));
});
await page.reload({ waitUntil: "networkidle" });
await waitText(page, "오늘의 운세");

// ── 검증 화면 ──
await tap(page, "검증하러 가기");
await waitText(page, "오늘 운세, 맞았어요?");
await shot(page, "verify");

// O/X 검증 (확인한 운세 = 종합 + 해금한 상세)
guard = 0;
while (guard++ < 8) {
  const yes = page.getByText("⭕ 맞았어요", { exact: false }).first();
  if ((await yes.count()) === 0) break;
  await yes.click();
  await page.waitForTimeout(350);
}

// ── 통계 (자동 이동되거나 직접 이동) ──
if ((await page.getByText("내 적중률 통계", { exact: false }).count()) === 0) {
  // 통계 탭으로 이동
  await page.getByText("통계", { exact: false }).first().click();
}
await waitText(page, "내 적중률 통계");
await shot(page, "stats");

// ── 사주 원국 (무료로 보이는 부분) ──
await page.getByText("사주풀이", { exact: false }).first().click();
await waitText(page, "사주 풀이");
await page.mouse.wheel(0, -3000);
await page.waitForTimeout(300);
// 원국 표가 화면에 들어오게 조금 내려요 (스크롤 컨테이너 위에 커서를 올려야 먹혀요)
await page.mouse.move(159, 300);
await page.mouse.wheel(0, 330);
await shot(page, "saju");

await browser.close();
console.log(`\n✅ 완료: ${n}장 → ${OUT}/`);
