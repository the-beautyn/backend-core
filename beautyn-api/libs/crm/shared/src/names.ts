export function deriveFirstName(name?: string | null): string {
  if (!name) return 'Unknown';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts[0] ?? 'Unknown';
}

export function deriveLastName(name?: string | null): string {
  if (!name) return 'Worker';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return 'Worker';
  return parts.slice(1).join(' ');
}

export function splitName(name?: string | null): { firstName: string; lastName: string } {
  return { firstName: deriveFirstName(name ?? ''), lastName: deriveLastName(name ?? '') };
}

export function buildFullName(firstName?: string | null, lastName?: string | null): string | null {
  const first = (firstName ?? '').trim();
  const last = (lastName ?? '').trim();
  const parts = [first, last].filter((p) => p.length > 0);
  return parts.length ? parts.join(' ') : null;
}

export function resolveNamePart(primary: unknown, fallback: string): string {
  if (typeof primary === 'string') {
    const trimmed = primary.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return fallback;
}


