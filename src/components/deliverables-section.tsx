"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Check, Plus, X, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  addDeliverable,
  removeDeliverable,
  submitDeliverable,
  reviewDeliverable,
} from "@/app/(app)/deals/execution-actions";
import type { DealDeliverable, UserRole } from "@/lib/types";

export function DeliverablesSection({
  dealId,
  role,
  deliverables,
}: {
  dealId: string;
  role: UserRole;
  deliverables: DealDeliverable[];
}) {
  const router = useRouter();
  const isBrand = role === "brand";
  const [label, setLabel] = useState("");
  const [adding, setAdding] = useState(false);

  const done = deliverables.filter((d) => d.status === "approved").length;

  async function add() {
    if (!label.trim()) return;
    setAdding(true);
    const res = await addDeliverable(dealId, label);
    setAdding(false);
    if (res.ok) {
      setLabel("");
      router.refresh();
    } else {
      toast.error("Could not add deliverable.");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {deliverables.length === 0
            ? isBrand
              ? "Add the content you expect — the artist submits a live link for each, and you approve it."
              : "The brand hasn't listed deliverables yet."
            : `${done} of ${deliverables.length} approved`}
        </p>
      </div>

      {deliverables.length > 0 && (
        <ul className="space-y-2">
          {deliverables.map((d) => (
            <DeliverableRow
              key={d.id}
              deliverable={d}
              isBrand={isBrand}
              onChanged={() => router.refresh()}
            />
          ))}
        </ul>
      )}

      {isBrand && (
        <div className="flex gap-2">
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. 1 Instagram Reel"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
          />
          <Button onClick={add} disabled={adding || !label.trim()} variant="outline">
            <Plus /> Add
          </Button>
        </div>
      )}
    </div>
  );
}

function statusBadge(status: DealDeliverable["status"]) {
  switch (status) {
    case "approved":
      return (
        <Badge className="bg-emerald-600 text-white">
          <Check className="size-3" /> Approved
        </Badge>
      );
    case "submitted":
      return (
        <Badge variant="secondary">
          <Clock className="size-3" /> In review
        </Badge>
      );
    case "changes_requested":
      return (
        <Badge variant="outline" className="border-amber-500 text-amber-700">
          <AlertCircle className="size-3" /> Changes requested
        </Badge>
      );
    default:
      return <Badge variant="outline">Awaiting link</Badge>;
  }
}

function DeliverableRow({
  deliverable: d,
  isBrand,
  onChanged,
}: {
  deliverable: DealDeliverable;
  isBrand: boolean;
  onChanged: () => void;
}) {
  const [url, setUrl] = useState(d.post_url ?? "");
  const [busy, setBusy] = useState(false);
  const isArtist = !isBrand;

  async function run(fn: () => Promise<{ ok: boolean; reason?: string }>, errMsg: string) {
    setBusy(true);
    const res = await fn();
    setBusy(false);
    if (res.ok) onChanged();
    else
      toast.error(
        res.reason === "invalid_url" ? "Enter a valid post URL." : errMsg
      );
  }

  return (
    <li className="rounded-xl border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium text-navy">{d.label}</span>
        <div className="flex items-center gap-2">
          {statusBadge(d.status)}
          {isBrand && d.status === "pending" && (
            <button
              type="button"
              aria-label="Remove"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => run(() => removeDeliverable(d.id), "Could not remove.")}
              disabled={busy}
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      {d.post_url && (
        <a
          href={d.post_url}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-flex items-center gap-1 text-sm text-navy underline"
        >
          View post <ExternalLink className="size-3" />
        </a>
      )}

      {d.status === "changes_requested" && d.review_note && (
        <p className="mt-1 text-sm text-amber-700">“{d.review_note}”</p>
      )}

      {/* Artist: submit / resubmit a link */}
      {isArtist && d.status !== "approved" && (
        <div className="mt-2 flex gap-2">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://instagram.com/p/…"
          />
          <Button
            variant="outline"
            disabled={busy || !url.trim()}
            onClick={() => run(() => submitDeliverable(d.id, url), "Could not submit.")}
          >
            {d.status === "pending" ? "Submit" : "Resubmit"}
          </Button>
        </div>
      )}

      {/* Brand: review a submitted link */}
      {isBrand && d.status === "submitted" && (
        <div className="mt-2 flex gap-2">
          <Button
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            disabled={busy}
            onClick={() => run(() => reviewDeliverable(d.id, true), "Could not approve.")}
          >
            <Check /> Approve
          </Button>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => {
              const note = window.prompt("What needs changing? (optional)") ?? undefined;
              run(() => reviewDeliverable(d.id, false, note), "Could not update.");
            }}
          >
            Request changes
          </Button>
        </div>
      )}
    </li>
  );
}
