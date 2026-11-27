-- =====================================================================
-- Briç Skor Akdeniz · 11. güncelleme: tur süresi
--
-- 10'u çalıştırdıysan SADECE bu dosyayı çalıştır. Tekrar çalıştırılması zararsızdır.
--
-- Hakem tur süresini ayarlar, başlatır, durdurur, süre ekler. Kalan süre hakem ekranında
-- ve masa telefonlarında canlı görünür. Süreyi sadece hakem (turnuvayı kuran bilgisayar ya da
-- hakem şifresi) değiştirebilir.
-- =====================================================================

create table if not exists public.timers (
  tournament_id uuid primary key references public.tournaments(id) on delete cascade,
  round         int  not null default 1 check (round between 1 and 60),
  round_minutes int  not null default 20 check (round_minutes between 1 and 240),
  ends_at       timestamptz,               -- çalışıyorsa: bitiş anı
  remaining_sec int check (remaining_sec between 0 and 86400), -- durdurulmuşsa: kalan saniye
  updated_at    timestamptz not null default now()
);

alter table public.timers enable row level security;
revoke all on public.timers from anon, authenticated;
grant select on public.timers to anon, authenticated;
drop policy if exists "sureler okunur" on public.timers;
create policy "sureler okunur" on public.timers for select to anon, authenticated using (true);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'timers'
  ) then
    alter publication supabase_realtime add table public.timers;
  end if;
end;
$$;

-- Hakem süreyi ayarlar. p_running = true ise süre şimdi başlar ve p_seconds sonra biter;
-- false ise süre durur ve p_seconds kalan süre olarak saklanır.
create or replace function public.td_set_timer(
  p_id uuid, p_secret text, p_round int, p_minutes int, p_running boolean, p_seconds int
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.tournaments%rowtype;
  secs int := greatest(0, least(coalesce(p_seconds, 0), 86400));
begin
  select * into t from public.tournaments where id = p_id for update;
  if not found or t.finished_at is not null or t.created_at <= now() - interval '24 hours' then
    return false;
  end if;
  if not (
    t.admin_hash = encode(extensions.digest(coalesce(p_secret, ''), 'sha256'), 'hex')
    or (t.pin_hash is not null and t.pin_failures < 10
        and extensions.crypt(coalesce(p_secret, ''), t.pin_hash) = t.pin_hash)
  ) then
    if t.pin_hash is not null then
      update public.tournaments set pin_failures = pin_failures + 1 where id = t.id;
    end if;
    return false;
  end if;

  insert into public.timers (tournament_id, round, round_minutes, ends_at, remaining_sec, updated_at)
  values (
    p_id,
    greatest(1, least(coalesce(p_round, 1), 60)),
    greatest(1, least(coalesce(p_minutes, 20), 240)),
    case when p_running then now() + make_interval(secs => secs) end,
    case when p_running then null else secs end,
    now()
  )
  on conflict (tournament_id) do update set
    round = excluded.round,
    round_minutes = excluded.round_minutes,
    ends_at = excluded.ends_at,
    remaining_sec = excluded.remaining_sec,
    updated_at = now();
  return true;
end;
$$;

-- Süreyi sunucu saatiyle birlikte döner (telefon saati farklıysa düzeltmek için).
create or replace function public.get_timer(p_id uuid)
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select json_build_object(
    'timer', (
      select json_build_object(
        'round', x.round,
        'roundMinutes', x.round_minutes,
        'endsAt', x.ends_at,
        'remainingSec', x.remaining_sec
      )
      from public.timers x where x.tournament_id = p_id
    ),
    'now', now()
  );
$$;

revoke all on function public.td_set_timer(uuid, text, int, int, boolean, int) from public;
revoke all on function public.get_timer(uuid) from public;
grant execute on function public.td_set_timer(uuid, text, int, int, boolean, int) to anon, authenticated;
grant execute on function public.get_timer(uuid) to anon, authenticated;
