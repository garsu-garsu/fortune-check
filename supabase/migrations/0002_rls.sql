-- Row Level Security (신원 = auth.uid()). 본인 행만 읽기/쓰기.
-- 원시 행은 외부 공개하지 않고, 띠별 랭킹은 SECURITY DEFINER RPC(0003)로만 노출해요.

alter table public.fortune_checks enable row level security;

create policy fc_select_own on public.fortune_checks
  for select using (anon_id = auth.uid());

create policy fc_insert_own on public.fortune_checks
  for insert with check (anon_id = auth.uid());

create policy fc_update_own on public.fortune_checks
  for update using (anon_id = auth.uid()) with check (anon_id = auth.uid());
-- delete 정책 없음 → 거부
