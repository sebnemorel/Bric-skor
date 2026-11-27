import { describe, expect, it } from 'vitest'
import { pairCategoryFromPlayers } from '../tournament/pairs'
import { parseCategory, parsePlayers } from './parsePlayers'

describe('oyuncu listesi yapıştırma', () => {
  it('Excel (sekme), noktalı virgül ve virgül', () => {
    const { players, errors } = parsePlayers('1234\tAyşe Yılmaz\tKadın\n200; Mehmet Kaya ; senyör\nAli Can,301')
    expect(errors).toEqual([])
    expect(players).toEqual([
      { mpNo: '1234', name: 'Ayşe Yılmaz', category: 'Kadın' },
      { mpNo: '200', name: 'Mehmet Kaya', category: 'Senyör' },
      { mpNo: '301', name: 'Ali Can', category: null },
    ])
  })

  it('başlık satırı atlanır, hatalar satır numarasıyla bildirilir', () => {
    const { players, errors } = parsePlayers('Numara;İsim;Kategori\n12;Zeynep\nSadece isim\n12;Tekrar')
    expect(players).toHaveLength(1)
    expect(errors).toEqual(['3. satır: master point numarası bulunamadı', '4. satır: 12 numarası listede iki kez var'])
  })

  it('kategori kısaltmaları', () => {
    expect(parseCategory('K')).toBe('Kadın')
    expect(parseCategory('Genc')).toBe('Genç')
    expect(parseCategory('')).toBeNull()
    expect(parseCategory('xyz')).toBeUndefined()
  })
})

describe('çift kategorisi', () => {
  it('oyunculardan hesaplanır', () => {
    expect(pairCategoryFromPlayers('Kadın', 'Kadın')).toBe('Kadın')
    expect(pairCategoryFromPlayers('Kadın', null)).toBe('Karışık')
    expect(pairCategoryFromPlayers('Senyör', 'Senyör')).toBe('Senyör')
    expect(pairCategoryFromPlayers('Senyör', null)).toBe('Açık')
    expect(pairCategoryFromPlayers('Kadın', 'Senyör')).toBe('Karışık')
    expect(pairCategoryFromPlayers(null, null)).toBe('Açık')
  })
})
