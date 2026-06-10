"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { sendPitch } from "@/app/(app)/deals/actions";

export function PitchDialog({
  brandId,
  brandName,
}: {
  brandId: string;
  brandName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [amount, setAmount] = useState("");
  const [sending, setSending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return toast.error("Write your pitch first.");
    setSending(true);
    try {
      const fd = new FormData();
      fd.set("brand_id", brandId);
      fd.set("message", message);
      if (amount) fd.set("proposed_amount", amount);
      const res = await sendPitch(fd);
      if (res.ok) {
        toast.success("Pitch sent — you'll hear back in your Deals inbox.");
        setOpen(false);
        setMessage("");
        setAmount("");
        router.refresh();
      } else if (res.reason === "already_pitched") {
        toast.error("You already have an open pitch with this brand.");
      } else if (res.reason === "not_open") {
        toast.error("This brand isn't accepting pitches right now.");
      } else if (res.reason === "rate_limited") {
        toast.error("You're pitching too fast — try again in a minute.");
      } else {
        toast.error("Couldn't send the pitch.");
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="accent" size="sm">
          <Sparkles /> Pitch
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Pitch {brandName}</DialogTitle>
            <DialogDescription>
              Introduce yourself and the collab you have in mind. Your Instagram
              stats go with the pitch automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="pitch-message">Your pitch</Label>
              <Textarea
                id="pitch-message"
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Hi! I'm a bridal & editorial MUA — I'd love to feature your serum in my festive-season looks…"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pitch-amount">Proposed rate (₹, optional)</Label>
              <Input
                id="pitch-amount"
                type="number"
                min={0}
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="15000"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" variant="accent" disabled={sending}>
              Send pitch
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
