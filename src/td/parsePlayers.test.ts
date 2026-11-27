import { describe, expect, it } from 'vitest'
import { cleanPlayerCategories, pairCategoriesFromPlayers } from '../tournament/pairs'
import { parseCategory, parsePlayers } from './parsePlayers'

describe('oyuncu listesi yapıştırma', () => {
  it('Excel (sekme), noktalı virgül ve virgül; birden fazla kategori', () => {
    const { players, errors } = parsePlayers(
      '1234\tAyşe Yılmaz\tKadın\n200; Mehmet Kaya ; erkek senyör\n301,Ali Can,Erkek,Genç\n302\tSelin Su\tKadın / Senyör\n303;Veli Er',
    )
    expect(errors).toEqual([])
    expect(players).toEqual([
      { mpNo: '1234', name: 'Ayşe Yılmaz', categories: ['Kadın'] },
      { mpNo: '200', name: 'Mehmet Kaya', categories: ['Erkek', 'Senyör'] },
      { mpNo: '301', name: 'Ali Can', categories: ['Erkek', 'Genç'] },
      { mpNo: '302', name: 'Selin Su', categories: ['Kadın', 'Senyör'] },
      { mpNo: '303', name: 'Veli Er', categories: [] },
    ])
  })

  it('başlık atlanır, hatalar satır numarasıyla bildirilir', () => {
    const { players, errors } = parsePlayers('Numara;İsim;Kategori\n12;Zeynep\nSadece isim\n12;Tekrar\n13;Can;Kadın Erkek')
    expect(players).toHaveLength(1)
    expect(errors).toEqual([
      '3. satır: master point numarası bulunamadı',
      '4. satır: 12 numarası listede iki kez var',
      '5. satır: hem Kadın hem Erkek yazılmış',
    ])
  })

  it('kategori kısaltmaları', () => {
    expect(parseCategory('K')).toBe('Kadın')
    expect(parseCategory('erkek')).toBe('Erkek')
    expect(parseCategory('Genc')).toBe('Genç')
    expect(parseCategory('')).toBeNull()
    expect(parseCategory('xyz')).toBeUndefined()
  })
})

describe('kategoriler', () => {
  it('oyuncu: Kadın ve Erkek birlikte olamaz, son seçilen kalır', () => {
    expect(cleanPlayerCategories(['Genç', 'Kadın', 'Erkek'], 'Erkek')).toEqual(['Erkek', 'Genç'])
    expect(cleanPlayerCategories(['Senyör', 'Kadın', 'Senyör'])).toEqual(['Kadın', 'Senyör'])
  })

  it('çift: oyunculardan hesaplanır, birden fazla olabilir', () => {
    expect(pairCategoriesFromPlayers(['Kadın'], ['Kadın'])).toEqual(['Kadın'])
    expect(pairCategoriesFromPlayers(['Kadın'], ['Erkek'])).toEqual(['Karışık'])
    expect(pairCategoriesFromPlayers(['Kadın', 'Senyör'], ['Kadın', 'Senyör'])).toEqual(['Kadın', 'Senyör'])
    expect(pairCategoriesFromPlayers(['Erkek', 'Genç'], ['Kadın', 'Genç'])).toEqual(['Karışık', 'Genç'])
    expect(pairCategoriesFromPlayers(['Erkek', 'Senyör'], ['Erkek'])).toEqual([])
    expect(pairCategoriesFromPlayers(['Kadın'], [])).toEqual([]) // misafir: cinsiyeti bilinmiyor
  })
})
