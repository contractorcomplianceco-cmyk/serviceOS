import { describe, it, expect } from "vitest";
import { loginAs, SEED } from "./helpers";

// Human-in-the-loop closeout approval guardrail. Each test builds its own
// isolated work order + closeout, so seed data is never disturbed. Proves:
// nothing auto-approves, only approver roles may approve, and repeated approval
// is idempotent — labor posts once, and (in the materials test) inventory is
// deducted exactly once with a single Consumed audit event.

async function pickLocation(): Promise<{ customerId: string; locationId: string }> {
  const admin = await loginAs(SEED.admin);
  const res = await admin.get("/api/locations");
  expect(res.status).toBe(200);
  expect(res.body.length).toBeGreaterThan(0);
  const loc = res.body[0];
  return { customerId: loc.customerId, locationId: loc.id };
}

async function createWorkOrder(): Promise<string> {
  const admin = await loginAs(SEED.admin);
  const { customerId, locationId } = await pickLocation();
  const res = await admin.post("/api/work-orders").send({
    customerId,
    locationId,
    description: "Integration-test work order for closeout approval",
  });
  expect(res.status).toBe(201);
  return res.body.id as string;
}

async function submitCloseout(workOrderId: string): Promise<string> {
  const tech = await loginAs(SEED.technician);
  const res = await tech.post("/api/closeouts").send({
    workOrderId,
    technicianId: SEED.technician,
    workPerformed: "Test work performed",
    aiSummary: "Test AI summary",
    laborSuggested: "2 hrs standard",
    materialsDetected: [], // no inventory consumption
    customerUpdateText: "Done.",
    transcript: "test transcript",
  });
  expect(res.status).toBe(201);
  expect(res.body.status).toBe("Pending Review");
  return res.body.id as string;
}

describe("closeout approval guardrail (HITL)", () => {
  it("a submitted closeout starts in Pending Review, not auto-approved", async () => {
    const woId = await createWorkOrder();
    const coId = await submitCloseout(woId);
    // Read it back through the approver queue to confirm it is awaiting a human.
    const sm = await loginAs(SEED.serviceManager);
    const list = await sm.get("/api/closeouts");
    expect(list.status).toBe(200);
    const found = list.body.find((c: { id: string }) => c.id === coId);
    expect(found).toBeTruthy();
    expect(found.status).toBe("Pending Review");
  });

  it("blocks a technician (non-approver) from approving", async () => {
    const woId = await createWorkOrder();
    const coId = await submitCloseout(woId);
    const tech = await loginAs(SEED.technician);
    const res = await tech.post(`/api/closeouts/${coId}/approve`);
    expect(res.status).toBe(403);
  });

  it("lets a Service Manager approve, moving the closeout to Approved", async () => {
    const woId = await createWorkOrder();
    const coId = await submitCloseout(woId);
    const sm = await loginAs(SEED.serviceManager);
    const res = await sm.post(`/api/closeouts/${coId}/approve`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("Approved");
    expect(res.body.reviewedBy).toBe(SEED.serviceManager);
  });

  it("is idempotent: repeated approval is a no-op that does not re-post", async () => {
    const woId = await createWorkOrder();
    const coId = await submitCloseout(woId);
    const sm = await loginAs(SEED.serviceManager);

    const first = await sm.post(`/api/closeouts/${coId}/approve`);
    expect(first.status).toBe(200);
    expect(first.body.status).toBe("Approved");
    const firstReviewedAt = first.body.reviewedAt;

    const second = await sm.post(`/api/closeouts/${coId}/approve`);
    expect(second.status).toBe(200);
    expect(second.body.status).toBe("Approved");
    // The no-op returns the already-approved row unchanged — the review
    // timestamp must not move, proving nothing was re-posted.
    expect(second.body.reviewedAt).toBe(firstReviewedAt);

    // The underlying work order must carry exactly one labor entry from the
    // single approval, not two.
    const admin = await loginAs(SEED.admin);
    const wo = await admin.get(`/api/work-orders/${woId}`);
    expect(wo.status).toBe(200);
    const testLabor = wo.body.labor.filter(
      (l: { technicianId: string }) => l.technicianId === SEED.technician,
    );
    expect(testLabor.length).toBe(1);
  });

  it("deducts inventory exactly once on repeated approval and audits the consumption", async () => {
    const admin = await loginAs(SEED.admin);

    // Total on-hand across all items — robust to which item the material matcher
    // picks, and stable because suites run serially and nothing else consumes.
    const sumOnHand = async (): Promise<number> => {
      const inv = await admin.get("/api/inventory");
      expect(inv.status).toBe(200);
      return inv.body.reduce(
        (acc: number, it: { onHand: number }) => acc + it.onHand,
        0,
      );
    };

    // Pick a real stocked item so the closeout's materialsDetected resolves to a
    // ledger consumption (matcher: detected string includes the item name).
    const invRes = await admin.get("/api/inventory");
    expect(invRes.status).toBe(200);
    const stocked = invRes.body.find((it: { onHand: number }) => it.onHand >= 2);
    expect(stocked).toBeTruthy();

    const onHandBefore = await sumOnHand();

    const woId = await createWorkOrder();
    // Capture this work order's unique number so the audit assertion can key on
    // it — robust against Consumed events accumulated by earlier test runs.
    const woRes = await admin.get(`/api/work-orders/${woId}`);
    expect(woRes.status).toBe(200);
    const woNumber = woRes.body.number as string;

    const tech = await loginAs(SEED.technician);
    const submit = await tech.post("/api/closeouts").send({
      workOrderId: woId,
      technicianId: SEED.technician,
      workPerformed: "Replaced part",
      aiSummary: "Test AI summary",
      laborSuggested: "1 hr standard",
      materialsDetected: [`1 ${stocked.name}`],
      customerUpdateText: "Done.",
      transcript: "test transcript",
    });
    expect(submit.status).toBe(201);
    const coId = submit.body.id as string;

    const sm = await loginAs(SEED.serviceManager);
    const first = await sm.post(`/api/closeouts/${coId}/approve`);
    expect(first.status).toBe(200);
    expect(first.body.status).toBe("Approved");
    const second = await sm.post(`/api/closeouts/${coId}/approve`);
    expect(second.status).toBe(200);

    // Exactly one unit consumed despite two approvals — idempotent deduction.
    expect(await sumOnHand()).toBe(onHandBefore - 1);

    // Exactly one Consumed audit event for THIS work order, not two — proving the
    // second (idempotent) approval wrote no additional consumption event. Keyed
    // on the unique WO number and read newest-first, so it is unaffected by
    // Consumed events from prior runs in the shared dev DB.
    const auditRes = await sm.get(
      "/api/audit?entityType=Inventory&action=Consumed&limit=200",
    );
    expect(auditRes.status).toBe(200);
    const forThisWo = auditRes.body.filter((e: { summary: string }) =>
      e.summary.includes(woNumber),
    );
    expect(forThisWo.length).toBe(1);
  });

  it("send-back is locked once a closeout is already approved", async () => {
    const woId = await createWorkOrder();
    const coId = await submitCloseout(woId);
    const sm = await loginAs(SEED.serviceManager);
    await sm.post(`/api/closeouts/${coId}/approve`);
    const res = await sm.post(`/api/closeouts/${coId}/send-back`).send({ reason: "too late" });
    expect(res.status).toBe(409);
  });
});
