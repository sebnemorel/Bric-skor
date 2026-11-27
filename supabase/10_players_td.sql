-- =====================================================================
-- Briç Skor Akdeniz · 10. güncelleme: kayıtlı oyuncular ve kulüp hakem şifresi
--
-- 09'u çalıştırdıysan SADECE bu dosyayı çalıştır. Tekrar çalıştırılması zararsızdır.
--
-- - Kulübün kayıtlı oyuncuları: master point numarası, ad soyad, kategori. Herkes okuyabilir.
-- - Oyuncu ekleme/düzeltme/silme sadece kulüp hakem şifresiyle (ya da yönetici parolasıyla).
-- - Çiftlere oyuncuların master point numaraları da yazılabilir.
--
-- ÖNEMLİ: Hakem şifresi bu dosyada YOK. Ayrı bir komutla, sadece Supabase SQL Editor'de
-- ayarlanır (bkz. README). 10 yanlış denemeden sonra kilitlenir; açmak için:
--   update public.app_admin set td_failures = 0 where id = 1;
-- =====================================================================

alter table public.app_admin add column if not exists td_hash text;
alter table public.app_admin add column if not exists td_failures int not null default 0;

create table if not exists public.players (
  mp_no      text primary key check (mp_no ~ '^[0-9]{1,10}$'),
  name       text not null check (char_length(name) between 1 and 60),
  category   text check (category in ('Kadın', 'Senyör', 'Genç')),
  updated_at timestamptz not null default now()
);
alter table public.players enable row level security;
revoke all on public.players from anon, authenticated;
grant select on public.players to anon, authenticated;
drop policy if exists "oyuncular okunur" on public.players;
create policy "oyuncular okunur" on public.players for select to anon, authenticated using (true);

-- Çiftlerde oyuncuların master point numaraları (isteğe bağlı)
alter table public.pairs add column if not exists mp1 text check (mp1 ~ '^[0-9]{1,10}$');
alter table public.pairs add column if not exists mp2 text check (mp2 ~ '^[0-9]{1,10}$');

-- Hakem şifresi kontrolü: 'ok' | 'wrong' | 'locked' | 'unconfigured'
-- Kulüp yöneticisinin parolası da kabul edilir.
create or replace function public._check_td(p_password text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.app_admin%rowtype;
begin
  select * into a from public.app_admin where id = 1 for update;
  if not found or (a.td_hash is null and a.master_hash is null) then
    return 'unconfigured';
  end if;
  if a.td_failures >= 10 then
    return 'locked';
  end if;
  if p_password is not null and (
       (a.td_hash is not null and extensions.crypt(p_password, a.td_hash) = a.td_hash)
    or (a.master_hash is not null and a.failures < 10 and extensions.crypt(p_password, a.master_hash) = a.master_hash)
  ) then
    update public.app_admin set td_failures = 0 where id = 1;
    return 'ok';
  end if;
  update public.app_admin set td_failures = td_failures + 1 where id = 1;
  return case when a.td_failures + 1 >= 10 then 'locked' else 'wrong' end;
end;
$$;
revoke all on function public._check_td(text) from public, anon, authenticated;

create or replace function public.td_verify(p_password text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  r text := public._check_td(p_password);
begin
  return json_build_object('ok', r = 'ok', 'locked', r = 'locked', 'configured', r <> 'unconfigured');
end;
$$;

-- Oyuncu ekle / düzelt
create or replace function public.td_upsert_player(p_password text, p_mp_no text, p_name text, p_category text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public._check_td(p_password) <> 'ok' then
    return false;
  end if;
  insert into public.players (mp_no, name, category, updated_at)
  values (trim(p_mp_no), regexp_replace(trim(p_name), '\s+', ' ', 'g'), nullif(p_category, ''), now())
  on conflict (mp_no) do update set name = excluded.name, category = excluded.category, updated_at = now();
  return true;
end;
$$;

-- Oyuncu sil
create or replace function public.td_delete_player(p_password text, p_mp_no text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public._check_td(p_password) <> 'ok' then
    return false;
  end if;
  delete from public.players where mp_no = trim(p_mp_no);
  return found;
end;
$$;

-- Toplu ekle: [{"mp_no": "123", "name": "Ad Soyad", "category": "Kadın"}, ...] → eklenen/güncellenen sayısı
create or replace function public.td_import_players(p_password text, p_rows jsonb)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  n int;
begin
  if public._check_td(p_password) <> 'ok' then
    return -1;
  end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) > 2000 then
    return -1;
  end if;
  insert into public.players (mp_no, name, category, updated_at)
  select distinct on (trim(r->>'mp_no'))
    trim(r->>'mp_no'), regexp_replace(trim(r->>'name'), '\s+', ' ', 'g'), nullif(r->>'category', ''), now()
  from jsonb_array_elements(p_rows) r
  on conflict (mp_no) do update set name = excluded.name, category = excluded.category, updated_at = now();
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.td_verify(text) from public;
revoke all on function public.td_upsert_player(text, text, text, text) from public;
revoke all on function public.td_delete_player(text, text) from public;
revoke all on function public.td_import_players(text, jsonb) from public;
grant execute on function public.td_verify(text) to anon, authenticated;
grant execute on function public.td_upsert_player(text, text, text, text) to anon, authenticated;
grant execute on function public.td_delete_player(text, text) to anon, authenticated;
grant execute on function public.td_import_players(text, jsonb) to anon, authenticated;
