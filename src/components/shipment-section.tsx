"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Truck, Check, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  saveShippingAddress,
  markShipped,
  markDelivered,
} from "@/app/(app)/deals/execution-actions";
import type { DealShipment, UserRole } from "@/lib/types";

export function ShipmentSection({
  dealId,
  role,
  shipment,
}: {
  dealId: string;
  role: UserRole;
  shipment: DealShipment | null;
}) {
  const router = useRouter();
  const isArtist = role === "artist";
  const status = shipment?.status ?? "pending";
  const hasAddress = !!shipment?.address_line;

  return (
    <div className="space-y-4 text-sm">
      <div className="flex items-center gap-2">
        <ShipStatus status={status} />
      </div>

      {/* Address — artist provides; both can see once set. */}
      {hasAddress ? (
        <div className="rounded-xl border p-3">
          <div className="flex items-center gap-1 font-medium text-navy">
            <MapPin className="size-4" /> Ship to
          </div>
          <p className="mt-1 text-muted-foreground">
            {shipment!.recipient_name}
            <br />
            {shipment!.address_line}, {shipment!.city}, {shipment!.state}{" "}
            {shipment!.pincode}
            <br />
            {shipment!.phone}
          </p>
        </div>
      ) : isArtist ? (
        <AddressForm dealId={dealId} onSaved={() => router.refresh()} />
      ) : (
        <p className="text-muted-foreground">
          Waiting for the artist to share a shipping address.
        </p>
      )}

      {/* Tracking — brand provides. */}
      {hasAddress && (
        <>
          {shipment?.courier || shipment?.tracking_number ? (
            <div className="rounded-xl border p-3">
              <div className="flex items-center gap-1 font-medium text-navy">
                <Truck className="size-4" /> Tracking
              </div>
              <p className="mt-1 text-muted-foreground">
                {shipment.courier ? `${shipment.courier} · ` : ""}
                {shipment.tracking_number ?? "—"}
              </p>
            </div>
          ) : null}

          {!isArtist && status !== "delivered" && (
            <TrackingForm
              dealId={dealId}
              shipped={status === "shipped"}
              onSaved={() => router.refresh()}
            />
          )}

          {status !== "delivered" && (status === "shipped" || !isArtist) && (
            <Button
              variant="outline"
              onClick={async () => {
                const res = await markDelivered(dealId);
                if (res.ok) {
                  toast.success("Marked delivered.");
                  router.refresh();
                } else toast.error("Could not update.");
              }}
            >
              <Check /> Mark delivered
            </Button>
          )}
        </>
      )}
    </div>
  );
}

function ShipStatus({ status }: { status: DealShipment["status"] }) {
  const map: Record<DealShipment["status"], { label: string; cls: string }> = {
    pending: { label: "Awaiting address", cls: "" },
    address_provided: { label: "Address shared", cls: "" },
    shipped: { label: "Shipped", cls: "bg-navy text-white" },
    delivered: { label: "Delivered", cls: "bg-emerald-600 text-white" },
  };
  const s = map[status];
  return <Badge className={s.cls} variant={s.cls ? "default" : "outline"}>{s.label}</Badge>;
}

function AddressForm({
  dealId,
  onSaved,
}: {
  dealId: string;
  onSaved: () => void;
}) {
  const [v, setV] = useState({
    recipient_name: "",
    address_line: "",
    city: "",
    state: "",
    pincode: "",
    phone: "",
  });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setV({ ...v, [k]: e.target.value });

  async function save() {
    setBusy(true);
    const res = await saveShippingAddress(dealId, v);
    setBusy(false);
    if (res.ok) {
      toast.success("Address shared with the brand.");
      onSaved();
    } else {
      toast.error(res.reason === "invalid" ? "Please fill every field." : "Could not save.");
    }
  }

  return (
    <div className="space-y-3 rounded-xl border p-3">
      <p className="text-muted-foreground">
        Share where the brand should ship your product. Only this brand can see
        it.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Full name"><Input value={v.recipient_name} onChange={set("recipient_name")} /></Field>
        <Field label="Phone"><Input value={v.phone} onChange={set("phone")} /></Field>
        <Field label="Address" full><Input value={v.address_line} onChange={set("address_line")} /></Field>
        <Field label="City"><Input value={v.city} onChange={set("city")} /></Field>
        <Field label="State"><Input value={v.state} onChange={set("state")} /></Field>
        <Field label="Pincode"><Input value={v.pincode} onChange={set("pincode")} /></Field>
      </div>
      <Button variant="accent" disabled={busy} onClick={save}>
        Share address
      </Button>
    </div>
  );
}

function TrackingForm({
  dealId,
  shipped,
  onSaved,
}: {
  dealId: string;
  shipped: boolean;
  onSaved: () => void;
}) {
  const [courier, setCourier] = useState("");
  const [tracking, setTracking] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const res = await markShipped(dealId, {
      courier: courier || undefined,
      tracking_number: tracking || undefined,
    });
    setBusy(false);
    if (res.ok) {
      toast.success("Marked shipped.");
      onSaved();
    } else toast.error("Could not save.");
  }

  return (
    <div className="space-y-3 rounded-xl border p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Courier (optional)"><Input value={courier} onChange={(e) => setCourier(e.target.value)} placeholder="Bluedart, Delhivery…" /></Field>
        <Field label="Tracking # (optional)"><Input value={tracking} onChange={(e) => setTracking(e.target.value)} /></Field>
      </div>
      <Button variant="accent" disabled={busy} onClick={save}>
        <Truck /> {shipped ? "Update tracking" : "Mark shipped"}
      </Button>
    </div>
  );
}

function Field({
  label,
  full,
  children,
}: {
  label: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-1 ${full ? "sm:col-span-2" : ""}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
