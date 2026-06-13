# 운세 팩트체크 — 백엔드 (Supabase)

전국 띠별 적중률 랭킹 **집계만** 담당해요. 인증은 **익명 로그인만** 사용하고, 개인정보는 서버에 저장하지 않아요.
(생년월일·띠 산출은 클라 기기 로컬에서만 — 서버는 `{익명id, 날짜, 띠, 카테고리, O/X}` 집계값만 보관.)
→ 토스 로그인·`toss-auth`·`toss-disconnect`(연결끊기) 엔드포인트가 **불필요**해요.

## 배포 상태 (live)

- **무료 플랜 조직 활성 프로젝트 2개 한도** 때문에 전용 프로젝트 대신, 기존 **`daily-vote` 프로젝트(`wiynloufgqbdygawcevw`, ap-south-1)** 에 얹어 운영해요.
- 테이블/RPC 이름이 daily-vote(`profiles/questions/votes/...`)와 겹치지 않아 한 DB에서 안전하게 공존해요(`fortune_checks` + `zodiac_ranking`).
- 마이그레이션 0001~0003을 관리 API로 적용 완료(daily-vote 마이그레이션 이력은 건드리지 않음).
- **익명 로그인 활성화됨**(daily-vote에서 이미 켜져 있음) — 랭킹 집계에 필수.
- 검증: 익명 로그인 → upsert → 본인행 조회 → `zodiac_ranking` 정상(테스트 데이터·테스트 유저는 정리함).
- 나중에 전용 프로젝트로 분리하려면 0001~0003을 그대로 새 프로젝트에 `supabase db push` 하면 돼요(번호 1부터라 깔끔).

## 구성

```
supabase/
├─ config.toml                 # enable_anonymous_sign_ins = true (함수 없음)
└─ migrations/
   ├─ 0001_init.sql            # kst_today() + fortune_checks(anon_id,kst_date,category,zodiac,verdict)
   ├─ 0002_rls.sql            # RLS — 본인 행만 select/insert/update (delete 없음)
   └─ 0003_functions.sql      # zodiac_ranking(p_date) SECURITY DEFINER RPC (집계만 노출)
```

## 데이터 모델

- **fortune_checks**: `(anon_id, kst_date, category)` 기본키 = 하루 카테고리당 1건(덮어쓰기 허용). 개인 식별 컬럼 없음.
- 원시 행은 외부 공개 안 함(RLS 본인만). 전국 랭킹은 `zodiac_ranking(date)` RPC로만 — `[{ zodiac, hit_rate, samples }]`.

## 클라이언트 연결 (이미 연결됨)

- 루트 `.env`에 실제 `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`(daily-vote 프로젝트) 들어있어요(gitignore).
- 진입 후 검증 제출 시 `ensureAnonAuth()`(익명 로그인) → `fortune_checks` upsert. 통계 화면에서 `zodiac_ranking` 조회.
- 키가 비어 있으면 전국 랭킹은 **결정적 데모 집계**로 폴백(브라우저 개발 안 끊김).

## 운영 메모

- 키가 노출되면 안 되는 값(.env, supabase/.db-password)은 커밋 금지(.gitignore 처리됨).
- pg_cron 같은 스케줄은 불필요(랭킹은 조회 시점 집계). 표본이 적은 날도 `samples`로 신뢰도를 함께 노출.
