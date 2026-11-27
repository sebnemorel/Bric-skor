-- =====================================================================
-- Briç Skor Akdeniz · 12. güncelleme: birden fazla kategori
--
-- 11'i çalıştırdıysan SADECE bu dosyayı çalıştır. Tekrar çalıştırılması zararsızdır.
--
-- - Oyuncular: Kadın / Erkek + Senyör ve/veya Genç (ör. "Erkek, Genç", "Kadın, Senyör").
-- - Çiftler: birden fazla kategoride olabilir (ör. Kadın + Senyör → iki sıralamada da yer alır).
-- Eski tek kategorili kayıtlar otomatik taşınır.
-- =====================================================================

-- Oyuncular
alter table public.players add column if not exists categories text[] not null default '{}';
alter table public.players drop constraint if exists players_categories_check;
alter table public.players add constraint players_categories_check check (
  categories <@ array['Kadın', 'Erkek', 'Senyör', 'Genç']::text[]
  and not (categories @> array['Kadın', 'Erkek']::text[])
);
update public.players set categories = array[category] where category is not null and categories = '{}';

-- Çiftler (eski "category" sütunu eski sürümler için kalıyor: ilk kategori)
alter table public.pairs add column if not exists categories text[];
alter table public.pairs drop constraint if exists pairs_categories_check;
alter table public.pairs add constraint pairs_categories_check check (
  categories is null or categories <@ array['Açık', 'Karışık', 'Kadın', 'Senyör', 'Genç']::text[]
);
update public.pairs set categories = array[category] where category is not null and categories is null;

-- Oyuncu ekle / düzelt (kategoriler listesiyle)
drop function if exists public.td_upsert_player(text, text, text, text);
create or replace function public.td_upsert_player(p_password text, p_mp_no text, p_name text, p_categories text[])
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public._check_td(p_password) <> 'ok' then
    return false;
  end if;
  insert into public.players (mp_no, name, categories, category, updated_at)
  values (trim(p_mp_no), regexp_replace(trim(p_name), '\s+', ' ', 'g'), coalesce(p_categories, '{}'), null, now())
  on conflict (mp_no) do update
    set name = excluded.name, categories = excluded.categories, category = null, updated_at = now();
  return true;
end;
$$;

-- Toplu ekle: [{"mp_no": "123", "name": "Ad Soyad", "categories": ["Erkek", "Genç"]}, ...]
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
  insert into public.players (mp_no, name, categories, category, updated_at)
  select distinct on (trim(r->>'mp_no'))
    trim(r->>'mp_no'),
    regexp_replace(trim(r->>'name'), '\s+', ' ', 'g'),
    case when jsonb_typeof(r->'categories') = 'array'
         then array(select jsonb_array_elements_text(r->'categories'))
         else '{}'::text[] end,
    null,
    now()
  from jsonb_array_elements(p_rows) r
  on conflict (mp_no) do update
    set name = excluded.name, categories = excluded.categories, category = null, updated_at = now();
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.td_upsert_player(text, text, text, text[]) from public;
grant execute on function public.td_upsert_player(text, text, text, text[]) to anon, authenticated;
