-- =====================================================================
-- Briç Skor · veritabanı şeması (5. aşama: çoklu cihaz)
--
-- Supabase panelinde: SQL Editor → New query → bu dosyanın tamamını
-- yapıştır → Run. Bir kez çalıştırman yeterli.
--
-- Güvenlik modeli (giriş/hesap yok):
--   * Turnuvaları doğrudan kimse okuyamaz/listeleyemez. Turnuvaya sadece
--     6 haneli KOD ile ulaşılır (join_tournament fonksiyonu).
--   * Turnuvayı kuran cihaz gizli bir "yönetici anahtarı" saklar; turnuvayı
--     silmek için bu anahtar gerekir. Veritabanında anahtarın kendisi değil,
--     sadece özeti (SHA-256) tutulur.
--   * Kodu bilen herkes o turnuvaya skor girebilir/düzeltebilir.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- Turnuvalar
-- ---------------------------------------------------------------------
create table if not exists public.tournaments (
  id               uuid primary key default gen_random_uuid(),
  code             text not null unique,
  name             text not null check (char_length(name) between 1 and 80),
  date             text not null check (char_length(date) <= 20),
  pair_count       int  not null check (pair_count between 4 and 60),
  boards_per_round int  not null check (boards_per_round between 1 and 8),
  admin_hash       text not null,
  created_at       timestamptz not null default now()
);

alter table public.tournaments enable row level security;
-- Tabloya doğrudan erişim yok; her şey aşağıdaki fonksiyonlarla.
revoke all on public.tournaments from anon, authenticated;

-- ---------------------------------------------------------------------
-- Masa sonuçları (bir board, bir K-G çifti tarafından bir kez oynanır)
-- ---------------------------------------------------------------------
create table if not exists public.results (
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  board      int  not null check (board between 1 and 500),
  ns         int  not null check (ns between 1 and 30),
  ew         int  not null check (ew between 1 and 30),
  round      int  not null check (round between 1 and 30),
  table_no   int  not null check (table_no between 1 and 30),
  passed     boolean not null,
  contract   jsonb,
  declarer   text check (declarer in ('N', 'E', 'S', 'W')),
  tricks     int  check (tricks between 0 and 13),
  ns_score   int  not null check (ns_score between -10000 and 10000),
  entered_at timestamptz not null default now(),
  device_id  text check (char_length(device_id) <= 64),
  primary key (tournament_id, board, ns)
);

alter table public.results enable row level security;
grant select, insert, update, delete on public.results to anon, authenticated;

drop policy if exists "sonuclar okunur"     on public.results;
drop policy if exists "sonuclar eklenir"    on public.results;
drop policy if exists "sonuclar guncellenir" on public.results;
drop policy if exists "sonuclar silinir"    on public.results;

-- tournament_id rastgele bir UUID'dir ve sadece kodla katılınca öğrenilir.
create policy "sonuclar okunur"      on public.results for select to anon, authenticated using (true);
create policy "sonuclar eklenir"     on public.results for insert to anon, authenticated with check (true);
create policy "sonuclar guncellenir" on public.results for update to anon, authenticated using (true) with check (true);
create policy "sonuclar silinir"     on public.results for delete to anon, authenticated using (true);

-- ---------------------------------------------------------------------
-- Fonksiyonlar
-- ---------------------------------------------------------------------

-- Yeni turnuva: benzersiz 6 haneli kod üretir, { id, code } döner.
create or replace function public.create_tournament(
  p_name text,
  p_date text,
  p_pair_count int,
  p_boards_per_round int,
  p_admin_secret text
) returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- karışabilecek karakterler yok: 0/O, 1/I
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
  v_id uuid;
begin
  if p_admin_secret is null or char_length(p_admin_secret) < 16 then
    raise exception 'Geçersiz yönetici anahtarı';
  end if;

  loop
    v_code := '';
    for i in 1..6 loop
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.tournaments t where t.code = v_code);
  end loop;

  insert into public.tournaments (code, name, date, pair_count, boards_per_round, admin_hash)
  values (
    v_code,
    trim(p_name),
    p_date,
    p_pair_count,
    p_boards_per_round,
    encode(extensions.digest(p_admin_secret, 'sha256'), 'hex')
  )
  returning id into v_id;

  return json_build_object('id', v_id, 'code', v_code);
end;
$$;

-- Kodla turnuvaya katıl: turnuva bilgilerini döner (yoksa null).
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
    'createdAt', t.created_at
  )
  from public.tournaments t
  where t.code = upper(trim(p_code));
$$;

-- Turnuvayı sil (sonuçlarıyla birlikte). Sadece doğru yönetici anahtarıyla.
create or replace function public.delete_tournament(p_id uuid, p_admin_secret text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted int;
begin
  delete from public.tournaments t
  where t.id = p_id
    and t.admin_hash = encode(extensions.digest(coalesce(p_admin_secret, ''), 'sha256'), 'hex');
  get diagnostics v_deleted = row_count;
  return v_deleted > 0;
end;
$$;

revoke all on function public.create_tournament(text, text, int, int, text) from public;
revoke all on function public.join_tournament(text) from public;
revoke all on function public.delete_tournament(uuid, text) from public;
grant execute on function public.create_tournament(text, text, int, int, text) to anon, authenticated;
grant execute on function public.join_tournament(text) to anon, authenticated;
grant execute on function public.delete_tournament(uuid, text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Canlı güncelleme: sonuçlar değişince bağlı telefonlara haber ver
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'results'
  ) then
    alter publication supabase_realtime add table public.results;
  end if;
end;
$$;
