-- =====================================================================
-- Briç Skor Akdeniz · 2. güncelleme: çift isimleri ve kategoriler
--
-- schema.sql'i daha önce çalıştırdıysan SADECE bu dosyayı çalıştır:
-- Supabase → SQL Editor → New query → yapıştır → Run.
-- (Tekrar çalıştırılması zararsızdır.)
--
-- Kural: hakem isimleri girer; girmediyse ya da yanlışsa çiftler kendi
-- telefonlarından düzeltebilir. Kodu bilen herkes düzenleyebilir, son giriş geçerlidir.
-- =====================================================================

create table if not exists public.pairs (
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  side       text not null check (side in ('NS', 'EW')),
  number     int  not null check (number between 1 and 30),
  player1    text not null default '' check (char_length(player1) <= 60),
  player2    text not null default '' check (char_length(player2) <= 60),
  category   text check (category in ('Açık', 'Karışık', 'Kadın', 'Senyör', 'Genç')),
  updated_at timestamptz not null default now(),
  primary key (tournament_id, side, number)
);

alter table public.pairs enable row level security;
grant select, insert, update on public.pairs to anon, authenticated;

drop policy if exists "ciftler okunur"      on public.pairs;
drop policy if exists "ciftler eklenir"     on public.pairs;
drop policy if exists "ciftler guncellenir" on public.pairs;

create policy "ciftler okunur"      on public.pairs for select to anon, authenticated using (true);
create policy "ciftler eklenir"     on public.pairs for insert to anon, authenticated with check (true);
create policy "ciftler guncellenir" on public.pairs for update to anon, authenticated using (true) with check (true);

-- Canlı güncelleme
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'pairs'
  ) then
    alter publication supabase_realtime add table public.pairs;
  end if;
end;
$$;
