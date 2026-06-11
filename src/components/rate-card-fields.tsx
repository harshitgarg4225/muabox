"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { DELIVERABLES, COLLAB_TYPES } from "@/lib/pricing";

export type RateRow = { deliverable: string; price: string }; // price in rupees (string)

export function RateCardFields({
  collabTypes,
  onCollabChange,
  rows,
  onRowsChange,
  minBudget,
  onMinBudgetChange,
}: {
  collabTypes: string[];
  onCollabChange: (next: string[]) => void;
  rows: RateRow[];
  onRowsChange: (next: RateRow[]) => void;
  minBudget: string;
  onMinBudgetChange: (v: string) => void;
}) {
  const used = new Set(rows.map((r) => r.deliverable));
  const available = DELIVERABLES.filter((d) => !used.has(d));
  const [pick, setPick] = useState("");
  const [price, setPrice] = useState("");

  function toggleCollab(t: string) {
    onCollabChange(
      collabTypes.includes(t)
        ? collabTypes.filter((x) => x !== t)
        : [...collabTypes, t]
    );
  }

  function addRow() {
    const deliverable = pick || available[0];
    if (!deliverable) return;
    onRowsChange([...rows, { deliverable, price: price.trim() }]);
    setPick("");
    setPrice("");
  }

  function removeRow(deliverable: string) {
    onRowsChange(rows.filter((r) => r.deliverable !== deliverable));
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>Collaboration types you accept</Label>
        <p className="text-sm text-muted-foreground">
          Tell brands what kind of deals you do.
        </p>
        <div className="flex flex-wrap gap-2">
          {COLLAB_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => toggleCollab(t)}
              aria-pressed={collabTypes.includes(t)}
              className={cn(
                "rounded-full border px-3 py-1 text-sm transition-colors",
                collabTypes.includes(t)
                  ? "border-navy bg-navy text-white"
                  : "text-muted-foreground hover:border-navy hover:text-navy"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Rate card</Label>
        <p className="text-sm text-muted-foreground">
          Set a price per deliverable (leave blank for &ldquo;on request&rdquo;).
        </p>

        {rows.length > 0 && (
          <div className="divide-y rounded-lg border">
            {rows.map((r) => (
              <div
                key={r.deliverable}
                className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
              >
                <span className="font-medium text-navy">{r.deliverable}</span>
                <span className="flex items-center gap-2">
                  <span className="text-muted-foreground">
                    {r.price ? `₹${Number(r.price).toLocaleString("en-IN")}` : "On request"}
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove ${r.deliverable}`}
                    onClick={() => removeRow(r.deliverable)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="size-4" />
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}

        {available.length > 0 && (
          <div className="flex flex-wrap items-end gap-2">
            <select
              aria-label="Deliverable"
              value={pick}
              onChange={(e) => setPick(e.target.value)}
              className="border-input h-9 min-w-48 flex-1 rounded-md border bg-transparent px-3 text-sm shadow-xs"
            >
              {available.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <Input
              type="number"
              min={0}
              step="1"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="₹ rate"
              className="w-32"
            />
            <Button type="button" variant="outline" onClick={addRow}>
              <Plus /> Add
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="min_budget">Minimum budget (₹, optional)</Label>
        <Input
          id="min_budget"
          type="number"
          min={0}
          step="1"
          value={minBudget}
          onChange={(e) => onMinBudgetChange(e.target.value)}
          placeholder="e.g. 10000"
          className="max-w-xs"
        />
        <p className="text-xs text-muted-foreground">
          Brands see this so you only get offers worth your time.
        </p>
      </div>
    </div>
  );
}
