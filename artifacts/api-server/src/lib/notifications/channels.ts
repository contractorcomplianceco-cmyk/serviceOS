import { logger } from "../logger";
import type { NotificationChannel } from "@workspace/db";

// ---------------------------------------------------------------------------
// Delivery channel adapters.
//
// IMPORTANT: none of these talk to a real provider. Every adapter is a labeled
// simulation so the product can demonstrate multi-channel delivery honestly:
//   - InApp   : the notification row itself IS the delivery (always succeeds).
//   - Email   : a dev "mail capture" sink — the message is logged, not sent.
//   - SMS     : a simulator — no carrier, no phone number is ever contacted.
//   - Push    : a placeholder — no device tokens are registered.
// Each result carries a human-readable `detail` string that names the simulated
// transport so the UI/audit trail never implies a real message went out.
// ---------------------------------------------------------------------------

export interface DeliveryContext {
  notificationId: string;
  channel: NotificationChannel;
  recipientAddress: string | null;
  subject: string | null;
  body: string;
}

export interface DeliveryResult {
  ok: boolean;
  detail: string;
}

export interface ChannelAdapter {
  channel: NotificationChannel;
  /** Human label of the simulated transport, shown in status history. */
  label: string;
  deliver(ctx: DeliveryContext): Promise<DeliveryResult>;
}

const inAppAdapter: ChannelAdapter = {
  channel: "InApp",
  label: "In-app center",
  async deliver() {
    return { ok: true, detail: "Delivered to in-app center" };
  },
};

const emailAdapter: ChannelAdapter = {
  channel: "Email",
  label: "Dev mail capture (simulated — not sent)",
  async deliver(ctx) {
    if (!ctx.recipientAddress) {
      return { ok: false, detail: "No email address on file" };
    }
    logger.info(
      { notificationId: ctx.notificationId, to: ctx.recipientAddress },
      "[mail-capture] simulated email (not sent)",
    );
    return {
      ok: true,
      detail: `Captured by dev mail sink for ${ctx.recipientAddress} (simulated — not sent)`,
    };
  },
};

const smsAdapter: ChannelAdapter = {
  channel: "SMS",
  label: "SMS simulator (simulated — no carrier)",
  async deliver(ctx) {
    if (!ctx.recipientAddress) {
      return { ok: false, detail: "No phone number on file" };
    }
    logger.info(
      { notificationId: ctx.notificationId, to: ctx.recipientAddress },
      "[sms-sim] simulated SMS (not sent)",
    );
    return {
      ok: true,
      detail: `Queued in SMS simulator for ${ctx.recipientAddress} (simulated — no carrier)`,
    };
  },
};

const pushAdapter: ChannelAdapter = {
  channel: "Push",
  label: "Push placeholder (simulated — no device)",
  async deliver(ctx) {
    // No device tokens are registered in the prototype, so push is a labeled
    // no-op that records the intent without claiming a device was reached.
    logger.info(
      { notificationId: ctx.notificationId },
      "[push-placeholder] simulated push (no device registered)",
    );
    return {
      ok: true,
      detail: "Recorded by push placeholder (simulated — no device registered)",
    };
  },
};

const ADAPTERS: Record<NotificationChannel, ChannelAdapter> = {
  InApp: inAppAdapter,
  Email: emailAdapter,
  SMS: smsAdapter,
  Push: pushAdapter,
};

export function adapterFor(channel: NotificationChannel): ChannelAdapter {
  return ADAPTERS[channel];
}
