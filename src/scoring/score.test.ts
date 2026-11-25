import { describe, expect, it } from 'vitest'
import { boardInfo, isVulnerable, scoreContract, scoreForNS, type Contract } from './score'

const c = (level: Contract['level'], strain: Contract['strain'], doubling: Contract['doubling'] = ''): Contract => ({
  level,
  strain,
  doubling,
})

describe('yapılan kontratlar', () => {
  it('kısmi oyunlar', () => {
    expect(scoreContract(c(1, 'NT'), 7, false)).toBe(90)
    expect(scoreContract(c(2, 'H'), 8, false)).toBe(110)
    expect(scoreContract(c(2, 'C'), 8, true)).toBe(90)
    expect(scoreContract(c(3, 'D'), 9, false)).toBe(110)
  })

  it('oyunlar', () => {
    expect(scoreContract(c(3, 'NT'), 9, false)).toBe(400)
    expect(scoreContract(c(3, 'NT'), 9, true)).toBe(600)
    expect(scoreContract(c(4, 'S'), 10, false)).toBe(420)
    expect(scoreContract(c(4, 'S'), 10, true)).toBe(620)
    expect(scoreContract(c(5, 'C'), 11, true)).toBe(600)
  })

  it('fazla levéeler', () => {
    expect(scoreContract(c(3, 'NT'), 10, false)).toBe(430)
    expect(scoreContract(c(4, 'H'), 12, true)).toBe(680)
    expect(scoreContract(c(2, 'D'), 10, false)).toBe(130)
  })

  it('şlemler', () => {
    expect(scoreContract(c(6, 'S'), 12, false)).toBe(980)
    expect(scoreContract(c(6, 'S'), 12, true)).toBe(1430)
    expect(scoreContract(c(6, 'NT'), 12, true)).toBe(1440)
    expect(scoreContract(c(7, 'NT'), 13, false)).toBe(1520)
    expect(scoreContract(c(7, 'NT'), 13, true)).toBe(2220)
    expect(scoreContract(c(7, 'C'), 13, true)).toBe(2140)
  })

  it('kontrlü / rekontrlü yapılanlar', () => {
    expect(scoreContract(c(1, 'S', 'X'), 7, false)).toBe(160)
    expect(scoreContract(c(2, 'H', 'X'), 8, false)).toBe(470) // kontr oyuna çevirir
    expect(scoreContract(c(2, 'H', 'X'), 8, true)).toBe(670)
    expect(scoreContract(c(1, 'NT', 'XX'), 7, false)).toBe(560)
    expect(scoreContract(c(4, 'S', 'X'), 11, true)).toBe(990)
    expect(scoreContract(c(3, 'NT', 'XX'), 10, false)).toBe(1000)
  })
})

describe('batan kontratlar', () => {
  it('kontrsüz', () => {
    expect(scoreContract(c(4, 'S'), 9, false)).toBe(-50)
    expect(scoreContract(c(4, 'S'), 8, true)).toBe(-200)
  })

  it('kontrlü non-vulnerable', () => {
    expect(scoreContract(c(4, 'S', 'X'), 9, false)).toBe(-100)
    expect(scoreContract(c(4, 'S', 'X'), 8, false)).toBe(-300)
    expect(scoreContract(c(4, 'S', 'X'), 7, false)).toBe(-500)
    expect(scoreContract(c(4, 'S', 'X'), 6, false)).toBe(-800)
  })

  it('kontrlü vulnerable', () => {
    expect(scoreContract(c(4, 'S', 'X'), 9, true)).toBe(-200)
    expect(scoreContract(c(4, 'S', 'X'), 8, true)).toBe(-500)
    expect(scoreContract(c(4, 'S', 'X'), 7, true)).toBe(-800)
  })

  it('rekontrlü', () => {
    expect(scoreContract(c(4, 'S', 'XX'), 9, false)).toBe(-200)
    expect(scoreContract(c(4, 'S', 'XX'), 8, true)).toBe(-1000)
  })
})

describe('board bilgisi', () => {
  it('dağıtıcı ve vulnerability', () => {
    expect(boardInfo(1)).toEqual({ dealer: 'N', vulnerability: 'None' })
    expect(boardInfo(2)).toEqual({ dealer: 'E', vulnerability: 'NS' })
    expect(boardInfo(7)).toEqual({ dealer: 'S', vulnerability: 'All' })
    expect(boardInfo(16)).toEqual({ dealer: 'W', vulnerability: 'EW' })
    expect(boardInfo(17)).toEqual(boardInfo(1))
  })

  it('isVulnerable', () => {
    expect(isVulnerable(2, 'N')).toBe(true)
    expect(isVulnerable(2, 'E')).toBe(false)
    expect(isVulnerable(4, 'W')).toBe(true)
  })

  it('NS açısından skor', () => {
    expect(scoreForNS(1, 'S', c(4, 'S'), 10)).toBe(420)
    expect(scoreForNS(1, 'E', c(4, 'S'), 10)).toBe(-420)
    expect(scoreForNS(3, 'W', c(3, 'NT'), 8)).toBe(100) // EW vul, 1 batak → NS +100
  })
})

describe('hatalı girdi', () => {
  it('geçersiz levée hata fırlatır', () => {
    expect(() => scoreContract(c(1, 'C'), 14, false)).toThrow()
    expect(() => scoreContract(c(1, 'C'), -1, false)).toThrow()
  })
})
