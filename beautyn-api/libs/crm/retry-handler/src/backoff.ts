function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

export function calcDelay(attemptIndex: number, base: number, max: number): number {
  // attemptIndex: 1-based index for the *retry* (not the first call)
  const expo = base * Math.pow(2, attemptIndex - 1);
  return clamp(expo, base, max);
}

export function applyJitter(delay: number, jitter: boolean): number {
  if (!jitter) return delay;
  // Full jitter: uniform [0, delay]
  return Math.floor(Math.random() * (delay + 1));
}

export async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

