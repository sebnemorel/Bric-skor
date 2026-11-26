-- =====================================================================
-- Briç Skor Akdeniz · 3. güncelleme: 4 çiftlik (2 masa) Howell turnuvaları
--
-- Daha önce schema.sql ve 02_pairs.sql'i çalıştırdıysan SADECE bu dosyayı çalıştır.
-- Turnuva tablosundaki "en az 5 çift" kuralını "en az 4 çift" yapar. Tekrar çalıştırılması zararsızdır.
-- =====================================================================

alter table public.tournaments drop constraint if exists tournaments_pair_count_check;
alter table public.tournaments add constraint tournaments_pair_count_check check (pair_count between 4 and 60);
