-- =====================================================================
-- Briç Skor Akdeniz · 8. güncelleme: rakip onayı ve skor kilidi (Bridgemate mantığı)
--
-- 07'yi çalıştırdıysan SADECE bu dosyayı çalıştır. Tekrar çalıştırılması zararsızdır.
--
-- - Skor rakip onaylayınca kaydedilir ve kilitlenir: oyuncular artık değiştiremez/silemez.
-- - Turnuva açıkken onaylı skoru sadece hakem değiştirir (hakem anahtarı ya da hakem şifresi).
-- - Turnuva bittikten sonra sadece kulüp yöneticisi parolasıyla değişir.
-- - vul: deklaran kırmızı mı (true) / yeşil mi (false); null = seçilmedi (yeşil sayıldı).
-- =====================================================================

alter table public.results add column if not exists vul boolean;
alter table public.results add column if not exists confirmed boolean not null default false;

-- Bu güncellemeden önce girilmiş skorlar da onaylı sayılır.
update public.results set confirmed = true where not confirmed;

-- Oyuncular: yeni skor ekleyebilir; onaylanmış skoru değiştiremez ve silemez.
drop policy if exists "sonuclar guncellenir" on public.results;
drop policy if exists "sonuclar silinir"     on public.results;
create policy "sonuclar guncellenir" on public.results for update to anon, authenticated
  using (public.tournament_open(tournament_id) and not confirmed)
  with check (public.tournament_open(tournament_id));
create policy "sonuclar silinir" on public.results for delete to anon, authenticated
  using (public.tournament_open(tournament_id) and not confirmed);

-- Ortak yardımcı: bir skoru yazar (p_row null ise siler). Dışarıya açık değil.
create or replace function public._write_result(p_id uuid, p_board int, p_ns int, p_row jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_row is null or jsonb_typeof(p_row) <> 'object' then
    delete from public.results where tournament_id = p_id and board = p_board and ns = p_ns;
    return;
  end if;

  insert into public.results
    (tournament_id, board, ns, ew, round, table_no, passed, contract, declarer, tricks, ns_score, vul, confirmed, entered_at, device_id)
  values (
    p_id, p_board, p_ns,
    (p_row->>'ew')::int,
    (p_row->>'round')::int,
    (p_row->>'table_no')::int,
    coalesce((p_row->>'passed')::boolean, false),
    case when jsonb_typeof(p_row->'contract') = 'object' then p_row->'contract' end,
    p_row->>'declarer',
    (p_row->>'tricks')::int,
    (p_row->>'ns_score')::int,
    (p_row->>'vul')::boolean,
    true,
    now(),
    left(p_row->>'device_id', 64)
  )
  on conflict (tournament_id, board, ns) do update set
    ew = excluded.ew,
    round = excluded.round,
    table_no = excluded.table_no,
    passed = excluded.passed,
    contract = excluded.contract,
    declarer = excluded.declarer,
    tricks = excluded.tricks,
    ns_score = excluded.ns_score,
    vul = excluded.vul,
    confirmed = true,
    entered_at = excluded.entered_at,
    device_id = excluded.device_id;
end;
$$;
revoke all on function public._write_result(uuid, int, int, jsonb) from public, anon, authenticated;

-- Hakem: turnuva açıkken herhangi bir skoru yazar/siler.
create or replace function public.admin_write_result(p_id uuid, p_secret text, p_board int, p_ns int, p_row jsonb)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.tournaments%rowtype;
begin
  select * into t from public.tournaments where id = p_id for update;
  if not found or t.finished_at is not null or t.created_at <= now() - interval '24 hours' then
    return false;
  end if;

  if t.admin_hash = encode(extensions.digest(coalesce(p_secret, ''), 'sha256'), 'hex')
     or (t.pin_hash is not null and t.pin_failures < 10
         and extensions.crypt(coalesce(p_secret, ''), t.pin_hash) = t.pin_hash) then
    perform public._write_result(p_id, p_board, p_ns, p_row);
    return true;
  end if;

  if t.pin_hash is not null then
    update public.tournaments set pin_failures = pin_failures + 1 where id = t.id;
  end if;
  return false;
end;
$$;

-- Kulüp yöneticisi: her zaman (bitmiş turnuvada da) herhangi bir skoru yazar/siler.
create or replace function public.master_write_result(p_id uuid, p_password text, p_board int, p_ns int, p_row jsonb)
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
  if not exists (select 1 from public.tournaments where id = p_id) then
    return false;
  end if;
  perform public._write_result(p_id, p_board, p_ns, p_row);
  return true;
end;
$$;

revoke all on function public.admin_write_result(uuid, text, int, int, jsonb) from public;
revoke all on function public.master_write_result(uuid, text, int, int, jsonb) from public;
grant execute on function public.admin_write_result(uuid, text, int, int, jsonb) to anon, authenticated;
grant execute on function public.master_write_result(uuid, text, int, int, jsonb) to anon, authenticated;
