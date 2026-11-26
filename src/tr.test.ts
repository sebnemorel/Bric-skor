import { describe, expect, it } from 'vitest'
import { ablative, dative } from './tr'

describe('Türkçe sayı ekleri', () => {
  it.each([
    [1, "1'e"], [2, "2'ye"], [3, "3'e"], [4, "4'e"], [5, "5'e"], [6, "6'ya"], [7, "7'ye"], [8, "8'e"], [9, "9'a"],
    [10, "10'a"], [12, "12'ye"], [20, "20'ye"], [26, "26'ya"], [30, "30'a"], [40, "40'a"], [100, "100'e"],
  ])('yönelme %i → %s', (n, s) => expect(dative(n)).toBe(s))

  it.each([
    [1, "1'den"], [2, "2'den"], [3, "3'ten"], [4, "4'ten"], [5, "5'ten"], [6, "6'dan"], [7, "7'den"], [8, "8'den"],
    [9, "9'dan"], [10, "10'dan"], [13, "13'ten"], [20, "20'den"], [40, "40'tan"], [60, "60'tan"], [70, "70'ten"],
  ])('ayrılma %i → %s', (n, s) => expect(ablative(n)).toBe(s))
})
