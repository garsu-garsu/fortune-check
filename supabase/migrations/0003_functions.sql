-- 전국 띠별 적중률 랭킹 RPC. RLS를 우회해 집계만 노출(원시 행/개인정보는 비공개).
-- 클라: supabase.rpc('zodiac_ranking', { p_date }) → [{ zodiac, hit_rate, samples }]

create or replace function public.zodiac_ranking(p_date date)
returns table(zodiac text, hit_rate numeric, samples bigint)
language sql
security definer
set search_path = public
stable
as $$
  select fc.zodiac,
         round(100.0 * count(*) filter (where fc.verdict) / count(*), 0) as hit_rate,
         count(*) as samples
  from public.fortune_checks fc
  where fc.kst_date = p_date
  group by fc.zodiac
  order by hit_rate desc, samples desc;
$$;

grant execute on function public.zodiac_ranking(date) to anon, authenticated;
grant execute on function public.kst_today() to anon, authenticated;
