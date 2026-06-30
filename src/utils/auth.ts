// NOTE on security: this is a local-first, single-device Phase 1 build.
// True password hashing (bcrypt/argon2) requires a server, so for now we use
// a simple reversible-looking hash purely to avoid storing plaintext directly
// in IndexedDB. This MUST be replaced with real server-side hashing the
// moment the backend (Phase 3/4) is introduced — flagged clearly here so it
// isn't forgotten.
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const candidate = await hashPassword(password)
  return candidate === hash
}

export function generateTempPassword(): string {
  // Easy to read aloud/type on a phone keypad: 6 digits.
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export function generateId(): string {
  return crypto.randomUUID()
}

export function generateMemberId(sequence: number, year: number): string {
  const yearSuffix = year.toString().slice(-2)
  return `GLG${yearSuffix}${sequence.toString().padStart(3, '0')}`
}

export function generateLoanCode(sequence: number, year: number): string {
  return `GLG-${year}-L${sequence.toString().padStart(3, '0')}`
}
