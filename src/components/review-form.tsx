"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { submitReview } from "@/app/(app)/deals/review-actions";

export function ReviewForm({
  dealId,
  counterpartyName,
}: {
  dealId: string;
  counterpartyName: string;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (rating < 1) return toast.error("Pick a star rating first.");
    setSubmitting(true);
    try {
      const res = await submitReview(dealId, rating, comment);
      if (res.ok) {
        toast.success("Thanks for your review!");
        router.refresh();
      } else if (res.reason === "exists") {
        toast.error("You've already reviewed this collaboration.");
      } else {
        toast.error("Couldn't submit your review.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border bg-secondary/30 p-4">
      <div>
        <p className="text-sm font-medium text-navy">
          How was working with {counterpartyName}?
        </p>
        <p className="text-xs text-muted-foreground">
          Your rating helps the community build trust.
        </p>
      </div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            aria-label={`${i} star${i > 1 ? "s" : ""}`}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(i)}
            className="transition-transform hover:scale-110"
          >
            <Star
              className={cn(
                "size-7",
                i <= (hover || rating)
                  ? "fill-yellow text-yellow"
                  : "fill-muted text-muted"
              )}
            />
          </button>
        ))}
      </div>
      <Textarea
        rows={2}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Add a note about the collaboration (optional)"
      />
      <Button onClick={submit} variant="accent" size="sm" disabled={submitting}>
        Submit review
      </Button>
    </div>
  );
}
