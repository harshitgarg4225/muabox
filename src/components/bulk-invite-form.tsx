"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { bulkInvite } from "@/app/(app)/campaigns/actions";
import { formatMoney } from "@/lib/types";
import { cn } from "@/lib/utils";

export type InvitableArtist = {
  artist_id: string;
  name: string;
  username: string | null;
  avatar: string | null;
  followers: number | null;
  engagement: number | null;
  match?: number;
};

export function BulkInviteForm({
  campaignId,
  artists,
}: {
  campaignId: string;
  artists: InvitableArtist[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [amount, setAmount] = useState("");
  const [sending, setSending] = useState(false);

  function toggle(id: string) {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (selected.size === 0) return toast.error("Select at least one artist.");
    if (!message.trim()) return toast.error("Write an invite message.");
    setSending(true);
    try {
      const res = await bulkInvite({
        campaignId,
        artistIds: [...selected],
        message,
        offerAmount: amount ? Number(amount) : null,
      });
      if (res.ok) {
        toast.success(`Invited ${res.invited} artist${res.invited === 1 ? "" : "s"} 🎉`);
        setSelected(new Set());
        setMessage("");
        router.refresh();
      } else if (res.reason === "over_budget") {
        toast.error(
          `That batch would overshoot the campaign budget. Remaining: ${
            formatMoney(res.remaining ?? 0, "INR") ?? "₹0"
          }.`
        );
      } else if (res.reason === "all_invited") {
        toast.error("All selected artists were already invited.");
      } else if (res.reason === "rate_limited") {
        toast.error("Too many batches — try again in a bit.");
      } else {
        toast.error("Couldn't send the invites.");
      }
    } finally {
      setSending(false);
    }
  }

  if (artists.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Everyone on your shortlist is already invited.{" "}
        <Link href="/discover" className="underline">
          Discover more artists
        </Link>{" "}
        and tap ♥ to shortlist them for this campaign.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2">
        {artists.map((a) => {
          const checked = selected.has(a.artist_id);
          return (
            <button
              key={a.artist_id}
              type="button"
              onClick={() => toggle(a.artist_id)}
              aria-pressed={checked}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-3 text-left transition-colors",
                checked
                  ? "border-navy bg-navy/5"
                  : "hover:border-navy/40"
              )}
            >
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-md border text-xs font-bold",
                  checked ? "border-navy bg-navy text-yellow" : "border-input"
                )}
              >
                {checked ? "✓" : ""}
              </span>
              {a.avatar ? (
                <Image
                  src={a.avatar}
                  alt=""
                  width={36}
                  height={36}
                  unoptimized
                  className="size-9 rounded-full object-cover"
                />
              ) : (
                <span className="size-9 rounded-full bg-muted" />
              )}
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-navy">
                    {a.name}
                  </span>
                  {a.match != null && (
                    <span className="shrink-0 rounded-full bg-yellow/20 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                      {a.match}% match
                    </span>
                  )}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  @{a.username} ·{" "}
                  {a.followers != null
                    ? Intl.NumberFormat("en-US", { notation: "compact" }).format(
                        a.followers
                      )
                    : "—"}{" "}
                  · {a.engagement ?? 0}% eng.
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        <Label htmlFor="bulk-message">Invite message</Label>
        <Textarea
          id="bulk-message"
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Hi! We're launching our festive serum and would love to collaborate…"
        />
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-2">
          <Label htmlFor="bulk-amount">Offer per artist (₹, optional)</Label>
          <Input
            id="bulk-amount"
            type="number"
            min={0}
            step="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="15000"
            className="w-44"
          />
        </div>
        <Button type="submit" variant="accent" disabled={sending}>
          <Send /> Invite {selected.size > 0 ? `${selected.size} ` : ""}selected
        </Button>
      </div>
    </form>
  );
}
