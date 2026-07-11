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
});
