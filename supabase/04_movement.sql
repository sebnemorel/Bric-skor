-- =====================================================================
-- Briç Skor Akdeniz · 4. güncelleme: hareket türü (Sabit masalar / Howell / Mitchell)
--
-- Önceki dosyaları (schema, 02, 03) çalıştırdıysan SADECE bu dosyayı çalıştır.
-- Tekrar çalıştırılması zararsızdır.
-- =====================================================================

-- Hareket türü (eski turnuvalarda boş kalır; uygulama çift sayısına göre seçer)
alter table public.tournaments add column if not exists movement text;
alter table public.tournaments drop constraint if exists tournaments_movement_check;
alter table public.tournaments add constraint tournaments_movement_check
  check (movement is null or movement in ('stationary', 'howell', 'mitchell'));

-- Sabit masalarda tek turda 36'ya kadar board oynanabilir
alter table public.tournaments drop constraint if exists tournaments_boards_per_round_check;
alter table public.tournaments add constraint tournaments_boards_per_round_check
  check (boards_per_round between 1 and 40);

-- Turnuva oluşturma: hareket türünü de kaydeder (eski 5 parametreli sürümü kaldır)
drop function if exists public.create_tournament(text, text, int, int, text);

create or replace function public.create_tournament(
  p_name text,
  p_date text,
  p_pair_count int,
  p_boards_per_round int,
  p_admin_secret text,
  p_movement text default null
) returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
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

  insert into public.tournaments (code, name, date, pair_count, boards_per_round, admin_hash, movement)
  values (
    v_code,
    trim(p_name),
    p_date,
    p_pair_count,
    p_boards_per_round,
    encode(extensions.digest(p_admin_secret, 'sha256'), 'hex'),
    p_movement
  )
  returning id into v_id;

  return json_build_object('id', v_id, 'code', v_code);
end;
$$;

-- Kodla katılma: hareket türünü de döner
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
    'createdAt', t.created_at
  )
  from public.tournaments t
  where t.code = upper(trim(p_code));
$$;

revoke all on function public.create_tournament(text, text, int, int, text, text) from public;
revoke all on function public.join_tournament(text) from public;
grant execute on function public.create_tournament(text, text, int, int, text, text) to anon, authenticated;
grant execute on function public.join_tournament(text) to anon, authenticated;
