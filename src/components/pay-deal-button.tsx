"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IndianRupee } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, cb: () => void) => void;
    };
  }
}

function loadCheckout(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export function PayDealButton({
  dealId,
  amountLabel,
}: {
  dealId: string;
  amountLabel: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function pay() {
    setLoading(true);
    try {
      const ok = await loadCheckout();
      if (!ok || !window.Razorpay) {
        toast.error("Couldn't load the payment window. Check your connection.");
        return;
      }

      const orderRes = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealId }),
      });
      const order = await orderRes.json();
      if (!orderRes.ok) {
        toast.error(
          order.error === "payments_unavailable"
            ? "Payments aren't configured yet."
            : "Couldn't start the payment."
        );
        return;
      }

      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: "Muabox",
        description: "PR collaboration payment",
        theme: { color: "#0a1f44" },
        handler: async (response: Record<string, string>) => {
          const verifyRes = await fetch("/api/payments/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });
          if (verifyRes.ok) {
            toast.success("Payment successful 🎉");
          } else {
            // The charge succeeded at Razorpay (this handler only fires on
            // success); our confirmation just lagged. The webhook reconciles
            // it — reassure rather than alarm.
            toast.message("Payment received — confirming now. This updates shortly.");
          }
          router.refresh();
        },
      });
      rzp.on("payment.failed", () => toast.error("Payment failed. Try again."));
      rzp.open();
    } catch {
      toast.error("Something went wrong starting the payment.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="accent" onClick={pay} disabled={loading}>
      <IndianRupee /> Pay {amountLabel}
    </Button>
  );
}
