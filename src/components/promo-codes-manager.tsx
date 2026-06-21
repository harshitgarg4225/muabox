"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ticket, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createPromoCode,
  updatePromoStats,
  deletePromoCode,
} from "@/app/(app)/campaigns/promo-actions";
import { formatMoney, type PromoCode } from "@/lib/types";

export type PromoRow = PromoCode & { artistName: string };

export function PromoCodesManager({
  campaignId,
  codes,
  assignableArtists,
}: {
  campaignId: string;
  codes: PromoRow[];
  assignableArtists: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [artistId, setArtistId] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  async function create() {
    if (!artistId || !code.trim()) return;
    setBusy(true);
    const res = await createPromoCode({
      campaignId,
      artistId,
      code,
      description: description || undefined,
    });
    setBusy(false);
    if (res.ok) {
      setCode("");
      setDescription("");
      setArtistId("");
      router.refresh();
    } else {
      toast.error(
        res.reason === "duplicate"
          ? "That code already exists on this campaign."
          : res.reason === "invalid"
            ? "Use 2–40 letters, numbers, - or _."
            : "Could not create the code."
      );
    }
  }

  return (
    <div className="space-y-4">
      {codes.length > 0 && (
        <ul className="space-y-2">
          {codes.map((c) => (
            <PromoRowItem key={c.id} promo={c} onChanged={() => router.refresh()} />
          ))}
        </ul>
      )}

      {assignableArtists.length > 0 ? (
        <div className="space-y-3 rounded-xl border p-3">
          <p className="text-sm font-medium text-navy">Assign a new code</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label>Artist</Label>
              <select
                value={artistId}
                onChange={(e) => setArtistId(e.target.value)}
                className="border-input h-9 w-full rounded-md border bg-transparent px-2 text-sm shadow-xs"
              >
                <option value="">Select…</option>
                {assignableArtists.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Code</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="GLOW15"
              />
            </div>
            <div className="space-y-1">
              <Label>Offer (optional)</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="15% off"
              />
            </div>
          </div>
          <Button
            variant="accent"
            size="sm"
            disabled={busy || !artistId || !code.trim()}
            onClick={create}
          >
            <Plus /> Create code
          </Button>
        </div>
      ) : codes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Accept an artist onto this campaign first, then assign them a unique
          promo code to attribute the sales they drive.
        </p>
      ) : null}
    </div>
  );
}

function PromoRowItem({
  promo,
  onChanged,
}: {
  promo: PromoRow;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [redemptions, setRedemptions] = useState(String(promo.redemptions));
  const [revenue, setRevenue] = useState(String(promo.revenue / 100));
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const res = await updatePromoStats({
      promoId: promo.id,
      redemptions: Number(redemptions) || 0,
      revenue: Number(revenue) || 0,
    });
    setBusy(false);
    if (res.ok) {
      setEditing(false);
      onChanged();
    } else toast.error("Could not update.");
  }

  async function remove() {
    setBusy(true);
    const res = await deletePromoCode(promo.id);
    setBusy(false);
    if (res.ok) onChanged();
    else toast.error("Could not delete.");
  }

  return (
    <li className="rounded-xl border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Ticket className="size-4 text-navy" />
          <span className="font-mono font-bold text-navy">{promo.code}</span>
          <span className="text-sm text-muted-foreground">
            {promo.artistName}
            {promo.description ? ` · ${promo.description}` : ""}
          </span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">
            <strong className="text-navy">{promo.redemptions}</strong> uses ·{" "}
            <strong className="text-navy">
              {formatMoney(promo.revenue, "INR")}
            </strong>
          </span>
          <button
            type="button"
            className="text-muted-foreground hover:text-navy"
            onClick={() => setEditing((e) => !e)}
          >
            {editing ? "Close" : "Update"}
          </button>
          <button
            type="button"
            aria-label="Delete code"
            className="text-muted-foreground hover:text-destructive"
            onClick={remove}
            disabled={busy}
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {editing && (
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label>Redemptions</Label>
            <Input
              type="number"
              min={0}
              value={redemptions}
              onChange={(e) => setRedemptions(e.target.value)}
              className="w-28"
            />
          </div>
          <div className="space-y-1">
            <Label>Attributed sales (₹)</Label>
            <Input
              type="number"
              min={0}
              value={revenue}
              onChange={(e) => setRevenue(e.target.value)}
              className="w-36"
            />
          </div>
          <Button size="sm" variant="accent" disabled={busy} onClick={save}>
            Save
          </Button>
        </div>
      )}
    </li>
  );
}
