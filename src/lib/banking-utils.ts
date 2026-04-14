/**
 * Estrae il nome merchant da una description di transazione bancaria (Fineco).
 * Rimuove parti variabili: numero carta, data operazione, data accredito, asterischi.
 * Restituisce il merchant in UPPERCASE per match case-insensitive, o null se troppo corto.
 */
export function extractMerchantFromDescription(description: string): string | null {
  if (!description) return null

  let s = description
  s = s.replace(/Carta\s*N\.\s*[\*\d\s]+/gi, '')
  s = s.replace(/Data\s*operazione\s*\d{2}\/\d{2}\/\d{2,4}/gi, '')
  s = s.replace(/Data\s*accredito:\s*\d{2}\/\d{2}\/\d{4}/gi, '')
  s = s.replace(/\*\d+/g, '')
  s = s.trim().replace(/\s+/g, ' ')

  if (s.length < 3) return null
  return s.toUpperCase()
}
