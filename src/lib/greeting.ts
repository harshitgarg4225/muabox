/** Warm, time-aware greetings (IST — our users are in India). */
export function timeGreeting(date = new Date()): string {
  const istHour = (date.getUTCHours() + 5.5 + 24) % 24;
  if (istHour < 5) return "Burning the midnight oil";
  if (istHour < 12) return "Good morning";
  if (istHour < 17) return "Good afternoon";
  return "Good evening";
}

export function firstName(full: string | null | undefined): string | null {
  const name = full?.trim().split(/\s+/)[0];
  return name && name.length > 1 ? name : null;
}

/** Current epoch ms — via a helper so server components stay lint-pure. */
export function nowMs(): number {
  return Date.now();
}
