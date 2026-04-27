/**
 * Timing-safe string comparison to prevent timing attacks on secrets.
 * Returns true only if both strings are identical in content AND length.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  const aBytes = new TextEncoder().encode(a)
  const bBytes = new TextEncoder().encode(b)

  if (aBytes.length !== bBytes.length) {
    // Still iterate to avoid leaking length via timing
    let diff = 0
    for (let i = 0; i < aBytes.length; i++) diff |= aBytes[i] ^ (bBytes[i % bBytes.length] ?? 0)
    return false
  }

  let diff = 0
  for (let i = 0; i < aBytes.length; i++) diff |= aBytes[i] ^ bBytes[i]
  return diff === 0
}
