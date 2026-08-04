const codeStore = new Map<string, { code: string; expires: number }>()

export function generateVerificationCode(): string {
  return Math.random().toString().slice(2, 8).padStart(6, '0')
}

export function setVerificationCode(
  key: string,
  code: string,
  ttlMs = 5 * 60 * 1000
): void {
  codeStore.set(key, { code, expires: Date.now() + ttlMs })
}

export function verifyAndConsumeCode(key: string, code: string): boolean {
  const stored = codeStore.get(key)
  if (!stored) return false
  if (stored.expires < Date.now()) {
    codeStore.delete(key)
    return false
  }
  if (stored.code !== code) return false
  codeStore.delete(key)
  return true
}

export function getActiveCodeRemainingSeconds(key: string): number {
  const existing = codeStore.get(key)
  if (!existing || existing.expires <= Date.now()) return 0
  return Math.ceil((existing.expires - Date.now()) / 1000)
}

export function emailVerificationKey(email: string): string {
  return `email:${email.trim().toLowerCase()}`
}

export function phoneVerificationKey(phone: string): string {
  return `phone:${phone.trim()}`
}

/** @internal test helper */
export function _clearVerificationCodesForTests(): void {
  codeStore.clear()
}
