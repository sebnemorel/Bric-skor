-- =====================================================================
-- Briç Skor Akdeniz · 6. güncelleme: kulüp arşivi
--
-- Önceki dosyaları (schema, 02-05) çalıştırdıysan SADECE bu dosyayı çalıştır.
-- Tekrar çalıştırılması zararsızdır.
--
-- - Yönetici (kuran telefon ya da hakem şifresi) turnuvayı "bitirir".
-- - Biten turnuvanın skorları ve isimleri kilitlenir: kimse ekleyemez, değiştiremez, silemez.
-- - Biten turnuvalar arşivde herkese listelenir (kodları gösterilmez; okumak için kod gerekmez).
-- =====================================================================

alter table public.tournaments add column if not exists finished_at timestamptz;

-- Turnuva hâlâ açık mı? (RLS kurallarında kullanılır; tabloya doğrudan erişim olmadığı için security definer)
create or replace function public.tournament_open(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.tournaments t where t.id = p_id and t.finished_at is null);
$$;
revoke all on function public.tournament_open(uuid) from public;
grant execute on function public.tournament_open(uuid) to anon, authenticated;

-- Sonuçlar: okumak serbest, yazmak sadece açık turnuvada
drop policy if exists "sonuclar eklenir"     on public.results;
drop policy if exists "sonuclar guncellenir" on public.results;
drop policy if exists "sonuclar silinir"     on public.results;
create policy "sonuclar eklenir"     on public.results for insert to anon, authenticated
  with check (public.tournament_open(tournament_id));
create policy "sonuclar guncellenir" on public.results for update to anon, authenticated
  using (public.tournament_open(tournament_id)) with check (public.tournament_open(tournament_id));
create policy "sonuclar silinir"     on public.results for delete to anon, authenticated
  using (public.tournament_open(tournament_id));

-- İsimler: aynı kural
drop policy if exists "ciftler eklenir"     on public.pairs;
drop policy if exists "ciftler guncellenir" on public.pairs;
create policy "ciftler eklenir"     on public.pairs for insert to anon, authenticated
  with check (public.tournament_open(tournament_id));
create policy "ciftler guncellenir" on public.pairs for update to anon, authenticated
  using (public.tournament_open(tournament_id)) with check (public.tournament_open(tournament_id));

-- Turnuvayı bitir (ya da yanlışlıkla bittiyse yeniden aç): kuran cihazın anahtarı ya da hakem şifresi
create or replace function public.finish_tournament(p_id uuid, p_admin_secret text, p_finished boolean default true)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.tournaments%rowtype;
begin
  select * into t from public.tournaments where id = p_id for update;
  if not found then
    return false;
  end if;

  if t.admin_hash = encode(extensions.digest(coalesce(p_admin_secret, ''), 'sha256'), 'hex')
     or (t.pin_hash is not null and t.pin_failures < 10
         and extensions.crypt(coalesce(p_admin_secret, ''), t.pin_hash) = t.pin_hash) then
    update public.tournaments
      set finished_at = case when p_finished then coalesce(finished_at, now()) else null end
      where id = t.id;
    return true;
  end if;

  if t.pin_hash is not null then
    update public.tournaments set pin_failures = pin_failures + 1 where id = t.id;
  end if;
  return false;
end;
$$;
revoke all on function public.finish_tournament(uuid, text, boolean) from public;
grant execute on function public.finish_tournament(uuid, text, boolean) to anon, authenticated;

-- Arşiv: biten turnuvalar (en yeni önce). Kod gösterilmez.
create or replace function public.list_archive()
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(json_agg(x order by x."finishedAt" desc), '[]'::json)
  from (
    select
      t.id,
      t.name,
      t.date,
      t.pair_count as "pairCount",
      t.boards_per_round as "boardsPerRound",
      t.movement,
      t.finished_at as "finishedAt"
    from public.tournaments t
    where t.finished_at is not null
    order by t.finished_at desc
    limit 200
  ) x;
$$;
revoke all on function public.list_archive() from public;
grant execute on function public.list_archive() to anon, authenticated;

-- Kodla katılma: turnuvanın bitip bitmediğini de döner
create or replace function public.join_tournament(p_code text)
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select json_build_object(
    'id', t.id,
    'code', t.code,
    'name', t.name,
    'date', t.date,
    'pairCount', t.pair_count,
    'boardsPerRound', t.boards_per_round,
    'movement', t.movement,
    'createdAt', t.created_at,
    'finishedAt', t.finished_at
  )
  from public.tournaments t
  where t.code = upper(trim(p_code));
$$;
