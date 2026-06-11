"use client";

/**
 * Renders a date/time in the *viewer's* locale + timezone. Server components
 * can't know the visitor's timezone, so any user-facing timestamp should use
 * this instead of formatting on the server.
 */
export function LocalDate({
  iso,
  mode = "date",
}: {
  iso: string | null | undefined;
  mode?: "date" | "datetime" | "relative";
}) {
  if (!iso) return null;
  const d = new Date(iso);

  let text: string;
  if (mode === "relative") {
    text = relative(d);
  } else if (mode === "datetime") {
    text = d.toLocaleString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } else {
    text = d.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <time dateTime={iso} title={d.toLocaleString()}>
      {text}
    </time>
  );
}

function relative(d: Date): string {
  const diff = Date.now() - d.getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
