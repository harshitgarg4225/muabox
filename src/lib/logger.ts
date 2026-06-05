/**
 * Tiny structured logger. JSON lines in production (easy to ship to a log
 * drain / Sentry breadcrumb), readable in dev. Never logs secrets — pass only
 * safe context. Swap the sink for Sentry/Datadog by editing `emit`.
 */
type Level = "debug" | "info" | "warn" | "error";

type Context = Record<string, unknown>;

function emit(level: Level, message: string, context?: Context) {
  const entry = {
    level,
    message,
    time: new Date().toISOString(),
    ...context,
  };
  const line =
    process.env.NODE_ENV === "production"
      ? JSON.stringify(entry)
      : `[${level}] ${message}${context ? " " + JSON.stringify(context) : ""}`;
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (m: string, c?: Context) => emit("debug", m, c),
  info: (m: string, c?: Context) => emit("info", m, c),
  warn: (m: string, c?: Context) => emit("warn", m, c),
  error: (m: string, err?: unknown, c?: Context) =>
    emit("error", m, {
      ...c,
      error: err instanceof Error ? err.message : String(err ?? ""),
    }),
};
