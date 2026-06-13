// 운세 팩트체크 — 전체 화면 스크린샷 (Playwright)
// 사전: dev 서버(http://localhost:5173) 실행. 광고/Supabase 키 없이도 흐름이 동작해요
// (보상형 게이트는 미설정 시 즉시 통과 → 상세 해금 가능).
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = "http://localhost:5173/";
const OUT = "screenshots";
mkdirSync(OUT, { recursive: true });

const VIEWPORT = { width: 390, height: 844 };
let n = 0;

async function shot(page, name) {
  n += 1;
  const file = `${OUT}/${String(n).padStart(2, "0")}-${name}.png`;
  await page.waitForTimeout(450);
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

// ── 온보딩 ──
await page.goto(BASE, { waitUntil: "networkidle" });
await waitText(page, "운세 팩트체크");
await page.locator('input[type="date"]').fill("1996-05-20");
await waitText(page, "자리"); // 별자리 미리보기가 떠야 입력 완료
await shot(page, "onboarding");
await tap(page, "시작하기");

// ── 홈 (오늘의 운세, 상세 잠김) ──
await waitText(page, "오늘의 운세");
await shot(page, "home-locked");

// ── 상세 해금 (브라우저에선 광고 즉시 통과) ──
await page.getByText("📺 광고 보고 해금", { exact: false }).first().click();
await page.waitForTimeout(500);
await shot(page, "home-unlocked");

// ── 검증 화면 ──
await tap(page, "검증하러 가기");
await waitText(page, "오늘 운세, 맞았어요?");
await shot(page, "verify");

// O/X 검증 (확인한 운세 = 종합 + 해금한 상세)
let guard = 0;
while (guard++ < 6) {
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

await browser.close();
console.log(`\n✅ 완료: ${n}장 → ${OUT}/`);
