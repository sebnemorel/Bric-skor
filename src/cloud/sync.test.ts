import { describe, expect, it } from 'vitest'
import { resultKey, type BoardResult, type Results } from '../tournament/results'
import { applyRemoteChange, fromRow, isValidCode, mergeResults, normalizeCode, toRow, type Pending } from './sync'

const res = (board: number, ns: number, nsScore: number, extra: Partial<BoardResult> = {}): BoardResult => ({
  board, ns, ew: ns, round: 1, table: ns, passed: false, nsScore, enteredAt: 1_700_000_000_000,
  contract: { level: 4, strain: 'S', doubling: '' }, declarer: 'S', tricks: 10, ...extra,
})

describe('satır dönüşümü', () => {
  it('gidiş-dönüş aynı sonucu verir', () => {
    const r = res(3, 2, 420)
    expect(fromRow(toRow('t1', r, 'tel'))).toEqual(r)
  })

  it('pas da korunur', () => {
    const r: BoardResult = { board: 1, ns: 1, ew: 1, round: 1, table: 1, passed: true, nsScore: 0, enteredAt: 1_700_000_000_000 }
    const row = toRow('t1', r, 'tel')
    expect(row.contract).toBeNull()
    expect(fromRow(row)).toEqual(r)
  })
})

describe('birleştirme', () => {
  const server: Results = {
    [resultKey(1, 1)]: res(1, 1, 420),
    [resultKey(2, 1)]: res(2, 1, 170),
  }

  it('bekleyen ekleme/güncelleme sunucunun üzerine yazar', () => {
    const pending: Pending = { [resultKey(1, 1)]: res(1, 1, 450), [resultKey(3, 1)]: res(3, 1, -50) }
    const m = mergeResults(server, pending)
    expect(m[resultKey(1, 1)].nsScore).toBe(450)
    expect(m[resultKey(3, 1)].nsScore).toBe(-50)
    expect(Object.keys(m)).toHaveLength(3)
  })

  it('bekleyen silme sunucudakini kaldırır', () => {
    const m = mergeResults(server, { [resultKey(2, 1)]: null })
    expect(m[resultKey(2, 1)]).toBeUndefined()
  })

  it('canlı değişiklik uygulanır', () => {
    const next = applyRemoteChange(server, {}, { type: 'upsert', row: toRow('t', res(5, 3, 600), 'x') })
    expect(next[resultKey(5, 3)].nsScore).toBe(600)
    const del = applyRemoteChange(next, {}, { type: 'delete', board: 1, ns: 1 })
    expect(del[resultKey(1, 1)]).toBeUndefined()
  })

  it('gönderilmemiş yerel değişiklik canlı gelenden önceliklidir', () => {
    const pending: Pending = { [resultKey(1, 1)]: res(1, 1, 999) }
    const local = mergeResults(server, pending)
    const next = applyRemoteChange(local, pending, { type: 'upsert', row: toRow('t', res(1, 1, 100), 'x') })
    expect(next[resultKey(1, 1)].nsScore).toBe(999)
  })
})

describe('turnuva kodu', () => {
  it('düzeltme ve doğrulama', () => {
    expect(normalizeCode(' kx4p-92 ')).toBe('KX4P92')
    expect(isValidCode('KX4P92')).toBe(true)
    expect(isValidCode('KX4P9')).toBe(false)
    expect(isValidCode('KX4PO2')).toBe(false) // O harfi kullanılmıyor
  })
})
