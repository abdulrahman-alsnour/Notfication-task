
export type MessagePayload = {
  to: string;
  body: string;
  messageType: "sms" | "whatsapp";
};

export type SendResult = { ok: true; providerId?: string } | { ok: false; error: string };

export async function sendMessage(payload: MessagePayload): Promise<SendResult> {
  if (process.env.NODE_ENV !== "test") {
    // eslint-disable-next-line no-console
    console.log("[Mock provider]", payload.messageType.toUpperCase(), "to", payload.to, ":", payload.body.slice(0, 80) + (payload.body.length > 80 ? "…" : ""));
  }
  return { ok: true, providerId: `mock-${Date.now()}-${Math.random().toString(36).slice(2, 9)}` };
}
