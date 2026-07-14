import { describe, it, expect } from "vitest";
import type TestAgent from "supertest/lib/agent";
import { loginAs, SEED } from "./helpers";

// Workflow, validation, and calculation coverage. Migration tests only ever
// dry-run validate (never import), so they insert a throwaway batch and delete
// it — no seed data is mutated.

async function createBatch(admin: TestAgent, csv: string) {
  const res = await admin.post("/api/migration/batches").send({
    entity: "customers",
    fileName: "test-import.csv",
    csv,
  });
  expect(res.status).toBe(201);
  return res.body.id as string;
}

async function deleteBatch(admin: TestAgent, id: string) {
  await admin.delete(`/api/migration/batches/${id}`);
}

describe("migration dry-run validation", () => {
  it("validates a clean batch and reports row counts without importing", async () => {
    const admin = await loginAs(SEED.admin);
    const id = await createBatch(admin, "name,email\nAcme Test Co,acme@test.example");
    try {
      const res = await admin.post(`/api/migration/batches/${id}/validate`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("Validated");
      expect(res.body.summary.totalRows).toBe(1);
      expect(res.body.summary.validRows).toBe(1);
      expect(res.body.dryRun).toBe(true);
    } finally {
      await deleteBatch(admin, id);
    }
  });

  it("flags rows missing a required field", async () => {
    const admin = await loginAs(SEED.admin);
    // Second row has an empty required "name".
    const id = await createBatch(admin, "name,email\nGood Co,good@test.example\n,missing@test.example");
    try {
      const res = await admin.post(`/api/migration/batches/${id}/validate`);
      expect(res.status).toBe(200);
      expect(res.body.summary.errorRows).toBeGreaterThanOrEqual(1);
    } finally {
      await deleteBatch(admin, id);
    }
  });

  it("detects duplicates against existing records", async () => {
    const admin = await loginAs(SEED.admin);
    // "RaceTrac" already exists in the seed tenant (customer c1).
    const id = await createBatch(admin, "name,email\nRaceTrac,dupe@test.example");
    try {
      const res = await admin.post(`/api/migration/batches/${id}/validate`);
      expect(res.status).toBe(200);
      expect(res.body.summary.duplicateRows).toBeGreaterThanOrEqual(1);
    } finally {
      await deleteBatch(admin, id);
    }
  });

  it("produces an identical summary when validated twice (no side effects)", async () => {
    const admin = await loginAs(SEED.admin);
    const id = await createBatch(admin, "name,email\nRepeatable Co,repeat@test.example");
    try {
      const first = await admin.post(`/api/migration/batches/${id}/validate`);
      const second = await admin.post(`/api/migration/batches/${id}/validate`);
      expect(first.body.summary).toEqual(second.body.summary);
    } finally {
      await deleteBatch(admin, id);
    }
  });

  it("rejects an import before the batch is validated", async () => {
    const admin = await loginAs(SEED.admin);
    const id = await createBatch(admin, "name,email\nUnvalidated Co,unv@test.example");
    try {
      const res = await admin.post(`/api/migration/batches/${id}/import`);
      expect(res.status).toBe(400);
    } finally {
      await deleteBatch(admin, id);
    }
  });
});

describe("audit trail is written on mutations", () => {
  it("records a MigrationBatch 'Created' audit event", async () => {
    const admin = await loginAs(SEED.admin);
    const id = await createBatch(admin, "name,email\nAudit Co,audit@test.example");
    try {
      const res = await admin.get("/api/audit").query({ entityType: "MigrationBatch" });
      expect(res.status).toBe(200);
      const match = res.body.find(
        (e: { entityId: string; action: string }) => e.entityId === id && e.action === "Created",
      );
      expect(match).toBeTruthy();
    } finally {
      await deleteBatch(admin, id);
    }
  });
});

interface ApiInvoice {
  id: string;
  amount: number;
  amountPaid: number;
  status: string;
}

async function getInvoice(billing: TestAgent, id: string): Promise<ApiInvoice> {
  const res = await billing.get("/api/invoices");
  expect(res.status).toBe(200);
  const inv = (res.body as ApiInvoice[]).find((i) => i.id === id);
  expect(inv).toBeTruthy();
  return inv!;
}

describe("AR / invoice calculations", () => {
  it("keeps every invoice's paid amount within its total (balance never negative)", async () => {
    const billing = await loginAs(SEED.billing);
    const res = await billing.get("/api/invoices");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    for (const inv of res.body as ApiInvoice[]) {
      expect(typeof inv.amount).toBe("number");
      expect(typeof inv.amountPaid).toBe("number");
      // amountPaid is clamped to >= 0 on record; balance = amount - amountPaid.
      expect(inv.amountPaid).toBeGreaterThanOrEqual(0);
      expect(inv.amount - inv.amountPaid).toBeGreaterThanOrEqual(0);
    }
  });

  it("applies a payment then a matching refund and returns the invoice to its exact prior balance", async () => {
    const billing = await loginAs(SEED.billing);
    const list = await billing.get("/api/invoices");
    expect(list.status).toBe(200);
    // Pick an invoice with room to accept a $1 payment without fully paying it,
    // so the pay→refund round-trip is deterministic and self-reversing.
    const target = (list.body as ApiInvoice[]).find(
      (i) => i.amount - i.amountPaid >= 2,
    );
    expect(target, "expected a seeded invoice with an open balance >= 2").toBeTruthy();
    const before = target!;

    // 1. Record a $1 payment.
    const pay = await billing.post("/api/payments").send({
      invoiceId: before.id,
      amount: 1,
      method: "Check",
    });
    expect(pay.status).toBe(201);
    const afterPay = await getInvoice(billing, before.id);
    expect(afterPay.amountPaid).toBeCloseTo(before.amountPaid + 1, 2);
    // Balance drops by exactly the payment.
    expect(afterPay.amount - afterPay.amountPaid).toBeCloseTo(
      before.amount - before.amountPaid - 1,
      2,
    );

    // 2. Refund the same $1 — amountPaid must return to its exact prior value.
    const refund = await billing.post("/api/payments").send({
      invoiceId: before.id,
      amount: 1,
      type: "Refund",
    });
    expect(refund.status).toBe(201);
    const afterRefund = await getInvoice(billing, before.id);
    expect(afterRefund.amountPaid).toBeCloseTo(before.amountPaid, 2);
    expect(afterRefund.amount - afterRefund.amountPaid).toBeCloseTo(
      before.amount - before.amountPaid,
      2,
    );
    expect(afterRefund.status).toBe(before.status);
  });

  it("marks an invoice Paid once fully paid, then reverts it to Invoiced on a full refund", async () => {
    const billing = await loginAs(SEED.billing);
    const list = await billing.get("/api/invoices");
    expect(list.status).toBe(200);
    // An 'Invoiced' invoice with an open balance: paying the balance must flip it
    // to 'Paid'; refunding the same amount must revert it to 'Invoiced'. The pair
    // is self-reversing, so it leaves invoice state unchanged.
    const target = (list.body as ApiInvoice[]).find(
      (i) => i.status === "Invoiced" && i.amount - i.amountPaid >= 1,
    );
    expect(
      target,
      "expected a seeded 'Invoiced' invoice with an open balance",
    ).toBeTruthy();
    const before = target!;
    const balance = before.amount - before.amountPaid;

    // 1. Pay the full remaining balance → invoice becomes Paid.
    const pay = await billing.post("/api/payments").send({
      invoiceId: before.id,
      amount: balance,
      method: "Check",
    });
    expect(pay.status).toBe(201);
    const afterPay = await getInvoice(billing, before.id);
    expect(afterPay.status).toBe("Paid");
    expect(afterPay.amountPaid).toBeCloseTo(before.amount, 2);

    // 2. Refund the full balance → the Paid invoice reverts to Invoiced and the
    //    paid amount returns to its exact prior value.
    const refund = await billing.post("/api/payments").send({
      invoiceId: before.id,
      amount: balance,
      type: "Refund",
    });
    expect(refund.status).toBe(201);
    const afterRefund = await getInvoice(billing, before.id);
    expect(afterRefund.status).toBe("Invoiced");
    expect(afterRefund.amountPaid).toBeCloseTo(before.amountPaid, 2);
  });

  it("rejects a payment that exceeds the invoice's remaining balance (400, no state change)", async () => {
    const billing = await loginAs(SEED.billing);
    const list = await billing.get("/api/invoices");
    expect(list.status).toBe(200);
    const target = (list.body as ApiInvoice[]).find(
      (i) => i.amount - i.amountPaid >= 1,
    );
    expect(target, "expected a seeded invoice with an open balance").toBeTruthy();
    const before = target!;
    const balance = before.amount - before.amountPaid;

    // Overpay by $1 over the remaining balance → must be rejected.
    const res = await billing.post("/api/payments").send({
      invoiceId: before.id,
      amount: balance + 1,
      method: "Check",
    });
    expect(res.status).toBe(400);

    // The invoice must be untouched (invariant preserved).
    const after = await getInvoice(billing, before.id);
    expect(after.amountPaid).toBeCloseTo(before.amountPaid, 2);
    expect(after.amount - after.amountPaid).toBeGreaterThanOrEqual(0);
  });

  it("rejects a refund that exceeds the amount already paid (400, no state change)", async () => {
    const billing = await loginAs(SEED.billing);
    const list = await billing.get("/api/invoices");
    expect(list.status).toBe(200);
    // A refund can never exceed amountPaid; using amountPaid + 1 is always over.
    const target = (list.body as ApiInvoice[]).find((i) => i.amount > 0);
    expect(target, "expected a seeded invoice").toBeTruthy();
    const before = target!;

    const res = await billing.post("/api/payments").send({
      invoiceId: before.id,
      amount: before.amountPaid + 1,
      type: "Refund",
    });
    expect(res.status).toBe(400);

    const after = await getInvoice(billing, before.id);
    expect(after.amountPaid).toBeCloseTo(before.amountPaid, 2);
    expect(after.amount - after.amountPaid).toBeGreaterThanOrEqual(0);
  });
});

describe("intake → work order field preservation", () => {
  // A dispatcher enters External ID / PO / NTE / contact / notes ONCE on an
  // intake; every one of those values must survive conversion to the work order.
  const dispatcherFields = {
    externalId: "SC#98765",
    poNumber: "RT-778899",
    nte: 1250.5,
    contact: "Dana Dispatcher, 813-555-0143",
    description: "After-hours HVAC failure — freezer aisle at risk.",
  };

  it("persists dispatcher fields on create and carries them onto the converted work order", async () => {
    const admin = await loginAs(SEED.admin);

    const created = await admin.post("/api/intake").send({
      source: "Manual",
      customerId: "c1",
      locationId: "l1",
      priority: "High",
      requestedDate: "2026-07-20",
      ...dispatcherFields,
    });
    expect(created.status).toBe(201);
    // Fields are persisted on the intake record itself.
    expect(created.body.externalId).toBe(dispatcherFields.externalId);
    expect(created.body.poNumber).toBe(dispatcherFields.poNumber);
    expect(created.body.nte).toBe(dispatcherFields.nte);
    expect(created.body.contact).toBe(dispatcherFields.contact);
    expect(created.body.description).toBe(dispatcherFields.description);

    const convert = await admin.post(`/api/intake/${created.body.id}/convert`);
    expect(convert.status).toBe(200);
    const wo = convert.body;
    // Every dispatcher-entered value must be present on the work order.
    expect(wo.externalId).toBe(dispatcherFields.externalId);
    expect(wo.poNumber).toBe(dispatcherFields.poNumber);
    expect(wo.nte).toBe(dispatcherFields.nte);
    expect(wo.contact).toBe(dispatcherFields.contact);
    expect(wo.description).toBe(dispatcherFields.description);

    // Idempotency: a second convert returns the same work order, still intact.
    const again = await admin.post(`/api/intake/${created.body.id}/convert`);
    expect(again.status).toBe(200);
    expect(again.body.id).toBe(wo.id);
    expect(again.body.externalId).toBe(dispatcherFields.externalId);
    expect(again.body.poNumber).toBe(dispatcherFields.poNumber);
    expect(again.body.nte).toBe(dispatcherFields.nte);
    expect(again.body.contact).toBe(dispatcherFields.contact);
  });
});
