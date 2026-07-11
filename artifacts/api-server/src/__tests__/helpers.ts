import { randomUUID } from "node:crypto";
import supertest from "supertest";
import TestAgent from "supertest/lib/agent";
import { db, tenantsTable, usersTable } from "@workspace/db";
import app from "../app";
import type { Role } from "../lib/authz";

// Canonical seeded users (org1) used across suites. IDs come from the seed
// script; roles are asserted here so a seed change that alters them fails loudly.
export const SEED = {
  admin: "u1", // Administrator
  scheduler: "u2", // Scheduler
  serviceManager: "u3", // Service Manager
  technician: "u4", // Technician
  leadTech: "u5", // Lead Technician
  billing: "u8", // Billing
  bookkeeper: "u9", // Bookkeeper
  subcontractor: "u10", // Subcontractor
  supervisor: "u11", // Supervisor
  inventoryManager: "u12", // Inventory Manager
  sales: "u13", // Sales
  portal: "u14", // Customer Portal User (customerId c1)
} as const;

/** Log in as a seeded user via dev-login and return a cookie-persisting agent. */
export async function loginAs(userId: string): Promise<TestAgent> {
  const agent = supertest.agent(app);
  const res = await agent.post("/api/auth/dev-login").send({ userId });
  if (res.status !== 200) {
    throw new Error(
      `dev-login failed for ${userId}: ${res.status} ${JSON.stringify(res.body)}`,
    );
  }
  return agent;
}

/** An agent with no session cookie — used to assert 401 on protected routes. */
export function anon(): TestAgent {
  return supertest.agent(app);
}

export interface SecondTenant {
  tenantId: string;
  adminUserId: string;
}

/**
 * Create an isolated second tenant with its own active administrator so
 * cross-tenant isolation can be verified. dev-login authenticates any active
 * user regardless of password, so no password hash is required.
 */
export async function createSecondTenant(role: Role = "Administrator"): Promise<SecondTenant> {
  const tenantId = `t-test-${randomUUID().slice(0, 8)}`;
  const adminUserId = `u-test-${randomUUID().slice(0, 8)}`;
  await db.insert(tenantsTable).values({ id: tenantId, name: `Test Tenant ${tenantId}` });
  await db.insert(usersTable).values({
    id: adminUserId,
    tenantId,
    email: `${adminUserId}@test.example`,
    name: "Isolation Test Admin",
    role,
    active: true,
    emailVerified: true,
  });
  return { tenantId, adminUserId };
}
