// state.tsx 회귀 검증. 실행: npm run check:state
//
// state.tsx 는 JSX + 확장자 없는 import 라서 node 로 바로 못 읽어요.
// 그래서 esbuild(이미 vite 로 설치돼 있어요)로 **진짜 state.tsx 를 번들**하고,
// react 만 아주 작은 훅 런타임으로 바꿔치기해서 StateProvider 를 실제로
// 렌더·재렌더합니다. 검증 대상 로직(load/saveProfile/markViewed/submitCheck)은
// 복사본이 아니라 소스 그대로예요.
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { build } from "esbuild";

import { generateFortune } from "../src/data/fortune.ts";
import { computeSaju } from "../src/data/saju.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

// ── 아주 작은 react 대체품 (훅 순서만 지키는 동기 렌더러) ──────────────
const REACT_SHIM = `
let cur = null;
export function createContext(defaultValue) {
  const ctx = { _default: defaultValue };
  ctx.Provider = { ctx };
  return ctx;
}
export function useContext(ctx) { return ctx._default; }
export function useState(initial) {
  const inst = cur, i = inst.i++;
  if (inst.hooks.length <= i) {
    inst.hooks[i] = typeof initial === "function" ? initial() : initial;
  }
  return [inst.hooks[i], (v) => {
    inst.hooks[i] = typeof v === "function" ? v(inst.hooks[i]) : v;
    inst.dirty = true;
  }];
}
export function useMemo(fn, deps) {
  const inst = cur, i = inst.i++;
  const prev = inst.hooks[i];
  if (prev && prev.deps && deps && prev.deps.length === deps.length &&
      deps.every((d, k) => Object.is(d, prev.deps[k]))) return prev.value;
  const value = fn();
  inst.hooks[i] = { deps, value };
  return value;
}
export function useCallback(fn, deps) { return useMemo(() => fn, deps); }
// useEffect 는 저장(localStorage 쓰기)에만 쓰여요 — 이 검증 대상이 아니라 건너뜁니다.
export function useEffect() { cur.i++; }
export function jsx(type, props) { return { type, props }; }
export const jsxs = jsx;
export const Fragment = "Fragment";

export function __render(Comp) {
  const inst = { hooks: [], i: 0, dirty: false };
  let tree = null;
  const run = () => {
    inst.i = 0; inst.dirty = false;
    const prev = cur; cur = inst;
    try { tree = Comp({ children: null }); } finally { cur = prev; }
  };
  run();
  return () => {
    for (let n = 0; inst.dirty; n++) {
      if (n > 50) throw new Error("렌더 루프가 안 끝나요");
      run();
    }
    return tree.props.value;
  };
}
`;

const bundle = await build({
  stdin: {
    contents:
      'export { StateProvider } from "./src/state.tsx";\nexport { __render } from "react";\n',
    resolveDir: ROOT,
    loader: "ts",
  },
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
  jsx: "automatic",
  packages: "external",
  define: { "import.meta.env": "{}" },
  plugins: [
    {
      name: "stubs",
      setup(b) {
        b.onResolve({ filter: /^(react(\/jsx-runtime)?|@supabase\/supabase-js)$/ }, (a) => ({
          path: a.path,
          namespace: "stub",
        }));
        b.onLoad({ filter: /.*/, namespace: "stub" }, (a) => ({
          contents: a.path.startsWith("@supabase")
            ? "export function createClient() { throw new Error('no supabase in check'); }"
            : REACT_SHIM,
          loader: "js",
        }));
      },
    },
  ],
});

const outFile = join(mkdtempSync(join(tmpdir(), "fc-state-")), "state.mjs");
writeFileSync(outFile, bundle.outputFiles[0].text);

// ── 브라우저 전역 흉내 ────────────────────────────────────────────────
let store: Record<string, string> = {};
const g = globalThis as unknown as Record<string, unknown>;
g.localStorage = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => {
    store[k] = v;
  },
  removeItem: (k: string) => {
    delete store[k];
  },
  clear: () => {
    store = {};
  },
};

const RealDate = Date;
let NOW = RealDate.now();
class MockDate extends RealDate {
  constructor(...args: unknown[]) {
    // @ts-expect-error 인자 그대로 넘겨요
    if (args.length === 0) super(NOW); else super(...args);
  }
  static now() {
    return NOW;
  }
}
g.Date = MockDate;
const setNow = (iso: string) => {
  NOW = RealDate.parse(iso);
};

interface Fortune {
  text: string;
}
interface AppValue {
  today: string;
  people: { id: string; birthDate?: string; name?: string }[];
  allChecks: { date: string; category: string; verdict: boolean }[];
  saveProfile: (b: string, t?: string, n?: string, g?: string) => void;
  markViewed: (c: string) => void;
  markSajuViewed: () => void;
  isViewed: (c: string) => boolean;
  fortuneOf: (c: string, d?: string) => Fortune | null;
  sajuLineOf: (d?: string) => string | null;
  submitCheck: (c: string, v: boolean) => void;
}

const mod = (await import(pathToFileURL(outFile).href)) as {
  StateProvider: unknown;
  __render: (c: unknown) => () => AppValue;
};

const STORAGE_KEY = "fc:state:v1";
function seed(value: unknown): () => AppValue {
  store = {};
  if (value != null) store[STORAGE_KEY] = JSON.stringify(value);
  return mod.__render(mod.StateProvider);
}

// ── 버그 1: 저장된 사람 하나가 깨져도 나머지 + 검증 기록이 살아남아야 해요 ──
{
  const checks = { "2026-08-01:overall": true, "2026-08-02:love": false };
  const me = {
    id: "me",
    birthDate: "1990-05-15",
    birthTime: "09:20",
    name: "나",
    zodiac: "말띠",
    zodiacEmoji: "🐴",
    starSign: "황소자리",
    starSignEmoji: "♉",
  };
  const base = {
    activeId: "me",
    viewed: {},
    unlocked: {},
    checks,
    saves: {},
    pinned: {},
    pinnedSaju: {},
    sajuUnlocks: {},
    installedAt: "2026-07-01",
  };

  // birthDate 가 유실된 사람이 섞여 있는 저장본
  const v = seed({ ...base, people: [me, { id: "mom", name: "엄마" }] })();
  assert.equal(v.people.length, 2, "깨진 사람 때문에 사람 목록이 날아갔어요");
  assert.equal(v.people[0].birthDate, "1990-05-15", "본인 프로필이 사라졌어요");
  assert.equal(v.allChecks.length, 2, "검증 기록이 통째로 사라졌어요");

  // people 자체가 배열이 아닌 저장본
  const v2 = seed({ ...base, people: "corrupt" })();
  assert.equal(v2.people.length, 0);
  assert.equal(v2.allChecks.length, 2, "people 가 깨졌다고 검증 기록까지 버렸어요");
  console.log("버그1 OK — 깨진 person 이 있어도 프로필·검증기록 유지");
}

// ── 버그 2: 생년월일을 고치면 그날 고정된 운세도 다시 계산돼야 해요 ──
{
  setNow("2026-08-05T10:00:00+09:00");
  const v = seed(null);
  v().saveProfile("1970-05-15", "09:20", "나", "male");
  v().markViewed("overall");
  v().markSajuViewed();
  const today = v().today;
  const before = v().fortuneOf("overall");
  assert.ok(before && v().sajuLineOf(), "고정(pin)이 안 됐어요 — 전제가 깨졌어요");

  // 이름만 바꾼 경우는 그대로 유지
  v().saveProfile("1970-05-15", "09:20", "다른이름", "male");
  assert.equal(
    v().fortuneOf("overall")?.text,
    before.text,
    "이름만 바꿨는데 그날 운세가 바뀌었어요",
  );

  // 생년월일을 바꾸면 새 사주 기준으로 다시 계산
  v().saveProfile("1997-05-15", "09:20", "나", "male");
  const after = v().fortuneOf("overall");
  const expected = generateFortune(
    today,
    computeSaju("1997-05-15", "09:20"),
    "overall",
    [],
  );
  assert.equal(
    after?.text,
    expected.text,
    "생년월일을 고쳤는데 옛 생년월일 기준 운세가 그대로 남아 있어요",
  );
  assert.notEqual(after?.text, before.text, "두 생년월일의 운세가 같아 검증이 무의미해요");
  assert.equal(v().sajuLineOf(), null, "옛 생년월일 기준 사주 일운이 남아 있어요");
  console.log("버그2 OK — 생년월일 수정 시 그날 pin 해제, 이름 수정은 유지");
}

// ── 버그 3: 자정을 넘겨 누른 기록은 '오늘'로 들어가야 해요 ──
{
  setNow("2026-08-05T23:59:00+09:00");
  const v = seed(null);
  v().saveProfile("1990-05-15", "09:20", "나", "male");
  const stale = v(); // 23:59 에 그려진 화면이 들고 있는 핸들러

  setNow("2026-08-06T00:00:10+09:00");
  stale.submitCheck("overall", true);
  stale.markViewed("love");

  assert.deepEqual(
    v().allChecks.map((c) => c.date),
    ["2026-08-06"],
    "자정을 넘겨 누른 검증이 어제로 기록됐어요",
  );
  assert.equal(v().isViewed("love"), true, "자정을 넘긴 뒤 확인한 운세가 화면에서 사라져요");
  console.log("버그3 OK — 자정을 넘겨도 누른 시점 날짜로 기록");
}

console.log("state-check OK");
