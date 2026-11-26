-- =====================================================================
-- Briç Skor Akdeniz · 9. güncelleme: yönetici güvenlik sorusu
--
-- 08'i çalıştırdıysan SADECE bu dosyayı çalıştır. Tekrar çalıştırılması zararsızdır.
--
-- Parolayı bilen biri de, arşivde silme / skor düzeltme kaydedilmeden önce
-- güvenlik sorusunu doğru cevaplamak zorundadır. Büyük/küçük harf önemsizdir.
--
-- ÖNEMLİ: Cevabın kendisi bu dosyada YOK. Ayrı bir komutla, sadece Supabase SQL Editor'de
-- ayarlanır (bkz. README). Yanlış cevaplar da yanlış parola gibi sayılır; 10'da kilitlenir.
-- =====================================================================

alter table public.app_admin add column if not exists answer_hash text;

-- Cevabı karşılaştırmadan önce düzenler: baştaki/sondaki boşluk yok, Türkçe küçük harf.
create or replace function public.norm_answer(p text)
returns text
language sql
immutable
set search_path = ''
as $$
  -- Türkçe harfler elle çevrilir (sunucunun dil ayarından bağımsız olsun diye)
  select lower(translate(trim(coalesce(p, '')), 'İIÇĞÖŞÜÂÎÛ', 'iıçğöşüâîû'));
$$;
revoke all on function public.norm_answer(text) from public, anon, authenticated;

-- Parola + güvenlik cevabı kontrolü: 'ok' | 'wrong' | 'locked' | 'unconfigured'
create or replace function public._check_master(p_password text, p_answer text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.app_admin%rowtype;
begin
  select * into a from public.app_admin where id = 1 for update;
  if not found or a.master_hash is null or a.answer_hash is null then
    return 'unconfigured';
  end if;
  if a.failures >= 10 then
    return 'locked';
  end if;
  if p_password is not null
     and extensions.crypt(p_password, a.master_hash) = a.master_hash
     and extensions.crypt(public.norm_answer(p_answer), a.answer_hash) = a.answer_hash then
    update public.app_admin set failures = 0 where id = 1;
    return 'ok';
  end if;
  update public.app_admin set failures = failures + 1 where id = 1;
  return case when a.failures + 1 >= 10 then 'locked' else 'wrong' end;
end;
$$;
revoke all on function public._check_master(text, text) from public, anon, authenticated;

-- Arşivdeki soru penceresi için: parola + cevap doğru mu?
create or replace function public.verify_master_answer(p_password text, p_answer text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  r text := public._check_master(p_password, p_answer);
begin
  return json_build_object('ok', r = 'ok', 'locked', r = 'locked', 'configured', r <> 'unconfigured');
end;
$$;

-- Eski (sadece parolalı) sürümleri kaldır
drop function if exists public.admin_delete_tournament(uuid, text);
drop function if exists public.master_write_result(uuid, text, int, int, jsonb);

create or replace function public.admin_delete_tournament(p_id uuid, p_password text, p_answer text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public._check_master(p_password, p_answer) <> 'ok' then
    return false;
  end if;
  delete from public.tournaments where id = p_id;
  return found;
end;
$$;

create or replace function public.master_write_result(p_id uuid, p_password text, p_answer text, p_board int, p_ns int, p_row jsonb)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public._check_master(p_password, p_answer) <> 'ok' then
    return false;
  end if;
  if not exists (select 1 from public.tournaments where id = p_id) then
    return false;
  end if;
  perform public._write_result(p_id, p_board, p_ns, p_row);
  return true;
end;
$$;

revoke all on function public.verify_master_answer(text, text) from public;
revoke all on function public.admin_delete_tournament(uuid, text, text) from public;
revoke all on function public.master_write_result(uuid, text, text, int, int, jsonb) from public;
grant execute on function public.verify_master_answer(text, text) to anon, authenticated;
grant execute on function public.admin_delete_tournament(uuid, text, text) to anon, authenticated;
grant execute on function public.master_write_result(uuid, text, text, int, int, jsonb) to anon, authenticated;
