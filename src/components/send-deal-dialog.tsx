"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Handshake } from "lucide-react";
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
import { sendDeal } from "@/app/(app)/deals/actions";

const schema = z.object({
  message: z.string().min(1, "Add a message").max(1000),
  offer_amount: z.coerce.number().min(0).optional(),
  currency: z.string().length(3).default("USD"),
  product_description: z.string().max(500).optional(),
});

type FormValues = z.input<typeof schema>;

export function SendDealDialog({
  artistId,
  artistName,
}: {
  artistId: string;
  artistName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { currency: "USD" },
  });

  async function onSubmit(values: FormValues) {
    const fd = new FormData();
    fd.set("artist_id", artistId);
    Object.entries(values).forEach(([k, v]) => {
      if (v != null && v !== "") fd.set(k, String(v));
    });
    const res = await sendDeal(fd);
    if (res.ok) {
      toast.success("Deal sent!");
      reset();
      setOpen(false);
      router.refresh();
    } else {
      toast.error(
        res.reason === "message_required"
          ? "Add a message first."
          : "Could not send deal."
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Handshake /> Send a deal
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Send a deal to {artistName}</DialogTitle>
            <DialogDescription>
              Describe the collaboration. Budget is optional — leave it blank to
              discuss.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                rows={4}
                placeholder="Hi! We'd love to collaborate on our new serum launch…"
                {...register("message")}
              />
              {errors.message && (
                <p className="text-sm text-destructive">
                  {errors.message.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="product_description">Product / deliverables</Label>
              <Input
                id="product_description"
                placeholder="1 Reel + 2 Stories featuring our serum"
                {...register("product_description")}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="offer_amount">Budget (optional)</Label>
                <Input
                  id="offer_amount"
                  type="number"
                  min={0}
                  step="1"
                  placeholder="500"
                  {...register("offer_amount")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Input
                  id="currency"
                  maxLength={3}
                  className="uppercase"
                  {...register("currency")}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              Send deal
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
