// Sayılara Türkçe ek getirme: "Masa 2'ye", "Masa 3'e", "Masa 6'dan", "Masa 4'ten".
// Ek, sayının okunuşundaki son kelimeye göre belirlenir (ünlü uyumu ve sertleşme).

const ONES = ['', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz']
const TENS = ['', 'on', 'yirmi', 'otuz', 'kırk', 'elli', 'altmış', 'yetmiş', 'seksen', 'doksan']

/** Sayının okunuşundaki son kelime (ör. 23 → "üç", 40 → "kırk", 0 → "sıfır"). */
function lastWord(n: number): string {
  n = Math.abs(Math.trunc(n))
  if (n === 0) return 'sıfır'
  if (n % 10 !== 0) return ONES[n % 10]
  if (n % 100 !== 0) return TENS[(n % 100) / 10]
  if (n % 1000 !== 0) return 'yüz'
  if (n % 1_000_000 !== 0) return 'bin'
  return 'milyon'
}

const VOWELS = 'aeıioöuü'
const BACK = 'aıou'
const HARD = 'çfhkpsşt'

function info(word: string) {
  const vowels = [...word].filter(c => VOWELS.includes(c))
  const lastVowel = vowels[vowels.length - 1]
  const lastChar = word[word.length - 1]
  return { back: BACK.includes(lastVowel), endsVowel: VOWELS.includes(lastChar), endsHard: HARD.includes(lastChar) }
}

/** Yönelme hâli: 2 → "2'ye", 3 → "3'e", 6 → "6'ya", 10 → "10'a" */
export function dative(n: number): string {
  const { back, endsVowel } = info(lastWord(n))
  return `${n}'${endsVowel ? 'y' : ''}${back ? 'a' : 'e'}`
}

/** Ayrılma hâli: 2 → "2'den", 3 → "3'ten", 6 → "6'dan", 40 → "40'tan" */
export function ablative(n: number): string {
  const { back, endsHard } = info(lastWord(n))
  return `${n}'${endsHard ? 't' : 'd'}${back ? 'an' : 'en'}`
}
