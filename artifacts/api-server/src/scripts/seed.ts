import {
  db,
  pool,
  tenantsTable,
  usersTable,
  type InsertUser,
} from "@workspace/db";
import { hashPassword } from "../lib/auth/password";
import { logger } from "../lib/logger";

const TENANT_ID = "org1";
const TENANT_NAME = "ServiceConnect Field Services";

// Shared demo password for all seeded accounts (>= 8 chars).
// Overridable via env; the default is a dev-only convenience for the local demo.
const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? "password123";

type SeedUser = Omit<InsertUser, "tenantId" | "passwordHash" | "passwordAlgo">;

const SEED_USERS: SeedUser[] = [
  { id: "u1", name: "Sarah Jenkins", role: "Administrator", email: "sarah@serviceconnect.app", phone: "813-555-0101", active: true, gpsConsent: true, emailVerified: true },
  { id: "u2", name: "Mike Ross", role: "Scheduler", email: "mike@serviceconnect.app", phone: "813-555-0102", active: true, gpsConsent: true, emailVerified: true },
  { id: "u3", name: "Angela Pruitt", role: "Service Manager", email: "angela@serviceconnect.app", phone: "813-555-0103", active: true, gpsConsent: true, emailVerified: true },
  { id: "u4", name: "David Chen", role: "Technician", email: "david@serviceconnect.app", phone: "813-555-0110", active: true, zone: "Tampa", skills: ["Plumbing", "Backflow", "Drain Cleaning"], restrictedTasks: ["Gas Lines"], workloadHours: 7.5, capacityHours: 8, truckId: "TRK-04", gpsConsent: true, hourlyCost: 42, emailVerified: true },
  { id: "u5", name: "Marcus Johnson", role: "Lead Technician", email: "marcus@serviceconnect.app", phone: "407-555-0111", active: true, zone: "Orlando", skills: ["Plumbing", "Electrical", "Gas Lines", "HVAC"], workloadHours: 6, capacityHours: 8, truckId: "TRK-07", gpsConsent: true, hourlyCost: 55, emailVerified: true },
  { id: "u6", name: "Tony Alvarez", role: "Technician", email: "tony@serviceconnect.app", phone: "813-555-0112", active: true, zone: "Tampa", skills: ["HVAC", "Refrigeration"], workloadHours: 9.5, capacityHours: 8, truckId: "TRK-02", gpsConsent: true, hourlyCost: 45, emailVerified: true },
  { id: "u7", name: "Luis Ramirez", role: "Technician", email: "luis@serviceconnect.app", phone: "407-555-0113", active: true, zone: "Orlando", skills: ["Plumbing", "Drain Cleaning"], workloadHours: 4, capacityHours: 8, truckId: "TRK-09", gpsConsent: false, hourlyCost: 40, emailVerified: true },
  { id: "u8", name: "Elena Rodriguez", role: "Billing", email: "elena@serviceconnect.app", phone: "813-555-0120", active: true, emailVerified: true },
  { id: "u9", name: "Grace Miller", role: "Bookkeeper", email: "grace@serviceconnect.app", phone: "813-555-0121", active: true, emailVerified: true },
  { id: "u10", name: "Rapid Rooter Subs", role: "Subcontractor", email: "dispatch@rapidrooter.com", phone: "813-555-0130", active: true, zone: "Tampa", skills: ["Drain Cleaning", "Excavation"], emailVerified: true },
  // Roles added in Phase 2 to reach full 12-role coverage.
  { id: "u11", name: "Sam Watkins", role: "Supervisor", email: "sam@serviceconnect.app", phone: "813-555-0140", active: true, gpsConsent: true, emailVerified: true },
  { id: "u12", name: "Nina Patel", role: "Inventory Manager", email: "nina@serviceconnect.app", phone: "813-555-0141", active: true, emailVerified: true },
  { id: "u13", name: "Carlos Mendez", role: "Sales", email: "carlos@serviceconnect.app", phone: "813-555-0142", active: true, emailVerified: true },
  // Customer-portal account scoped to a single customer (RaceTrac / c1).
  { id: "u14", name: "Bill Turner", role: "Customer Portal User", email: "bturner@racetrac.com", phone: "800-555-0101", active: true, customerId: "c1", emailVerified: true },
];

async function seed(): Promise<void> {
  await db
    .insert(tenantsTable)
    .values({ id: TENANT_ID, name: TENANT_NAME })
    .onConflictDoNothing();

  const passwordHash = await hashPassword(DEMO_PASSWORD);

  for (const u of SEED_USERS) {
    await db
      .insert(usersTable)
      .values({
        ...u,
        tenantId: TENANT_ID,
        passwordHash,
        passwordAlgo: "argon2id",
      })
      .onConflictDoNothing();
  }

  logger.info(
    { tenant: TENANT_ID, users: SEED_USERS.length },
    "Seed complete (demo password set from DEMO_PASSWORD env or dev default; value not logged)",
  );
}

seed()
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (err) => {
    logger.error({ err }, "Seed failed");
    await pool.end();
    process.exit(1);
  });
