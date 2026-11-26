-- =====================================================================
-- Briç Skor Akdeniz · 7. güncelleme: otomatik arşiv + yönetici parolası
--
-- Önceki dosyaları (schema, 02-06) çalıştırdıysan SADECE bu dosyayı çalıştır.
-- Tekrar çalıştırılması zararsızdır.
--
-- - Arşiv artık BÜTÜN turnuvaları listeler (devam edenler dahil).
-- - Turnuvalar kurulduktan 24 saat sonra kendiliğinden kilitlenir (ya da hakem "bitir" der).
-- - Kulüp yöneticisinin tek bir parolası olur; bununla arşivdeki herhangi bir turnuva silinir.
--
-- ÖNEMLİ: Parolanın kendisi bu dosyada YOK. Proje GitHub'da herkese açık olduğu için
-- parola ayrı bir komutla, sadece Supabase SQL Editor'de ayarlanır (bkz. README).
-- 10 yanlış denemeden sonra yönetici girişi kilitlenir; açmak için:
--   update public.app_admin set failures = 0 where id = 1;
-- =====================================================================

-- Yönetici parolası (tek satır). Doğrudan erişim yok; sadece aşağıdaki fonksiyonlarla.
create table if not exists public.app_admin (
  id          int primary key default 1 check (id = 1),
  master_hash text,
  failures    int not null default 0
);
alter table public.app_admin enable row level security;
revoke all on public.app_admin from anon, authenticated;

-- Turnuva hâlâ açık mı? Bitirilmemiş VE kurulalı 24 saatten az olmuş.
create or replace function public.tournament_open(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.tournaments t
    where t.id = p_id
      and t.finished_at is null
      and t.created_at > now() - interval '24 hours'
  );
$$;

-- Arşiv: bütün turnuvalar, en yeni önce. Kod gösterilmez.
create or replace function public.list_archive()
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(json_agg(x order by x."createdAt" desc), '[]'::json)
  from (
    select
      t.id,
      t.name,
      t.date,
      t.pair_count as "pairCount",
      t.boards_per_round as "boardsPerRound",
      t.movement,
      t.created_at as "createdAt",
      coalesce(
        t.finished_at,
        case when t.created_at <= now() - interval '24 hours' then t.created_at + interval '24 hours' end
      ) as "finishedAt"
    from public.tournaments t
    order by t.created_at desc
    limit 300
  ) x;
$$;
revoke all on function public.list_archive() from public;
grant execute on function public.list_archive() to anon, authenticated;

-- Kodla katılma: 24 saati geçmişse bitmiş say
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
    'finishedAt', coalesce(
      t.finished_at,
      case when t.created_at <= now() - interval '24 hours' then t.created_at + interval '24 hours' end
    )
  )
  from public.tournaments t
  where t.code = upper(trim(p_code));
$$;

-- Yönetici parolası doğru mu? (yanlışları sayar, 10'da kilitler)
create or replace function public.verify_master(p_password text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.app_admin%rowtype;
begin
  select * into a from public.app_admin where id = 1 for update;
  if not found or a.master_hash is null then
    return json_build_object('ok', false, 'locked', false, 'configured', false);
  end if;
  if a.failures >= 10 then
    return json_build_object('ok', false, 'locked', true, 'configured', true);
  end if;
  if p_password is not null and extensions.crypt(p_password, a.master_hash) = a.master_hash then
    update public.app_admin set failures = 0 where id = 1;
    return json_build_object('ok', true, 'locked', false, 'configured', true);
  end if;
  update public.app_admin set failures = failures + 1 where id = 1;
  return json_build_object('ok', false, 'locked', a.failures + 1 >= 10, 'configured', true);
end;
$$;

-- Yönetici parolasıyla herhangi bir turnuvayı sil
create or replace function public.admin_delete_tournament(p_id uuid, p_password text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.app_admin%rowtype;
begin
  select * into a from public.app_admin where id = 1 for update;
  if not found or a.master_hash is null or a.failures >= 10 then
    return false;
  end if;
  if p_password is null or extensions.crypt(p_password, a.master_hash) <> a.master_hash then
    update public.app_admin set failures = failures + 1 where id = 1;
    return false;
  end if;
  delete from public.tournaments where id = p_id;
  return found;
end;
$$;

revoke all on function public.verify_master(text) from public;
revoke all on function public.admin_delete_tournament(uuid, text) from public;
grant execute on function public.verify_master(text) to anon, authenticated;
grant execute on function public.admin_delete_tournament(uuid, text) to anon, authenticated;
