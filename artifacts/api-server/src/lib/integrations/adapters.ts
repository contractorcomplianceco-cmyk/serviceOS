import type { IntegrationConnection } from "@workspace/db";
import { runVoicePipeline } from "../providers/voice";
import { estimateEta } from "../providers/routing";

// ---------------------------------------------------------------------------
// Integration adapters — all sandbox/simulated.
//
// Every adapter implements one common lifecycle interface so the framework can
// drive any external system the same way:
//   connect → authenticate → refresh → inbound/fetch → map → (apply) → record
//   submit (outbound, held behind human approval) → retry → disconnect
// No adapter contacts a real system; ServiceChannel runs against built-in
// fixtures, EmailIntake parses a simulated inbound email, and GenericPortal maps
// an arbitrary portal payload. Inbound sources that require triage return
// requiresApproval so the framework holds them for a human before applying.
// ---------------------------------------------------------------------------

export interface InboundPayload {
  eventType: string;
  externalId: string;
  payload: Record<string, unknown>;
}

export interface MappedInbound {
  entityType: string;
  requiresApproval: boolean;
  mapped: Record<string, unknown>;
}

export interface AuthResult {
  ok: boolean;
  detail: string;
  tokenHint?: string;
}

export interface SubmitResult {
  ok: boolean;
  detail: string;
  externalId?: string;
}

/** Result of a connection-lifecycle operation (connect/refresh/disconnect). */
export interface LifecycleResult {
  ok: boolean;
  detail: string;
  tokenHint?: string;
}

/** Whether a failed event may be retried, per the adapter's policy. */
export interface RetryDecision {
  retryable: boolean;
  detail: string;
}

/** Audit note produced when an external↔local id mapping is recorded. */
export interface RecordResult {
  detail: string;
}

/**
 * Common adapter lifecycle. Lifecycle methods (connect/refresh/disconnect),
 * fetch, retry, and record have sensible sandbox defaults via `defineAdapter`;
 * each concrete adapter only supplies `inbound` + `map` (and overrides
 * `authenticate`/`submit` where meaningful).
 */
export interface IntegrationAdapter {
  provider: string;
  /** Establish the (sandbox) connection. */
  connect(conn: IntegrationConnection): Promise<LifecycleResult>;
  /** Simulate authentication. */
  authenticate(conn: IntegrationConnection): Promise<AuthResult>;
  /** Simulate a token refresh. */
  refresh(conn: IntegrationConnection): Promise<LifecycleResult>;
  /** Produce a single simulated inbound payload. */
  inbound(conn: IntegrationConnection): Promise<InboundPayload>;
  /** Poll/fetch a batch of inbound payloads (defaults to one `inbound`). */
  fetch(conn: IntegrationConnection): Promise<InboundPayload[]>;
  /** Map an external inbound payload into a local draft shape. */
  map(
    conn: IntegrationConnection,
    payload: Record<string, unknown>,
  ): Promise<MappedInbound>;
  /** Build + submit the outbound payload for a local entity (simulated). */
  submit(
    conn: IntegrationConnection,
    mapped: Record<string, unknown>,
  ): Promise<SubmitResult>;
  /** Decide whether a failed event may be retried. */
  retry(
    conn: IntegrationConnection,
    eventType: string,
  ): Promise<RetryDecision>;
  /** Record an external↔local id mapping (audit hook). */
  record(
    conn: IntegrationConnection,
    externalId: string,
    entityType: string,
    entityId: string,
  ): Promise<RecordResult>;
  /** Tear down the (sandbox) connection. */
  disconnect(conn: IntegrationConnection): Promise<LifecycleResult>;
}

/** An adapter definition — required parts plus optional overrides. */
type AdapterDef = Pick<IntegrationAdapter, "provider" | "inbound" | "map"> &
  Partial<IntegrationAdapter>;

/**
 * Fill in default sandbox lifecycle behavior so each adapter only needs to
 * define what is actually distinct (inbound + map, and any custom auth/submit).
 */
function defineAdapter(def: AdapterDef): IntegrationAdapter {
  const provider = def.provider;
  return {
    provider,
    inbound: def.inbound,
    map: def.map,
    connect:
      def.connect ??
      (async () => ({
        ok: true,
        detail: `${provider} sandbox connection established (no real credentials used)`,
      })),
    authenticate:
      def.authenticate ??
      (async (conn) => ({
        ok: true,
        detail: `${provider} sandbox authentication accepted`,
        tokenHint: conn.tokenHint ?? undefined,
      })),
    refresh:
      def.refresh ??
      (async (conn) => ({
        ok: true,
        detail: `${provider} token refreshed (sandbox)`,
        tokenHint: conn.tokenHint ?? undefined,
      })),
    fetch: def.fetch ?? (async (conn) => [await def.inbound(conn)]),
    submit:
      def.submit ??
      (async () => ({
        ok: true,
        detail: `${provider} has no outbound channel (simulated)`,
      })),
    retry:
      def.retry ??
      (async () => ({ retryable: true, detail: "Retry permitted (sandbox)" })),
    record:
      def.record ??
      (async (conn, externalId, entityType, entityId) => ({
        detail: `Recorded ${entityType} ${entityId} ↔ ${conn.provider}:${externalId}`,
      })),
    disconnect:
      def.disconnect ??
      (async () => ({
        ok: true,
        detail: `${provider} disconnected (sandbox)`,
      })),
  };
}

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

// Rotating fixtures so repeated "simulate inbound" clicks produce variety.
const SERVICECHANNEL_FIXTURES = [
  {
    subject: "Leak under kitchen sink — Store #4821",
    priority: "High",
    description:
      "Facilities reports active water leak beneath the kitchen prep sink. Requesting emergency dispatch.",
  },
  {
    subject: "HVAC not cooling — Store #1190",
    priority: "Medium",
    description:
      "Rooftop unit 2 blowing warm air. Sales floor at 81F. Requesting service within 24h.",
  },
  {
    subject: "Quarterly PM — Store #3355",
    priority: "Low",
    description: "Scheduled preventive maintenance visit for Q3.",
  },
];

export const serviceChannelAdapter: IntegrationAdapter = defineAdapter({
  provider: "ServiceChannel",
  async connect(conn) {
    return {
      ok: true,
      detail: "ServiceChannel sandbox connected (fixtures only, not live)",
      tokenHint: conn.tokenHint ?? "sc_sandbox_••••1234",
    };
  },
  async authenticate(conn) {
    // Sandbox auth: accepts the stored (masked) token hint, refreshes a fake one.
    return {
      ok: true,
      detail: "Sandbox authentication accepted (no real credentials used)",
      tokenHint: conn.tokenHint ?? "sc_sandbox_••••1234",
    };
  },
  async refresh(conn) {
    return {
      ok: true,
      detail: "ServiceChannel sandbox token rotated (simulated)",
      tokenHint: conn.tokenHint ?? "sc_sandbox_••••1234",
    };
  },
  async inbound(conn) {
    const idx =
      (typeof conn.config.inboundCount === "number"
        ? conn.config.inboundCount
        : 0) % SERVICECHANNEL_FIXTURES.length;
    const fx = SERVICECHANNEL_FIXTURES[idx];
    return {
      eventType: "work_order.create",
      externalId: `SC-WO-${Date.now().toString().slice(-6)}`,
      payload: { ...fx, receivedVia: "ServiceChannel Sandbox" },
    };
  },
  async map(conn, payload) {
    return {
      entityType: "Intake",
      // Inbound external work-order requests are triaged by a human before they
      // become a real work order — mapped to a Draft intake, not auto-scheduled.
      requiresApproval: false,
      mapped: {
        source: "ServiceChannel",
        customerId: str(conn.config.defaultCustomerId),
        locationId: str(conn.config.defaultLocationId) || null,
        priority: str(payload.priority, "Medium"),
        description: `${str(payload.subject)} — ${str(payload.description)}`.trim(),
        suggestedAction: "Review external request and convert to work order",
      },
    };
  },
  async submit(_conn, mapped) {
    return {
      ok: true,
      detail: "Status update accepted by ServiceChannel Sandbox (simulated)",
      externalId: str(mapped.externalId) || `SC-ACK-${Date.now().toString().slice(-6)}`,
    };
  },
});

export const emailIntakeAdapter: IntegrationAdapter = defineAdapter({
  provider: "EmailIntake",
  async authenticate() {
    return {
      ok: true,
      detail: "Mailbox poller ready (simulated — no mailbox connected)",
    };
  },
  async inbound() {
    return {
      eventType: "email.received",
      externalId: `EM-${Date.now().toString().slice(-6)}`,
      payload: {
        from: "facilities@acme-retail.example",
        subject: "Service request: no hot water",
        body: "Hi team, the water heater at our Elm St location stopped working this morning. Please send someone. Thanks.",
      },
    };
  },
  async map(conn, payload) {
    // Naive parse of a simulated inbound email into a triage intake draft.
    const subject = str(payload.subject).replace(/^service request:\s*/i, "");
    return {
      entityType: "Intake",
      // Parsed email requests are low-trust — a person must approve before the
      // draft is created (guards against spam / misattributed customers).
      requiresApproval: true,
      mapped: {
        source: "Email",
        customerId: str(conn.config.defaultCustomerId),
        locationId: str(conn.config.defaultLocationId) || null,
        priority: "Medium",
        description: `${subject || "Inbound email request"} — ${str(payload.body)}`.trim(),
        suggestedAction: "Parsed from inbound email; verify customer/location",
      },
    };
  },
  async submit() {
    return {
      ok: true,
      detail: "Auto-reply captured by dev mail sink (simulated — not sent)",
    };
  },
});

export const genericPortalAdapter: IntegrationAdapter = defineAdapter({
  provider: "GenericPortal",
  async connect(conn) {
    return {
      ok: true,
      detail: "Generic portal sandbox connected (API key accepted)",
      tokenHint: conn.tokenHint ?? "gp_sandbox_••••abcd",
    };
  },
  async authenticate(conn) {
    return {
      ok: true,
      detail: "Generic portal API key accepted (sandbox)",
      tokenHint: conn.tokenHint ?? "gp_sandbox_••••abcd",
    };
  },
  async inbound() {
    return {
      eventType: "ticket.created",
      externalId: `GP-${Date.now().toString().slice(-6)}`,
      payload: {
        title: "Thermostat replacement",
        urgency: "normal",
        notes: "Front office thermostat unresponsive; replace unit.",
      },
    };
  },
  async map(conn, payload) {
    const urgency = str(payload.urgency, "normal").toLowerCase();
    const priority =
      urgency === "urgent" ? "High" : urgency === "low" ? "Low" : "Medium";
    return {
      entityType: "Intake",
      // Generic portal tickets come from an untrusted external source — held for
      // human approval before a draft intake is created.
      requiresApproval: true,
      mapped: {
        source: "Portal",
        customerId: str(conn.config.defaultCustomerId),
        locationId: str(conn.config.defaultLocationId) || null,
        priority,
        description: `${str(payload.title)} — ${str(payload.notes)}`.trim(),
        suggestedAction: "Mapped from generic portal ticket",
      },
    };
  },
  async submit() {
    return {
      ok: true,
      detail: "Ticket update accepted by generic portal (sandbox)",
    };
  },
});

// VoiceConnect: a spoken closeout captured in the field. inbound runs the full
// voice pipeline (STT → language detect → translate → extract) and maps the
// result to a Draft intake for human triage — never an approved closeout,
// preserving the review-before-billing guardrail.
export const voiceConnectAdapter: IntegrationAdapter = defineAdapter({
  provider: "VoiceConnect",
  async authenticate() {
    return {
      ok: true,
      detail: "VoiceConnect pipeline ready (simulated STT/translation)",
    };
  },
  async inbound() {
    const result = await runVoicePipeline(`voice-${Date.now()}`);
    return {
      eventType: "voice.closeout_captured",
      externalId: `VC-${Date.now().toString().slice(-6)}`,
      payload: {
        transcript: result.transcript.text,
        language: result.language.language,
        translated: result.translation.translated,
        summary: result.extraction.summary,
        laborHours: result.extraction.laborHours,
        materials: result.extraction.materials,
        provider: result.transcript.provider,
        simulated: true,
      },
    };
  },
  async map(conn, payload) {
    return {
      entityType: "Intake",
      requiresApproval: false,
      mapped: {
        source: "VoiceConnect",
        customerId: str(conn.config.defaultCustomerId),
        locationId: str(conn.config.defaultLocationId) || null,
        priority: "Medium",
        description: `Voice-captured request: ${str(payload.summary)}`.trim(),
        suggestedAction:
          "Draft from VoiceConnect (simulated STT) — verify before scheduling",
      },
    };
  },
});

// Routing: a GPS/routing provider. inbound produces a labeled ETA estimate
// between two sample points using the straight-line estimator.
export const routingAdapter: IntegrationAdapter = defineAdapter({
  provider: "Routing",
  async authenticate() {
    return {
      ok: true,
      detail: "Routing provider ready (straight-line estimator, no live traffic)",
    };
  },
  async inbound() {
    const eta = await estimateEta(
      { lat: 40.7128, lng: -74.006 },
      { lat: 40.73061, lng: -73.935242 },
    );
    return {
      eventType: "routing.eta_estimate",
      externalId: `RT-${Date.now().toString().slice(-6)}`,
      payload: {
        distanceKm: eta.distanceKm,
        etaMinutes: eta.etaMinutes,
        provider: eta.provider,
        estimated: eta.estimated,
        note: eta.note,
      },
    };
  },
  async map() {
    // Routing estimates are advisory; they are not converted to an intake.
    return { entityType: "None", requiresApproval: false, mapped: {} };
  },
});

const ADAPTERS: Record<string, IntegrationAdapter> = {
  ServiceChannel: serviceChannelAdapter,
  EmailIntake: emailIntakeAdapter,
  GenericPortal: genericPortalAdapter,
  VoiceConnect: voiceConnectAdapter,
  Routing: routingAdapter,
};

export function adapterForProvider(
  provider: string,
): IntegrationAdapter | undefined {
  return ADAPTERS[provider];
}
