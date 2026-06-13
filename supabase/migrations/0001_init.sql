-- 운세 팩트체크 — 초기 스키마
-- 익명 인증만 사용해요(개인정보 0). 생년월일은 클라 기기에만 저장하고 서버로 보내지 않아요.
-- 서버는 전국 띠별 랭킹 집계에 필요한 {익명id, 날짜, 띠, 카테고리, O/X} 만 보관해요.

create extension if not exists pgcrypto;

-- KST(한국 표준시) 오늘 날짜. 일일 경계의 단일 기준(클라 시계 불신).
create or replace function public.kst_today()
returns date
language sql
stable
as $$
  select (now() at time zone 'Asia/Seoul')::date;
$$;

-- 운세 검증 기록. (anon_id, kst_date, category) 유일 = 하루 카테고리당 1건(덮어쓰기 허용).
-- anon_id 는 익명 로그인 유저(auth.uid()). 개인 식별 정보 컬럼 없음.
create table if not exists public.fortune_checks (
  anon_id    uuid    not null references auth.users(id) on delete cascade,
  kst_date   date    not null,
  category   text    not null check (category in ('overall','love','money','work')),
  zodiac     text    not null,
  verdict    boolean not null,
  created_at timestamptz not null default now(),
  primary key (anon_id, kst_date, category)
);

-- 띠별 일간 집계용 인덱스
create index if not exists fortune_checks_date_zodiac_idx
  on public.fortune_checks (kst_date, zodiac);
