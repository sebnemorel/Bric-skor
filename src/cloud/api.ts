// Supabase ile konuşan kısım. Ortam değişkenleri yoksa uygulama "sadece bu telefon" modunda çalışır.

import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js'
import type { MovementKind } from '../tournament/movement'
import type { PairInfo, PairNames, PlayerCategory } from '../tournament/pairs'
import { resultKey, type BoardResult, type Results } from '../tournament/results'
import { fromRow, pairFromRow, pairToRow, toRow, type PairRow, type ResultRow } from './sync'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const cloudEnabled = Boolean(url && key)

let client: SupabaseClient | null = null
function db(): SupabaseClient {
  if (!cloudEnabled) throw new Error('Bulut bağlantısı ayarlı değil')
  client ??= createClient(url!, key!, { auth: { persistSession: false } })
  return client
}

/** Turnuva bitirilmiş, skorlar kilitli (sunucu yazmayı reddetti). */
export class LockedError extends Error {}

export interface ArchiveEntry {
  id: string
  name: string
  date: string
  pairCount: number
  boardsPerRound: number
  movement: MovementKind | null
  createdAt: string
  finishedAt: string | null // null = devam ediyor
}

export interface CloudTournament {
  id: string
  code: string
  name: string
  date: string
  pairCount: number
  boardsPerRound: number
  movement?: MovementKind | null
  finishedAt?: string | null
}

/** Bu cihaza özel kalıcı bir kimlik (kimin skor girdiğini ayırt etmek için). */
export function deviceId(): string {
  const KEY = 'bric-skor:device-id'
  try {
    let id = localStorage.getItem(KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(KEY, id)
    }
    return id
  } catch {
    return 'bilinmeyen'
  }
}

export function newAdminSecret(): string {
  return crypto.randomUUID() + crypto.randomUUID()
}

/** Supabase hatasını kullanıcıya anlaşılır bir mesaja çevirir. */
export function explainError(message: string, error: unknown): string {
  const e = (error ?? {}) as { code?: string; message?: string; name?: string }
  const text = `${e.message ?? ''}`
  // Sunucu fonksiyonu tanımıyor → bir SQL güncellemesi çalıştırılmamış
  if (e.code === 'PGRST202' || e.code === 'PGRST204' || e.code === '42883' || /could not find the function/i.test(text)) {
    return `${message} Sunucu güncel değil: Supabase'de supabase klasöründeki son SQL dosyası çalıştırılmamış olabilir.`
  }
  // Veritabanı kuralına takıldı (ör. geçersiz şifre, çift sayısı)
  if (e.code === 'P0001' || e.code === '23514') {
    return `${message} ${text.includes('rakam') ? 'Hakem şifresi 4-6 rakam olmalı.' : 'Sunucu bu ayarları kabul etmedi; SQL güncellemelerinin hepsi çalıştırıldı mı?'}`
  }
  if (e.name === 'TypeError' || /failed to fetch|network/i.test(text)) {
    return `${message} İnternet bağlantını kontrol et.`
  }
  return message
}

function fail(message: string, error: unknown): never {
  console.error(message, error)
  if ((error as { code?: string } | null)?.code === '42501') {
    throw new LockedError('Bu skor kilitli: onaylanmış ya da turnuva bitmiş.')
  }
  throw new Error(explainError(message, error))
}

export async function createTournament(input: {
  name: string
  date: string
  pairCount: number
  boardsPerRound: number
  movement?: MovementKind
  adminSecret: string
  pin?: string
}): Promise<{ id: string; code: string }> {
  const { data, error } = await db().rpc('create_tournament', {
    p_name: input.name,
    p_date: input.date,
    p_pair_count: input.pairCount,
    p_boards_per_round: input.boardsPerRound,
    p_admin_secret: input.adminSecret,
    p_movement: input.movement ?? null,
    p_pin: input.pin || null,
  })
  if (error || !data) fail('Turnuva oluşturulamadı.', error)
  return data as { id: string; code: string }
}

export async function joinTournament(code: string): Promise<CloudTournament | null> {
  const { data, error } = await db().rpc('join_tournament', { p_code: code })
  if (error) fail('Sunucuya ulaşılamadı.', error)
  return (data as CloudTournament | null) ?? null
}

export async function deleteTournament(id: string, adminSecret: string): Promise<boolean> {
  const { data, error } = await db().rpc('delete_tournament', { p_id: id, p_admin_secret: adminSecret })
  if (error) fail('Turnuva silinemedi.', error)
  return data === true
}

/** Turnuvayı bitirir (ya da finished=false ile yeniden açar). Kuran cihazın anahtarı ya da hakem şifresi gerekir. */
export async function finishTournament(id: string, adminSecret: string, finished = true): Promise<boolean> {
  const { data, error } = await db().rpc('finish_tournament', { p_id: id, p_admin_secret: adminSecret, p_finished: finished })
  if (error) fail('Turnuva bitirilemedi.', error)
  return data === true
}

/** Kulüp arşivi: biten turnuvalar, en yeni önce. */
export async function listArchive(): Promise<ArchiveEntry[]> {
  const { data, error } = await db().rpc('list_archive')
  if (error) fail('Arşiv alınamadı.', error)
  return (data as ArchiveEntry[] | null) ?? []
}

// ---------------- Kayıtlı oyuncular ve hakem şifresi ----------------

export interface Player {
  mpNo: string
  name: string
  categories: PlayerCategory[]
}

export type AuthResult = { ok: boolean; locked: boolean; configured: boolean }

/** Kulüp hakem şifresini (ya da yönetici parolasını) doğrular. */
export async function verifyTd(password: string): Promise<AuthResult> {
  const { data, error } = await db().rpc('td_verify', { p_password: password })
  if (error) fail('Şifre kontrol edilemedi.', error)
  return data as AuthResult
}

export async function listPlayers(): Promise<Player[]> {
  const { data, error } = await db().from('players').select('mp_no,name,categories').order('name').limit(5000)
  if (error) fail('Oyuncu listesi alınamadı.', error)
  return (data as { mp_no: string; name: string; categories: PlayerCategory[] | null }[]).map(r => ({
    mpNo: r.mp_no,
    name: r.name,
    categories: r.categories ?? [],
  }))
}

export async function upsertPlayer(password: string, p: Player): Promise<boolean> {
  const { data, error } = await db().rpc('td_upsert_player', {
    p_password: password,
    p_mp_no: p.mpNo,
    p_name: p.name,
    p_categories: p.categories,
  })
  if (error) fail('Oyuncu kaydedilemedi.', error)
  return data === true
}

export async function deletePlayer(password: string, mpNo: string): Promise<boolean> {
  const { data, error } = await db().rpc('td_delete_player', { p_password: password, p_mp_no: mpNo })
  if (error) fail('Oyuncu silinemedi.', error)
  return data === true
}

/** Toplu ekleme; kaydedilen oyuncu sayısını döner (şifre yanlışsa -1). */
export async function importPlayers(password: string, players: Player[]): Promise<number> {
  const { data, error } = await db().rpc('td_import_players', {
    p_password: password,
    p_rows: players.map(p => ({ mp_no: p.mpNo, name: p.name, categories: p.categories })),
  })
  if (error) fail('Oyuncular eklenemedi.', error)
  return data as number
}

// ---------------- Tur süresi ----------------

type TimerRow = { round: number; roundMinutes: number; endsAt: string | null; remainingSec: number | null }

/** Turnuvanın süresini ve sunucu saatini getirir (süre yoksa timer null). */
export async function getTimer(tournamentId: string): Promise<{ timer: TimerRow | null; now: string }> {
  const { data, error } = await db().rpc('get_timer', { p_id: tournamentId })
  if (error) fail('Süre alınamadı.', error)
  return data as { timer: TimerRow | null; now: string }
}

/** Hakem: süreyi ayarlar (running ise şimdi başlar ve seconds sonra biter, değilse durur). */
export async function setTimer(
  tournamentId: string,
  secret: string,
  c: { round: number; minutes: number; running: boolean; seconds: number },
): Promise<boolean> {
  const { data, error } = await db().rpc('td_set_timer', {
    p_id: tournamentId,
    p_secret: secret,
    p_round: c.round,
    p_minutes: c.minutes,
    p_running: c.running,
    p_seconds: Math.round(c.seconds),
  })
  if (error) fail('Süre ayarlanamadı.', error)
  return data === true
}

/** Süre değişikliklerini canlı dinler. */
export function subscribeTimer(tournamentId: string, onChange: (row: TimerRow) => void): () => void {
  const channel: RealtimeChannel = db()
    .channel(`timer:${tournamentId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'timers', filter: `tournament_id=eq.${tournamentId}` },
      payload => {
        if (payload.eventType === 'DELETE') return
        const r = payload.new as { round: number; round_minutes: number; ends_at: string | null; remaining_sec: number | null }
        onChange({ round: r.round, roundMinutes: r.round_minutes, endsAt: r.ends_at, remainingSec: r.remaining_sec })
      },
    )
    .subscribe()
  return () => {
    void db().removeChannel(channel)
  }
}

/** Kulüp yöneticisi parolasını doğrular (yanlışlar sunucuda sayılır, 10'da kilitlenir). */
export async function verifyMaster(password: string): Promise<{ ok: boolean; locked: boolean; configured: boolean }> {
  const { data, error } = await db().rpc('verify_master', { p_password: password })
  if (error) fail('Parola kontrol edilemedi.', error)
  return data as { ok: boolean; locked: boolean; configured: boolean }
}

/** Güvenlik sorusu: parola + cevap doğru mu? (yanlışlar sunucuda sayılır) */
export async function verifyMasterAnswer(password: string, answer: string): Promise<{ ok: boolean; locked: boolean; configured: boolean }> {
  const { data, error } = await db().rpc('verify_master_answer', { p_password: password, p_answer: answer })
  if (error) fail('Cevap kontrol edilemedi.', error)
  return data as { ok: boolean; locked: boolean; configured: boolean }
}

/** Yönetici parolası + güvenlik cevabıyla arşivdeki herhangi bir turnuvayı siler. */
export async function adminDeleteTournament(id: string, password: string, answer: string): Promise<boolean> {
  const { data, error } = await db().rpc('admin_delete_tournament', { p_id: id, p_password: password, p_answer: answer })
  if (error) fail('Turnuva silinemedi.', error)
  return data === true
}

/** Hakem şifresini doğrular (yanlış denemeler sunucuda sayılır, 10'da kilitlenir). */
export async function verifyAdminPin(code: string, pin: string): Promise<{ ok: boolean; locked: boolean; hasPin: boolean }> {
  const { data, error } = await db().rpc('verify_admin_pin', { p_code: code, p_pin: pin })
  if (error) fail('Şifre kontrol edilemedi.', error)
  return data as { ok: boolean; locked: boolean; hasPin: boolean }
}

export async function fetchResults(tournamentId: string): Promise<Results> {
  const { data, error } = await db().from('results').select('*').eq('tournament_id', tournamentId)
  if (error) fail('Skorlar alınamadı.', error)
  const results: Results = {}
  for (const row of data as ResultRow[]) results[resultKey(row.board, row.ns)] = fromRow(row)
  return results
}

export async function upsertResult(tournamentId: string, r: BoardResult): Promise<void> {
  const { error } = await db()
    .from('results')
    .upsert(toRow(tournamentId, r, deviceId()), { onConflict: 'tournament_id,board,ns' })
  if (error) fail('Skor gönderilemedi.', error)
}

/** Hakem: turnuva açıkken herhangi bir skoru yazar (r = null → siler). */
export async function adminWriteResult(tournamentId: string, secret: string, board: number, ns: number, r: BoardResult | null): Promise<boolean> {
  const { data, error } = await db().rpc('admin_write_result', {
    p_id: tournamentId,
    p_secret: secret,
    p_board: board,
    p_ns: ns,
    p_row: r ? toRow(tournamentId, r, deviceId()) : null,
  })
  if (error) fail('Skor gönderilemedi.', error)
  return data === true
}

/** Kulüp yöneticisi: her zaman (bitmiş turnuvada da) herhangi bir skoru yazar (r = null → siler). */
export async function masterWriteResult(
  tournamentId: string,
  password: string,
  answer: string,
  board: number,
  ns: number,
  r: BoardResult | null,
): Promise<boolean> {
  const { data, error } = await db().rpc('master_write_result', {
    p_id: tournamentId,
    p_password: password,
    p_answer: answer,
    p_board: board,
    p_ns: ns,
    p_row: r ? toRow(tournamentId, r, deviceId()) : null,
  })
  if (error) fail('Skor kaydedilemedi.', error)
  return data === true
}

export async function deleteResult(tournamentId: string, board: number, ns: number): Promise<void> {
  const { error } = await db()
    .from('results')
    .delete()
    .eq('tournament_id', tournamentId)
    .eq('board', board)
    .eq('ns', ns)
  if (error) fail('Skor silinemedi.', error)
}

export async function fetchPairs(tournamentId: string): Promise<PairNames> {
  const { data, error } = await db().from('pairs').select('*').eq('tournament_id', tournamentId)
  if (error) fail('İsimler alınamadı.', error)
  const names: PairNames = {}
  for (const row of data as PairRow[]) {
    const { key, info } = pairFromRow(row)
    names[key] = info
  }
  return names
}

export async function upsertPair(tournamentId: string, key: string, p: PairInfo): Promise<void> {
  const { error } = await db()
    .from('pairs')
    .upsert({ ...pairToRow(tournamentId, key, p), updated_at: new Date().toISOString() }, { onConflict: 'tournament_id,side,number' })
  if (error) fail('İsim gönderilemedi.', error)
}

export type RemoteChange = { type: 'upsert'; row: ResultRow } | { type: 'delete'; board: number; ns: number }
export type RemotePairChange = { key: string; info: PairInfo }

/** Bu turnuvanın sonuçlarındaki değişiklikleri canlı dinler. Dönen fonksiyon dinlemeyi bitirir. */
export function subscribeResults(
  tournamentId: string,
  onChange: (c: RemoteChange) => void,
  onStatus: (connected: boolean) => void,
  onPair?: (c: RemotePairChange) => void,
): () => void {
  const channel: RealtimeChannel = db()
    .channel(`results:${tournamentId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'results', filter: `tournament_id=eq.${tournamentId}` },
      payload => {
        if (payload.eventType === 'DELETE') {
          const old = payload.old as Partial<ResultRow>
          // silme olayları filtrelenemez; başka turnuvaya aitse yok say
          if (old.tournament_id && old.tournament_id !== tournamentId) return
          if (old.board && old.ns) onChange({ type: 'delete', board: old.board, ns: old.ns })
        } else {
          onChange({ type: 'upsert', row: payload.new as ResultRow })
        }
      },
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'pairs', filter: `tournament_id=eq.${tournamentId}` },
      payload => {
        if (payload.eventType === 'DELETE' || !onPair) return
        onPair(pairFromRow(payload.new as PairRow))
      },
    )
    .subscribe(status => onStatus(status === 'SUBSCRIBED'))

  return () => {
    void db().removeChannel(channel)
  }
}
