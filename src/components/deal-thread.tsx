"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { sendMessage } from "@/app/(app)/deals/actions";
import type { DealMessage } from "@/lib/types";

export function DealThread({
  dealId,
  currentUserId,
  initialMessages,
}: {
  dealId: string;
  currentUserId: string;
  initialMessages: DealMessage[];
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<DealMessage[]>(initialMessages);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Note: the parent remounts this component (via `key`) whenever the server
  // messages change, so local state always re-initialises from server truth.

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fallback polling so the recipient sees new messages even if Realtime
  // isn't enabled on the project. Pauses when the tab is hidden.
  useEffect(() => {
    const id = setInterval(() => {
      if (!document.hidden) router.refresh();
    }, 20000);
    return () => clearInterval(id);
  }, [router]);

  // Live updates: on any new message for this deal, re-fetch under RLS.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`deal-${dealId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "deal_messages",
          filter: `deal_id=eq.${dealId}`,
        },
        () => router.refresh()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [dealId, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text || sending) return;
    setSending(true);
    setBody("");

    const optimistic: DealMessage = {
      id: `temp-${Date.now()}`,
      deal_id: dealId,
      sender_id: currentUserId,
      body: text,
      created_at: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);

    try {
      const res = await sendMessage(dealId, text);
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setMessages((m) => m.filter((x) => x.id !== optimistic.id));
      setBody(text);
      toast.error("Message didn't send. Try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col">
      <div className="max-h-[28rem] space-y-3 overflow-y-auto px-1 py-2">
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No messages yet — say hello and work out the details.
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === currentUserId;
            return (
              <div
                key={m.id}
                className={cn("flex", mine ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[78%] rounded-2xl px-3.5 py-2 text-sm",
                    mine
                      ? "rounded-br-sm bg-navy text-white"
                      : "rounded-bl-sm bg-secondary text-foreground"
                  )}
                >
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <div
                    className={cn(
                      "mt-1 text-[10px]",
                      mine ? "text-white/60" : "text-muted-foreground"
                    )}
                  >
                    {new Date(m.created_at).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={submit} className="mt-3 flex items-end gap-2 border-t pt-3">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit(e);
            }
          }}
          placeholder="Write a message…  (Enter to send, Shift+Enter for a new line)"
          rows={1}
          className="max-h-32 min-h-10 flex-1 resize-none"
        />
        <Button type="submit" variant="accent" disabled={sending || !body.trim()}>
          <Send /> Send
        </Button>
      </form>
    </div>
  );
}
