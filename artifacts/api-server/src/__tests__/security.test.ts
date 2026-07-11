import { describe, it, expect } from "vitest";
import { loginAs, anon, createSecondTenant, SEED } from "./helpers";

// Security & isolation: authentication, role/nav authorization, portal
// customer-scoping, and cross-tenant isolation. These are read-only and safe to
// run against the shared seed database.
describe("authentication", () => {
  it("rejects unauthenticated access to protected routes with 401", async () => {
    const res = await anon().get("/api/customers");
    expect(res.status).toBe(401);
  });

  it("allows an authenticated admin to read customers", async () => {
    const admin = await loginAs(SEED.admin);
    const res = await admin.get("/api/customers");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it("exposes the current user via /auth/me and clears it on logout", async () => {
    const admin = await loginAs(SEED.admin);
    const me = await admin.get("/api/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.role).toBe("Administrator");
    await admin.post("/api/auth/logout");
    const after = await admin.get("/api/auth/me");
    expect(after.status).toBe(401);
  });
});

describe("role / nav authorization", () => {
  it("blocks a technician from the audit log (approver-only)", async () => {
    const tech = await loginAs(SEED.technician);
    const res = await tech.get("/api/audit");
    expect(res.status).toBe(403);
  });

  it("allows a service manager to read the audit log", async () => {
    const sm = await loginAs(SEED.serviceManager);
    const res = await sm.get("/api/audit");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("restricts the migration center to administrators", async () => {
    const sm = await loginAs(SEED.serviceManager);
    const denied = await sm.get("/api/migration/batches");
    expect(denied.status).toBe(403);

    const admin = await loginAs(SEED.admin);
    const allowed = await admin.get("/api/migration/batches");
    expect(allowed.status).toBe(200);
  });

  it("only lets administrators enqueue background jobs", async () => {
    const sm = await loginAs(SEED.serviceManager);
    const denied = await sm.post("/api/jobs").send({ type: "recommendations.generate" });
    expect(denied.status).toBe(403);
  });

  it("blocks staff without billing access from recording payments", async () => {
    const scheduler = await loginAs(SEED.scheduler);
    const res = await scheduler.post("/api/payments").send({
      invoiceId: "inv1",
      amount: 100,
      method: "Check",
    });
    expect(res.status).toBe(403);
  });

  it("blocks staff without billing access from creating invoices", async () => {
    // A Scheduler is staff but not a billing role — invoice creation is a
    // human billing decision gated to canManageBilling roles. The 403 fires
    // before any work order is read, so no seed data is mutated.
    const scheduler = await loginAs(SEED.scheduler);
    const res = await scheduler.post("/api/invoices").send({
      workOrderId: "wo7", // seeded "Ready for Invoice" work order
    });
    expect(res.status).toBe(403);
  });

  it("rejects invoicing a work order that is not in a billable state", async () => {
    // wo1 is seeded with billingStatus "Needs Review" — it has not been
    // human-approved for billing, so even a Billing user must be rejected
    // (400, before any invoice row is inserted).
    const billing = await loginAs(SEED.billing);
    const res = await billing.post("/api/invoices").send({
      workOrderId: "wo1",
    });
    expect(res.status).toBe(400);
  });
});

describe("customer portal scoping", () => {
  it("keeps portal users out of internal staff routes", async () => {
    const portal = await loginAs(SEED.portal);
    const res = await portal.get("/api/customers");
    expect(res.status).toBe(403);
  });

  it("lets a portal user read their own scoped profile", async () => {
    const portal = await loginAs(SEED.portal);
    const res = await portal.get("/api/portal/me");
    expect(res.status).toBe(200);
    // The seeded portal user (u14) is linked to customer c1.
    expect(res.body.customerId).toBe("c1");
  });

  it("blocks staff from portal-only routes", async () => {
    const admin = await loginAs(SEED.admin);
    const res = await admin.get("/api/portal/me");
    expect(res.status).toBe(403);
  });
});

describe("cross-tenant isolation", () => {
  it("prevents a second tenant from reading the seed tenant's customers", async () => {
    const { adminUserId } = await createSecondTenant();
    const other = await loginAs(adminUserId);
    const res = await other.get("/api/customers");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    // The fresh tenant owns no customers, so org1's rows must not leak in.
    expect(res.body.length).toBe(0);
  });

  it("returns 404 when a second tenant requests a seed-tenant customer by id", async () => {
    const { adminUserId } = await createSecondTenant();
    const other = await loginAs(adminUserId);
    const res = await other.get("/api/customers/c1");
    expect([403, 404]).toContain(res.status);
  });
});
