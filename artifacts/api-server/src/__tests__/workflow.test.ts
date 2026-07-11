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

describe("AR / invoice calculations", () => {
  it("keeps invoice balance consistent with total and amount paid", async () => {
    const billing = await loginAs(SEED.billing);
    const res = await billing.get("/api/invoices");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    for (const inv of res.body) {
      if (
        typeof inv.total === "number" &&
        typeof inv.amountPaid === "number" &&
        typeof inv.balance === "number"
      ) {
        expect(inv.balance).toBeCloseTo(inv.total - inv.amountPaid, 2);
      }
    }
  });
});
