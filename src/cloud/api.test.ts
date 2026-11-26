import { describe, expect, it } from 'vitest'
import { explainError } from './api'

describe('anlaşılır hata mesajları', () => {
  it('eksik SQL güncellemesi', () => {
    expect(explainError('Turnuva oluşturulamadı.', { code: 'PGRST202', message: 'Could not find the function' })).toMatch(
      /SQL dosyası çalıştırılmamış/,
    )
  })
  it('internet yok', () => {
    expect(explainError('X.', { name: 'TypeError', message: 'Failed to fetch' })).toMatch(/İnternet/)
  })
  it('geçersiz şifre', () => {
    expect(explainError('X.', { code: 'P0001', message: 'Hakem şifresi 4-6 rakam olmalı' })).toMatch(/4-6 rakam/)
  })
  it('bilinmeyen hata: mesaj aynen', () => {
    expect(explainError('X.', { code: '???' })).toBe('X.')
  })
})
