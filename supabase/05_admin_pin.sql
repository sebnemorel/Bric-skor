-- =====================================================================
-- Briç Skor Akdeniz · 5. güncelleme: hakem şifresi
--
-- Önceki dosyaları (schema, 02, 03, 04) çalıştırdıysan SADECE bu dosyayı çalıştır.
-- Tekrar çalıştırılması zararsızdır.
--
-- Turnuvayı kuran kişi isteğe bağlı bir hakem şifresi (4-6 rakam) belirleyebilir.
-- Telefon değişse ya da "Bu telefondan çık" dense bile, kodla katılıp bu şifreyle
-- yönetici yetkisi geri alınır. Şifre açık tutulmaz (bcrypt ile şifrelenir).
-- Tahmin denemelerine karşı: 10 yanlış denemeden sonra şifre kilitlenir
-- (kilidi açmak için: update public.tournaments set pin_failures = 0 where code = 'KOD';).
-- =====================================================================

alter table public.tournaments add column if not exists pin_hash text;
alter table public.tournaments add column if not exists pin_failures int not null default 0;

-- Turnuva oluşturma: isteğe bağlı hakem şifresiyle
drop function if exists public.create_tournament(text, text, int, int, text, text);

create or replace function public.create_tournament(
  p_name text,
  p_date text,
  p_pair_count int,
  p_boards_per_round int,
  p_admin_secret text,
  p_movement text default null,
  p_pin text default null
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
  if p_pin is not null and p_pin !~ '^[0-9]{4,6}$' then
    raise exception 'Hakem şifresi 4-6 rakam olmalı';
  end if;

  loop
    v_code := '';
    for i in 1..6 loop
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.tournaments t where t.code = v_code);
  end loop;

  insert into public.tournaments (code, name, date, pair_count, boards_per_round, admin_hash, movement, pin_hash)
  values (
    v_code,
    trim(p_name),
    p_date,
    p_pair_count,
    p_boards_per_round,
    encode(extensions.digest(p_admin_secret, 'sha256'), 'hex'),
    p_movement,
    case when p_pin is null then null else extensions.crypt(p_pin, extensions.gen_salt('bf')) end
  )
  returning id into v_id;

  return json_build_object('id', v_id, 'code', v_code);
end;
$$;

-- Şifre doğru mu? (yanlışları sayar, 10'da kilitler)
-- Döner: { ok: bool, locked: bool, hasPin: bool }
create or replace function public.verify_admin_pin(p_code text, p_pin text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.tournaments%rowtype;
begin
  select * into t from public.tournaments where code = upper(trim(p_code)) for update;
  if not found then
    return json_build_object('ok', false, 'locked', false, 'hasPin', false);
  end if;
  if t.pin_hash is null then
    return json_build_object('ok', false, 'locked', false, 'hasPin', false);
  end if;
  if t.pin_failures >= 10 then
    return json_build_object('ok', false, 'locked', true, 'hasPin', true);
  end if;
  if p_pin is not null and extensions.crypt(p_pin, t.pin_hash) = t.pin_hash then
    update public.tournaments set pin_failures = 0 where id = t.id;
    return json_build_object('ok', true, 'locked', false, 'hasPin', true);
  end if;
  update public.tournaments set pin_failures = pin_failures + 1 where id = t.id;
  return json_build_object('ok', false, 'locked', t.pin_failures + 1 >= 10, 'hasPin', true);
end;
$$;

-- Turnuvayı sil: kuran cihazın gizli anahtarıyla YA DA hakem şifresiyle
create or replace function public.delete_tournament(p_id uuid, p_admin_secret text)
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
    delete from public.tournaments where id = t.id;
    return true;
  end if;

  if t.pin_hash is not null then
    update public.tournaments set pin_failures = pin_failures + 1 where id = t.id;
  end if;
  return false;
end;
$$;

revoke all on function public.create_tournament(text, text, int, int, text, text, text) from public;
revoke all on function public.verify_admin_pin(text, text) from public;
revoke all on function public.delete_tournament(uuid, text) from public;
grant execute on function public.create_tournament(text, text, int, int, text, text, text) to anon, authenticated;
grant execute on function public.verify_admin_pin(text, text) to anon, authenticated;
grant execute on function public.delete_tournament(uuid, text) to anon, authenticated;
