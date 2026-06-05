"use client";

import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { toggleSaved } from "@/app/(app)/discover/actions";

export function SaveArtistButton({
  artistId,
  initialSaved,
  className,
  withLabel,
}: {
  artistId: string;
  initialSaved: boolean;
  className?: string;
  withLabel?: boolean;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [pending, startTransition] = useTransition();

  function onClick(e: React.MouseEvent) {
    // Card is wrapped in a link; don't navigate when saving.
    e.preventDefault();
    e.stopPropagation();
    const next = !saved;
    setSaved(next); // optimistic
    startTransition(async () => {
      try {
        const res = await toggleSaved(artistId);
        setSaved(res.saved);
        toast.success(res.saved ? "Saved to your shortlist" : "Removed from shortlist");
      } catch {
        setSaved(!next);
        toast.error("Couldn't update your shortlist.");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={saved}
      aria-label={saved ? "Remove from shortlist" : "Save to shortlist"}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-white/90 text-sm font-medium shadow-soft backdrop-blur transition-transform hover:scale-105 disabled:opacity-60",
        withLabel ? "px-3 py-1.5" : "size-9 justify-center",
        className
      )}
    >
      <Heart
        className={cn(
          "size-4 transition-colors",
          saved ? "fill-destructive text-destructive" : "text-navy"
        )}
      />
      {withLabel && <span className="text-navy">{saved ? "Saved" : "Save"}</span>}
    </button>
  );
}
