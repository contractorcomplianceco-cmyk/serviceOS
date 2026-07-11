import {
  db,
  pool,
  tenantsTable,
  usersTable,
  customersTable,
  locationsTable,
  inventoryTable,
  inventoryTransactionsTable,
  intakeTable,
  workOrdersTable,
  closeoutsTable,
  equipmentTable,
  documentsTable,
  quotesTable,
  invoicesTable,
  paymentsTable,
  serviceContractsTable,
  recurrenceSchedulesTable,
  notificationTemplatesTable,
  notificationPreferencesTable,
  notificationsTable,
  integrationConnectionsTable,
  integrationEventsTable,
  integrationIdMapTable,
  savedListsTable,
  type InsertSavedList,
  type InsertUser,
  type InsertCustomer,
  type InsertLocation,
  type InsertInventory,
  type InsertIntake,
  type InsertCloseout,
  type InsertEquipment,
  type InsertDocument,
  type InsertQuote,
  type InsertInvoice,
  type InsertPayment,
  type InsertServiceContract,
  type InsertRecurrenceSchedule,
  type InsertNotificationTemplate,
  type InsertNotificationPreference,
  type InsertNotification,
  type InsertIntegrationConnection,
  type InsertIntegrationEvent,
  type InsertIntegrationIdMap,
} from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { hashPassword } from "../lib/auth/password";
import { logger } from "../lib/logger";

const TENANT_ID = "org1";
const TENANT_NAME = "ServiceConnect Field Services";

// Seeded regional "smart lists" — shared, tenant-wide saved queries owned by the
// administrator (u1). Marked isSeeded so the demo can distinguish them from
// user-created lists. Filters use structured clauses interpreted server-side.
const SEED_SAVED_LISTS: Omit<InsertSavedList, "tenantId">[] = [
  {
    id: "sl-tampa-wo",
    name: "Tampa Work Orders",
    entity: "work-orders",
    filters: [{ field: "region", op: "eq", value: "Tampa" }],
    sortField: "priority",
    sortDir: "asc",
    visibility: "shared",
    ownerUserId: "u1",
    favorite: true,
    sortOrder: 0,
    isSeeded: true,
  },
  {
    id: "sl-orlando-wo",
    name: "Orlando Work Orders",
    entity: "work-orders",
    filters: [{ field: "region", op: "eq", value: "Orlando" }],
    sortField: "priority",
    sortDir: "asc",
    visibility: "shared",
    ownerUserId: "u1",
    favorite: true,
    sortOrder: 1,
    isSeeded: true,
  },
  {
    id: "sl-emergency-wo",
    name: "Emergency Work Orders",
    entity: "work-orders",
    filters: [{ field: "priority", op: "eq", value: "Emergency" }],
    sortField: "region",
    sortDir: "asc",
    visibility: "shared",
    ownerUserId: "u1",
    favorite: false,
    sortOrder: 2,
    isSeeded: true,
  },
  {
    id: "sl-open-invoices",
    name: "Open Invoices",
    entity: "invoices",
    filters: [{ field: "status", op: "neq", value: "Paid" }],
    sortField: "number",
    sortDir: "asc",
    visibility: "shared",
    ownerUserId: "u1",
    favorite: false,
    sortOrder: 3,
    isSeeded: true,
  },
];

// Shared demo password for all seeded accounts (>= 8 chars).
// Overridable via env; the default is a dev-only convenience for the local demo.
const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? "password123";

// Deterministic relative dates so the demo always looks "fresh".
const now = Date.now();
const day = 86400000;
const dateOnly = (o: number) =>
  new Date(now + o * day).toISOString().slice(0, 10);
const ts = (o: number) => new Date(now + o * day);
const isoFull = (o: number) => new Date(now + o * day).toISOString();

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

type SeedCustomer = Omit<InsertCustomer, "tenantId">;
const SEED_CUSTOMERS: SeedCustomer[] = [
  { id: "c1", name: "RaceTrac", industry: "Retail / Convenience", phone: "800-555-0101", email: "facilities@racetrac.com", status: "Active", accountManagerId: "u3", tags: ["High Volume", "Net 30", "ServiceChannel"], contacts: [{ id: "ct1", name: "Bill Turner", title: "Regional Facilities Mgr", phone: "800-555-0101", email: "bturner@racetrac.com", primary: true }], rateRules: [{ id: "r1", label: "Standard Plumbing", laborRate: 145, afterHoursRate: 210, notes: "NTE $750 without approval" }], requirements: ["COI on file required", "Check in with store manager", "Photos required at closeout"], portalRules: "All updates via ServiceChannel. Do not email store directly.", taxCode: "FL-HILLS-7.5", balance: 12480.5 },
  { id: "c2", name: "True Food Kitchen", industry: "Restaurant", phone: "800-555-0102", email: "maintenance@truefood.com", status: "Active", accountManagerId: "u3", tags: ["Priority", "Net 15"], contacts: [{ id: "ct2", name: "Dana Cole", title: "GM Tampa", phone: "813-555-0202", email: "dana@truefood.com", primary: true }], rateRules: [{ id: "r2", label: "Restaurant Rate", laborRate: 155, afterHoursRate: 230 }], requirements: ["Service entrance in back", "No work during lunch rush 11-2"], portalRules: "Email GM + upload to customer portal.", taxCode: "FL-HILLS-7.5", balance: 3250 },
  { id: "c3", name: "Ruth's Chris Steakhouse", industry: "Restaurant", phone: "800-555-0103", email: "ops@ruthschris.com", status: "Active", accountManagerId: "u3", tags: ["White Glove"], contacts: [{ id: "ct3", name: "Marco Bianchi", title: "Ops Director", phone: "407-555-0203", email: "marco@ruthschris.com", primary: true }], rateRules: [{ id: "r3", label: "Premium Rate", laborRate: 175, afterHoursRate: 260 }], requirements: ["White glove — no visible work in dining hours"], portalRules: "Manual email approval required before any invoice.", taxCode: "FL-ORANGE-6.5", balance: 8900 },
  { id: "c4", name: "Heartland Dental", industry: "Healthcare", phone: "800-555-0104", email: "facilities@heartland.com", status: "Active", accountManagerId: "u3", tags: ["Compliance Heavy", "Net 30"], contacts: [{ id: "ct4", name: "Priya Nair", title: "Facilities Coordinator", phone: "813-555-0204", email: "priya@heartland.com", primary: true }], rateRules: [{ id: "r4", label: "Healthcare Rate", laborRate: 160, afterHoursRate: 240 }], requirements: ["Background-checked techs only", "W-9 + COI mandatory"], portalRules: "Portal + billing rules doc governs invoicing.", taxCode: "FL-HILLS-7.5", balance: 0 },
  { id: "c5", name: "Cracker Barrel", industry: "Restaurant", phone: "800-555-0105", email: "maint@crackerbarrel.com", status: "Active", accountManagerId: "u3", tags: ["Net 45"], contacts: [{ id: "ct5", name: "Hank Davis", title: "Facilities Mgr", phone: "407-555-0205", email: "hank@crackerbarrel.com", primary: true }], rateRules: [{ id: "r5", label: "Standard Rate", laborRate: 150, afterHoursRate: 225 }], requirements: ["Night service preferred"], portalRules: "Other portal (FMPilot). Manual copy needed.", taxCode: "FL-ORANGE-6.5", balance: 5610.75 },
  { id: "c6", name: "Publix", industry: "Grocery", phone: "800-555-0106", email: "facilities@publix.com", status: "Active", accountManagerId: "u3", tags: ["Enterprise", "High Volume", "Net 30"], contacts: [{ id: "ct6", name: "Renee Fox", title: "Facilities Program Lead", phone: "863-555-0206", email: "renee@publix.com", primary: true }], rateRules: [{ id: "r6", label: "Enterprise Rate", laborRate: 140, afterHoursRate: 205, notes: "Volume discount applied" }], requirements: ["Night service preferred", "Check in with dept manager"], portalRules: "ServiceChannel + internal billing queue.", taxCode: "FL-HILLS-7.5", balance: 21340 },
];

type SeedLocation = Omit<InsertLocation, "tenantId">;
const SEED_LOCATIONS: SeedLocation[] = [
  { id: "l1", customerId: "c1", name: "RaceTrac #145", address: "123 Dale Mabry Hwy", city: "Tampa", state: "FL", zip: "33602", region: "Tampa", notes: "Check in with store manager. Restrooms in back." },
  { id: "l2", customerId: "c1", name: "RaceTrac #212", address: "9800 Colonial Dr", city: "Orlando", state: "FL", zip: "32817", region: "Orlando", notes: "High traffic, service before 6am." },
  { id: "l3", customerId: "c2", name: "True Food Kitchen — Hyde Park", address: "456 W Swann Ave", city: "Tampa", state: "FL", zip: "33609", region: "Tampa", notes: "Service entrance in back alley." },
  { id: "l4", customerId: "c3", name: "Ruth's Chris — Winter Park", address: "610 N Orlando Ave", city: "Winter Park", state: "FL", zip: "32789", region: "Orlando", notes: "Enter via loading dock only." },
  { id: "l5", customerId: "c4", name: "Heartland Dental — Brandon", address: "789 Brandon Blvd", city: "Brandon", state: "FL", zip: "33511", region: "Tampa", notes: "Sign in at front desk, badge required." },
  { id: "l6", customerId: "c5", name: "Cracker Barrel #482", address: "5501 International Dr", city: "Orlando", state: "FL", zip: "32819", region: "Orlando", notes: "Night service preferred." },
  { id: "l7", customerId: "c6", name: "Publix #0842", address: "1600 S Dale Mabry", city: "Tampa", state: "FL", zip: "33629", region: "Tampa", notes: "Night service. Check in with dept manager." },
  { id: "l8", customerId: "c6", name: "Publix #1105", address: "2400 E Colonial Dr", city: "Orlando", state: "FL", zip: "32803", region: "Orlando", notes: "Deli refrigeration critical." },
];

type SeedInventory = Omit<InsertInventory, "tenantId">;
const SEED_INVENTORY: SeedInventory[] = [
  { id: "iv1", name: '1/2" Copper Pipe (10ft)', category: "Pipe", vendor: "Ferguson", cost: 22, billablePrice: 48, quantity: 4, reorderPoint: 10, compatibleJobTypes: ["Plumbing"], location: "Tampa Shop", lastUsed: ts(-2), notes: "Below reorder point" },
  { id: "iv2", name: "Wax Ring Kit", category: "Fittings", vendor: "Ferguson", cost: 4, billablePrice: 14, quantity: 36, reorderPoint: 15, compatibleJobTypes: ["Plumbing"], location: "Tampa Shop" },
  { id: "iv3", name: "T8 Ballast", category: "Electrical", vendor: "Grainger", cost: 18, billablePrice: 42, quantity: 8, reorderPoint: 12, compatibleJobTypes: ["Electrical"], location: "Orlando Shop", lastUsed: ts(-1), notes: "Below reorder point" },
  { id: "iv4", name: "F32T8 Lamp", category: "Electrical", vendor: "Grainger", cost: 3.5, billablePrice: 9, quantity: 60, reorderPoint: 24, compatibleJobTypes: ["Electrical"], location: "Orlando Shop" },
  { id: "iv5", name: "Copeland ZB Compressor", category: "Refrigeration", vendor: "US Air Conditioning", cost: 640, billablePrice: 1150, quantity: 1, reorderPoint: 2, compatibleJobTypes: ["Refrigeration"], location: "Orlando Shop", reservedForJob: "wo6", notes: "Reserved for WO-2026-1039" },
  { id: "iv6", name: "Enzyme Drain Treatment", category: "Chemicals", vendor: "Zep", cost: 15, billablePrice: 35, quantity: 22, reorderPoint: 10, compatibleJobTypes: ["Plumbing"], location: "Truck", locationDetail: "TRK-04 (David Chen)" },
  { id: "iv7", name: "Backflow Test Kit", category: "Tools", vendor: "Watts", cost: 320, billablePrice: 0, quantity: 2, reorderPoint: 1, compatibleJobTypes: ["Backflow"], location: "Truck", locationDetail: "TRK-09 (Luis Ramirez)" },
  { id: "iv8", name: "PVC Cement (Qt)", category: "Chemicals", vendor: "Ferguson", cost: 9, billablePrice: 24, quantity: 5, reorderPoint: 6, compatibleJobTypes: ["Plumbing"], location: "Truck", locationDetail: "TRK-02 (Tony Alvarez)", notes: "Below reorder point" },
  { id: "iv9", name: "HVAC Belt A-42", category: "HVAC", vendor: "Grainger", cost: 12, billablePrice: 30, quantity: 14, reorderPoint: 8, compatibleJobTypes: ["HVAC"], location: "Office" },
  { id: "iv10", name: "Fan Motor 1/3HP", category: "HVAC", vendor: "US Air Conditioning", cost: 145, billablePrice: 320, quantity: 3, reorderPoint: 2, compatibleJobTypes: ["HVAC", "Refrigeration"], location: "Tampa Shop" },
];

type SeedIntake = Omit<InsertIntake, "tenantId">;
const SEED_INTAKE: SeedIntake[] = [
  { id: "in1", source: "ServiceChannel", customerId: "c1", locationId: "l1", priority: "Emergency", requestedDate: dateOnly(0), description: "Water line leak — restrooms flooded.", hasAttachments: true, missingFields: [], suggestedAction: "Create Work Order — Emergency", status: "New" },
  { id: "in2", source: "Email", customerId: "c4", locationId: "l5", priority: "High", requestedDate: dateOnly(1), description: "Operatory sink clog, patient impact.", hasAttachments: false, missingFields: ["PO Number"], suggestedAction: "Request Missing Info (PO)", status: "New" },
  { id: "in3", source: "Other Portal", customerId: "c5", locationId: "l6", priority: "Emergency", requestedDate: dateOnly(0), description: "Walk-in cooler rising temp — FMPilot.", hasAttachments: true, missingFields: [], suggestedAction: "Create Work Order — Orlando", status: "New" },
  { id: "in4", source: "Customer Portal", customerId: "c2", locationId: "l3", priority: "Medium", requestedDate: dateOnly(2), description: "Drain backup again in prep area.", hasAttachments: false, duplicateOf: "wo9", missingFields: [], suggestedAction: "Merge Duplicate with WO-2026-1015", status: "New" },
  { id: "in5", source: "Manual", customerId: "c6", priority: "Low", requestedDate: dateOnly(5), description: "Quarterly preventive maintenance request.", hasAttachments: false, missingFields: ["Location", "Contact"], suggestedAction: "Assign to Scheduler", status: "New" },
  { id: "in6", source: "ServiceChannel", customerId: "c3", locationId: "l4", priority: "High", requestedDate: dateOnly(1), description: "Ice machine not producing. Bar impacted.", hasAttachments: true, missingFields: [], suggestedAction: "Create Work Order", status: "New" },
];

type SeedWorkOrder = Omit<typeof workOrdersTable.$inferInsert, "tenantId">;
const SEED_WORK_ORDERS: SeedWorkOrder[] = [
  { id: "wo1", number: "WO-2026-1042", source: "ServiceChannel", customerId: "c1", locationId: "l1", poNumber: "RT-889210", referenceNumber: "SC-55219", externalId: "SC#55219", priority: "Emergency", status: "Triage Needed", type: "Plumbing", region: "Tampa", dueDate: dateOnly(0), billingStatus: "Needs Review", accountManagerId: "u3", serviceManagerId: "u3", timeWindow: "ASAP", description: "Main water line leak near restrooms. Water shut off currently, store operating on bottled water.", importantNotes: "Store manager Bill onsite. Bring wet/dry vac.", locationNotes: "Shutoff valve behind mop sink.", portalSyncStatus: "Needs Approval", materialsFlag: true, trips: [], labor: [], materials: [], attachments: [{ id: "a1", name: "leak-photo.jpg", type: "Photo", uploadedBy: "Bill Turner", date: isoFull(0) }], internalLog: [{ id: "lg1", timestamp: isoFull(0), author: "System", message: "Imported from ServiceChannel" }], createdAt: ts(0) },
  { id: "wo2", number: "WO-2026-1043", source: "Customer Portal", customerId: "c2", locationId: "l3", poNumber: "TF-4471", referenceNumber: "TFK-2201", priority: "High", status: "Scheduled", type: "HVAC", region: "Tampa", dueDate: dateOnly(0), billingStatus: "Needs Review", accountManagerId: "u3", serviceManagerId: "u3", assignedTechnicianId: "u6", timeWindow: "08:00 AM – 12:00 PM", description: "Kitchen exhaust fan grinding noise. Suspect bearing failure.", importantNotes: "No work 11–2 lunch rush.", locationNotes: "Roof access via ladder in back.", portalSyncStatus: "Sent", trips: [{ id: "t1", tripNumber: 1, technicianId: "u6", date: isoFull(0), managerOnSite: "Dana Cole" }], labor: [], materials: [], attachments: [], internalLog: [{ id: "lg2", timestamp: isoFull(-1), author: "Mike Ross", message: "Scheduled with Tony A." }], createdAt: ts(-1) },
  { id: "wo3", number: "WO-2026-1044", source: "Email", customerId: "c6", locationId: "l7", poNumber: "PBX-99120", priority: "Medium", status: "Completed Pending Review", type: "Electrical", region: "Tampa", dueDate: dateOnly(-1), billingStatus: "Needs Review", accountManagerId: "u3", serviceManagerId: "u3", assignedTechnicianId: "u4", timeWindow: "10:00 PM – 2:00 AM", description: "Replace failed ballasts, aisle 4 & 7 lighting.", portalSyncStatus: "Ready to Send", materialsFlag: true, trips: [{ id: "t2", tripNumber: 1, technicianId: "u4", date: isoFull(-1), checkIn: "10:05 PM", checkOut: "1:20 AM", workPerformed: "Replaced 6 T8 ballasts and 12 lamps." }], labor: [{ id: "lab1", technicianId: "u4", date: isoFull(-1), hours: 3.25, rate: 140, type: "After Hours", approved: false }], materials: [{ id: "m1", name: "T8 Ballast", quantity: 6, cost: 18, billablePrice: 42, approved: false }, { id: "m2", name: "F32T8 Lamp", quantity: 12, cost: 3.5, billablePrice: 9, approved: false }], attachments: [{ id: "a2", name: "before.jpg", type: "Photo", uploadedBy: "David Chen", date: isoFull(-1) }], internalLog: [{ id: "lg3", timestamp: isoFull(-1), author: "David Chen", message: "Work complete, submitted for review." }], createdAt: ts(-3) },
  { id: "wo4", number: "WO-2026-1045", source: "ServiceChannel", customerId: "c4", locationId: "l5", priority: "High", status: "Need Scheduled", type: "Plumbing", region: "Tampa", dueDate: dateOnly(1), billingStatus: "Needs Review", accountManagerId: "u3", serviceManagerId: "u3", description: "Operatory sink clogged, backing up. Affecting patient scheduling.", importantNotes: "Background-checked tech only. Badge at front desk.", portalSyncStatus: "Ready to Send", trips: [], labor: [], materials: [], attachments: [], internalLog: [{ id: "lg4", timestamp: isoFull(0), author: "System", message: "Imported from ServiceChannel" }], createdAt: ts(0) },
  { id: "wo5", number: "WO-2026-1046", source: "Other Portal", customerId: "c5", locationId: "l6", priority: "Emergency", status: "Need Scheduled", type: "Refrigeration", region: "Orlando", dueDate: dateOnly(0), billingStatus: "Needs Review", accountManagerId: "u3", serviceManagerId: "u3", description: "Walk-in cooler temp rising, product at risk. FMPilot ticket.", importantNotes: "Product loss risk — expedite.", portalSyncStatus: "Manual Copy Needed", trips: [], labor: [], materials: [], attachments: [], internalLog: [{ id: "lg5", timestamp: isoFull(0), author: "System", message: "Imported from FMPilot" }], createdAt: ts(0) },
  { id: "wo6", number: "WO-2026-1039", source: "ServiceChannel", customerId: "c6", locationId: "l8", poNumber: "PBX-98800", priority: "High", status: "Awaiting Materials", type: "Refrigeration", region: "Orlando", dueDate: dateOnly(2), billingStatus: "Needs Review", accountManagerId: "u3", serviceManagerId: "u3", assignedTechnicianId: "u5", description: "Deli case compressor intermittent. Needs replacement compressor.", portalSyncStatus: "Sent", materialsFlag: true, trips: [{ id: "t3", tripNumber: 1, technicianId: "u5", date: isoFull(-2), checkIn: "11:00 PM", checkOut: "1:00 AM", workPerformed: "Diagnosed failed compressor. Ordered part.", returnTripReason: "Awaiting compressor delivery", materialsNeeded: "Copeland ZB compressor" }], labor: [{ id: "lab2", technicianId: "u5", date: isoFull(-2), hours: 2, rate: 205, type: "After Hours", approved: true }], materials: [], attachments: [], internalLog: [{ id: "lg6", timestamp: isoFull(-2), author: "Marcus Johnson", message: "Compressor on order, ETA 2 days." }], createdAt: ts(-4) },
  { id: "wo7", number: "WO-2026-1030", source: "Manual", customerId: "c3", locationId: "l4", poNumber: "RC-3320", priority: "Medium", status: "Ready for Billing", type: "Plumbing", region: "Orlando", dueDate: dateOnly(-2), billingStatus: "Ready for Invoice", accountManagerId: "u3", serviceManagerId: "u3", assignedTechnicianId: "u5", description: "Grease trap overflow in kitchen. Pumped and cleared.", portalSyncStatus: "Sent", trips: [{ id: "t4", tripNumber: 1, technicianId: "u5", date: isoFull(-2), checkIn: "9:00 AM", checkOut: "11:30 AM", workPerformed: "Pumped grease trap, cleared line, tested drainage." }], labor: [{ id: "lab3", technicianId: "u5", date: isoFull(-2), hours: 2.5, rate: 175, type: "Standard", approved: true }], materials: [{ id: "m3", name: "Enzyme treatment", quantity: 2, cost: 15, billablePrice: 35, approved: true }], attachments: [{ id: "a3", name: "grease-trap-after.jpg", type: "Photo", uploadedBy: "Marcus Johnson", date: isoFull(-2) }], internalLog: [{ id: "lg7", timestamp: isoFull(-2), author: "Angela Pruitt", message: "Labor + materials approved. Ready to bill." }], createdAt: ts(-5) },
  { id: "wo8", number: "WO-2026-1021", source: "ServiceChannel", customerId: "c1", locationId: "l2", poNumber: "RT-880011", priority: "Low", status: "Invoiced", type: "Backflow", region: "Orlando", dueDate: dateOnly(-8), billingStatus: "Invoiced", accountManagerId: "u3", serviceManagerId: "u3", assignedTechnicianId: "u7", description: "Annual backflow certification test.", portalSyncStatus: "Sent", trips: [{ id: "t5", tripNumber: 1, technicianId: "u7", date: isoFull(-8), checkIn: "7:30 AM", checkOut: "8:45 AM", workPerformed: "Backflow tested and certified. Cert filed with county." }], labor: [{ id: "lab4", technicianId: "u7", date: isoFull(-8), hours: 1.25, rate: 145, type: "Standard", approved: true }], materials: [], attachments: [], internalLog: [], createdAt: ts(-12) },
  { id: "wo9", number: "WO-2026-1015", source: "Customer Portal", customerId: "c2", locationId: "l3", priority: "Medium", status: "Awaiting Quote Approval", type: "Plumbing", region: "Tampa", dueDate: dateOnly(3), billingStatus: "Waiting on Approval", accountManagerId: "u3", serviceManagerId: "u3", assignedTechnicianId: "u4", description: "Recurring drain backups. Recommend hydro-jetting main line + camera inspection.", quoteNotes: "Quote $1,850 for hydro-jet + camera. Awaiting GM approval.", portalSyncStatus: "Needs Approval", quoteFlag: true, trips: [{ id: "t6", tripNumber: 1, technicianId: "u4", date: isoFull(-1), workPerformed: "Snaked line temporarily. Recommend jetting.", returnTripReason: "Return for hydro-jet after approval" }], labor: [], materials: [], attachments: [], internalLog: [{ id: "lg8", timestamp: isoFull(-1), author: "David Chen", message: "Quote submitted, awaiting approval." }], createdAt: ts(-6) },
  { id: "wo10", number: "WO-2026-1048", source: "Email", customerId: "c6", locationId: "l7", priority: "Low", status: "New", type: "General", region: "Tampa", dueDate: dateOnly(4), billingStatus: "Needs Review", accountManagerId: "u3", description: "Faucet drip in employee break room. Non-urgent.", portalSyncStatus: "Ready to Send", trips: [], labor: [], materials: [], attachments: [], internalLog: [], createdAt: ts(0) },
];

type SeedCloseout = Omit<InsertCloseout, "tenantId">;
const SEED_CLOSEOUTS: SeedCloseout[] = [
  {
    id: "co1", workOrderId: "wo3", technicianId: "u4", submittedAt: ts(-1), transcriptLanguage: "English",
    transcript: "Alright, finished up at Publix on Dale Mabry. Replaced six T8 ballasts in aisle four and seven, also swapped twelve lamps that were flickering. Took about three and a quarter hours, worked after hours from ten to about one twenty. Everything tests good. Store manager signed off. Need to bill the ballasts and lamps.",
    aiSummary: "Replaced 6 T8 ballasts (aisles 4 & 7) and 12 F32T8 lamps. After-hours labor 3.25 hrs. All fixtures tested operational, store manager signed off.",
    workPerformed: "Replaced 6 T8 ballasts in aisles 4 and 7, replaced 12 flickering lamps, tested all fixtures.",
    materialsDetected: ["T8 Ballast x6", "F32T8 Lamp x12"], laborSuggested: "3.25 hrs after-hours @ $140",
    missingInfo: [], customerUpdateText: "Lighting repairs completed in aisles 4 and 7. All fixtures operational.",
    billingLines: ["After-hours labor 3.25 hrs — $455.00", "T8 Ballast x6 — $252.00", "F32T8 Lamp x12 — $108.00"],
    portalUpdateText: "Work completed. Photos attached. Requesting closeout approval.", status: "Pending Review",
  },
  {
    id: "co2", workOrderId: "wo7", technicianId: "u5", submittedAt: ts(-2), transcriptLanguage: "Spanish",
    transcript: "Terminé en Ruth's Chris. Bombeé la trampa de grasa, limpié la línea y probé el drenaje. Todo funciona bien. Usé dos tratamientos de enzimas. Dos horas y media de trabajo.",
    translatedSummary: "Finished at Ruth's Chris. Pumped the grease trap, cleared the line, and tested drainage. Everything works fine. Used two enzyme treatments. Two and a half hours of work.",
    aiSummary: "Pumped grease trap, cleared line, tested drainage — all functioning. Used 2 enzyme treatments. 2.5 hrs standard labor.",
    workPerformed: "Pumped grease trap, cleared blocked line, tested drainage flow.",
    materialsDetected: ["Enzyme treatment x2"], laborSuggested: "2.5 hrs standard @ $175",
    missingInfo: [], customerUpdateText: "Grease trap serviced and line cleared. Drainage tested and confirmed.",
    billingLines: ["Standard labor 2.5 hrs — $437.50", "Enzyme treatment x2 — $70.00"],
    portalUpdateText: "Grease trap service complete. Awaiting billing approval.", status: "Pending Review",
  },
];

const SEED_EQUIPMENT: Omit<InsertEquipment, "tenantId">[] = [
  { id: "eq1", customerId: "c6", locationId: "l8", assetName: "Deli Refrigeration Case", model: "Hussmann Q3-DEP", serialNumber: "HUS-88213-A", warrantyInfo: "Parts warranty until 2027-03", lastServiced: dateOnly(-2), relatedWorkOrderIds: ["wo6"], notes: "Compressor replaced under WO-1039." },
  { id: "eq2", customerId: "c2", locationId: "l3", assetName: "Kitchen Exhaust Fan", model: "CaptiveAire NCA-14", serialNumber: "CA-14-55201", warrantyInfo: "Out of warranty", lastServiced: dateOnly(-90), relatedWorkOrderIds: ["wo2"] },
  { id: "eq3", customerId: "c3", locationId: "l4", assetName: "Grease Interceptor", model: "Schier GB-250", serialNumber: "SCH-250-9981", warrantyInfo: "N/A", lastServiced: dateOnly(-2), relatedWorkOrderIds: ["wo7"] },
  { id: "eq4", customerId: "c1", locationId: "l1", assetName: "Backflow Preventer", model: "Watts 909", serialNumber: "W909-33221", warrantyInfo: "5yr, expires 2028", lastServiced: dateOnly(-8), relatedWorkOrderIds: ["wo8"], notes: "Annual cert current." },
  { id: "eq5", customerId: "c4", locationId: "l5", assetName: "Vacuum Pump System", model: "Air Techniques VacStar", serialNumber: "AT-VS-7712", warrantyInfo: "Warranty until 2026-12", relatedWorkOrderIds: [] },
];

const SEED_DOCUMENTS: Omit<InsertDocument, "tenantId">[] = [
  { id: "d1", customerId: "c1", name: "RaceTrac COI 2026", type: "COI", expiration: dateOnly(45), visibility: "Customer Visible" },
  { id: "d2", customerId: "c1", name: "RaceTrac Master Contract", type: "Contract", visibility: "Managers Only" },
  { id: "d3", customerId: "c4", name: "Heartland W-9", type: "W-9", visibility: "Billing Only" },
  { id: "d4", customerId: "c4", name: "Heartland COI", type: "COI", expiration: dateOnly(9), visibility: "Customer Visible" },
  { id: "d5", customerId: "c3", name: "Ruth's Chris Billing Rules", type: "Billing Rules", visibility: "Billing Only" },
  { id: "d6", customerId: "c2", name: "True Food COI", type: "COI", expiration: dateOnly(-5), visibility: "Customer Visible" },
  { id: "d7", customerId: "c5", name: "Cracker Barrel Portal Rules", type: "Portal Rules", visibility: "Customer Visible" },
  { id: "d8", customerId: "c6", name: "Publix Site Instructions", type: "Site Instructions", visibility: "Customer Visible" },
];

type SeedQuote = Omit<InsertQuote, "tenantId">;
const SEED_QUOTES: SeedQuote[] = [
  {
    id: "qt1", customerId: "c1", locationId: "l1", number: "QT-2026-1001",
    title: "Backflow preventer rebuild — RaceTrac #145",
    lines: [
      { id: "ql1", description: "Watts 909 rebuild kit", quantity: 1, rate: 240 },
      { id: "ql2", description: "Certified labor (2 hrs)", quantity: 2, rate: 145 },
    ],
    amount: 530, status: "Sent", notes: "Recommended after annual test flagged wear.", validUntil: dateOnly(20),
  },
  {
    id: "qt2", customerId: "c2", locationId: "l3", workOrderId: "wo9", number: "QT-2026-1002",
    title: "Hydro-jet main line + camera inspection",
    lines: [
      { id: "ql3", description: "Hydro-jetting main line", quantity: 1, rate: 1350 },
      { id: "ql4", description: "Camera inspection", quantity: 1, rate: 500 },
    ],
    amount: 1850, status: "Sent", notes: "Addresses recurring backups in prep area.", validUntil: dateOnly(14),
  },
  {
    id: "qt3", customerId: "c1", locationId: "l2", number: "QT-2026-1003",
    title: "Restroom fixture upgrade — RaceTrac #212",
    lines: [
      { id: "ql5", description: "Low-flow flush valves (4)", quantity: 4, rate: 185 },
      { id: "ql6", description: "Install labor (3 hrs)", quantity: 3, rate: 145 },
    ],
    amount: 1175, status: "Approved", notes: "Approved by facilities.", validUntil: dateOnly(-2),
    decidedAt: ts(-4), decidedByName: "Bill Turner", decisionNote: "Approved — proceed.",
  },
];

type SeedInvoice = Omit<InsertInvoice, "tenantId">;
const SEED_INVOICES: SeedInvoice[] = [
  {
    id: "inv1", customerId: "c1", workOrderId: "wo8", number: "INV-2026-2001",
    lines: [{ id: "il1", description: "Annual backflow certification test — labor 1.25 hrs", quantity: 1.25, rate: 145 }],
    amount: 181.25, amountPaid: 181.25, status: "Paid",
    issueDate: dateOnly(-8), dueDate: dateOnly(22), paidDate: dateOnly(-3),
  },
  {
    id: "inv2", customerId: "c1", number: "INV-2026-2002",
    lines: [{ id: "il2", description: "Emergency water line repair — labor + materials", quantity: 1, rate: 750 }],
    amount: 750, amountPaid: 0, status: "Past Due",
    issueDate: dateOnly(-40), dueDate: dateOnly(-10),
  },
  {
    id: "inv3", customerId: "c3", workOrderId: "wo7", number: "INV-2026-2003",
    lines: [
      { id: "il3", description: "Grease trap service — labor 2.5 hrs", quantity: 2.5, rate: 175 },
      { id: "il4", description: "Enzyme treatment x2", quantity: 2, rate: 35 },
    ],
    amount: 507.5, amountPaid: 0, status: "Invoiced",
    issueDate: dateOnly(-1), dueDate: dateOnly(29),
  },
];

type SeedPayment = Omit<InsertPayment, "tenantId">;
const SEED_PAYMENTS: SeedPayment[] = [
  {
    id: "pay1", invoiceId: "inv1", customerId: "c1", date: dateOnly(-3), amount: 181.25,
    method: "Check", type: "Payment", recordedByUserId: "u8", recordedByName: "Elena Rodriguez",
    note: "Check #40218 — RaceTrac AP.",
  },
];

type SeedContract = Omit<InsertServiceContract, "tenantId">;
const SEED_CONTRACTS: SeedContract[] = [
  {
    id: "sc1", customerId: "c1", locationId: "l1", name: "RaceTrac #145 Preventive Maintenance",
    description: "Monthly plumbing PM + quarterly backflow check.",
    laborRate: 135, afterHoursRate: 195, value: 4800,
    includedServices: ["Monthly plumbing inspection", "Drain treatment", "Quarterly backflow check"],
    coveredEquipmentIds: ["eq4"], startDate: dateOnly(-180), renewalDate: dateOnly(25), status: "Active",
    notes: "Auto-generates monthly maintenance work orders.",
  },
  {
    id: "sc2", customerId: "c6", locationId: "l8", name: "Publix Refrigeration Care Plan",
    description: "Quarterly refrigeration PM for deli cases.",
    laborRate: 130, afterHoursRate: 190, value: 6200,
    includedServices: ["Quarterly refrigeration PM", "Coil cleaning", "Priority dispatch"],
    coveredEquipmentIds: ["eq1"], startDate: dateOnly(-90), renewalDate: dateOnly(120), status: "Active",
  },
];

type SeedRecurrence = Omit<InsertRecurrenceSchedule, "tenantId">;
const SEED_RECURRENCE: SeedRecurrence[] = [
  {
    id: "rs1", contractId: "sc1", customerId: "c1", locationId: "l1",
    title: "Monthly Plumbing PM — RaceTrac #145", description: "Inspect fixtures, treat drains, log findings.",
    workOrderType: "Maintenance", priority: "Medium", frequency: "Monthly", interval: 1,
    weekdays: [], monthDays: [1], blackoutDates: [], timeWindow: "08:00 AM – 12:00 PM",
    assignedTechnicianId: "u4", startDate: dateOnly(-180), occurrenceLimit: null,
    nextRunDate: dateOnly(3), status: "Active",
  },
  {
    id: "rs2", contractId: "sc2", customerId: "c6", locationId: "l8",
    title: "Quarterly Refrigeration PM — Publix #1105", description: "Coil cleaning + compressor check.",
    workOrderType: "Maintenance", priority: "High", frequency: "Quarterly", interval: 1,
    weekdays: [], monthDays: [15], blackoutDates: [], timeWindow: "10:00 PM – 2:00 AM",
    assignedTechnicianId: "u5", startDate: dateOnly(-90), occurrenceLimit: null,
    nextRunDate: dateOnly(10), status: "Active",
  },
];

// --- Phase 2: Notifications & integrations -------------------------------

type SeedNotificationTemplate = Omit<InsertNotificationTemplate, "tenantId">;
const SEED_NOTIFICATION_TEMPLATES: SeedNotificationTemplate[] = [
  { id: "nt1", eventType: "work_order.scheduled", channel: "Email", name: "Work order scheduled (customer email)", subject: "Your service visit {{workOrderNumber}} is scheduled", body: "Hi {{customerName}}, your service ({{workOrderNumber}}) is scheduled for {{scheduledDate}}. Reply to reschedule.", customerFacing: true, enabled: true },
  { id: "nt2", eventType: "work_order.scheduled", channel: "InApp", name: "Work order scheduled (tech in-app)", subject: "New assignment {{workOrderNumber}}", body: "You are assigned to {{workOrderNumber}} on {{scheduledDate}}.", customerFacing: false, enabled: true },
  { id: "nt3", eventType: "work_order.completed", channel: "Email", name: "Work order completed (customer email)", subject: "Service {{workOrderNumber}} complete", body: "Hi {{customerName}}, work order {{workOrderNumber}} is now marked {{status}}. A summary will follow.", customerFacing: true, enabled: true },
  { id: "nt4", eventType: "invoice.issued", channel: "Email", name: "Invoice issued (customer email)", subject: "Invoice {{invoiceNumber}} — {{amount}}", body: "Hi {{customerName}}, invoice {{invoiceNumber}} for {{amount}} is ready. Thank you for your business.", customerFacing: true, enabled: true },
  { id: "nt5", eventType: "closeout.submitted", channel: "InApp", name: "Closeout pending review (manager in-app)", subject: "Closeout awaiting review — {{workOrderNumber}}", body: "A technician submitted a closeout for {{workOrderNumber}} ({{status}}). Review before billing.", customerFacing: false, enabled: true },
  { id: "nt6", eventType: "closeout.approved", channel: "InApp", name: "Closeout approved (tech in-app)", subject: "Closeout approved — {{workOrderNumber}}", body: "Your closeout for {{workOrderNumber}} was {{status}}. Labor and materials are posted.", customerFacing: false, enabled: true },
];

type SeedNotificationPreference = Omit<InsertNotificationPreference, "tenantId">;
const SEED_NOTIFICATION_PREFERENCES: SeedNotificationPreference[] = [
  // David Chen opted out of in-app scheduling pings; everything else defaults on.
  { id: "np1", scope: "user", userId: "u4", eventType: "work_order.scheduled", channel: "InApp", enabled: false },
  // RaceTrac customer prefers portal-only; opt out of SMS on completion.
  { id: "np2", scope: "customer", customerId: "c1", eventType: "work_order.completed", channel: "SMS", enabled: false },
];

type SeedNotification = Omit<InsertNotification, "tenantId">;
const SEED_NOTIFICATIONS: SeedNotification[] = [
  // Unread in-app assignment for tech Marcus.
  { id: "ntf1", eventType: "work_order.scheduled", channel: "InApp", templateId: "nt2", recipientType: "user", recipientUserId: "u5", subject: "New assignment WO-2026-1003", body: "You are assigned to WO-2026-1003 on " + dateOnly(2) + ".", status: "Sent", requiresApproval: "false", sentAt: ts(-1), statusHistory: [{ at: isoFull(-1), status: "Sent", detail: "Delivered to in-app center" }], relatedEntityType: "WorkOrder", relatedEntityId: "wo3" },
  // Unread manager closeout-review ping for Angela.
  { id: "ntf2", eventType: "closeout.submitted", channel: "InApp", templateId: "nt5", recipientType: "user", recipientUserId: "u3", subject: "Closeout awaiting review — WO-2026-1001", body: "A technician submitted a closeout for WO-2026-1001 (Pending Review). Review before billing.", status: "Sent", requiresApproval: "false", sentAt: ts(-0.2), statusHistory: [{ at: isoFull(-0.2), status: "Sent", detail: "Delivered to in-app center" }], relatedEntityType: "Closeout", relatedEntityId: "co1" },
  // Customer-facing email held for approval (HITL) — not yet sent.
  { id: "ntf3", eventType: "invoice.issued", channel: "Email", templateId: "nt4", recipientType: "customer", recipientCustomerId: "c2", recipientAddress: "maintenance@truefood.com", subject: "Invoice INV-2026-2001 — $1,240.00", body: "Hi True Food Kitchen, invoice INV-2026-2001 for $1,240.00 is ready. Thank you for your business.", status: "PendingApproval", requiresApproval: "true", statusHistory: [{ at: isoFull(-0.5), status: "PendingApproval", detail: "Customer-facing — held for approval before sending" }], relatedEntityType: "Invoice", relatedEntityId: "inv1" },
  // A failed email delivery (simulated) that can be retried.
  { id: "ntf4", eventType: "work_order.completed", channel: "Email", templateId: "nt3", recipientType: "customer", recipientCustomerId: "c3", recipientAddress: "ops@ruthschris.com", subject: "Service WO-2026-1002 complete", body: "Hi Ruth's Chris Steakhouse, work order WO-2026-1002 is now marked Completed. A summary will follow.", status: "Failed", requiresApproval: "true", approvedByUserId: "u3", approvedAt: ts(-2), attempts: 3, maxAttempts: 3, lastError: "Simulated transport error (mail-capture adapter)", statusHistory: [{ at: isoFull(-2), status: "Approved", detail: "Approved by manager" }, { at: isoFull(-2), status: "Failed", detail: "Simulated transport error after 3 attempts" }], relatedEntityType: "WorkOrder", relatedEntityId: "wo2" },
  // A previously read in-app note for Marcus (approved closeout).
  { id: "ntf5", eventType: "closeout.approved", channel: "InApp", templateId: "nt6", recipientType: "user", recipientUserId: "u5", subject: "Closeout approved — WO-2026-1002", body: "Your closeout for WO-2026-1002 was Approved. Labor and materials are posted.", status: "Sent", requiresApproval: "false", sentAt: ts(-3), readAt: ts(-2.5), statusHistory: [{ at: isoFull(-3), status: "Sent", detail: "Delivered to in-app center" }], relatedEntityType: "Closeout", relatedEntityId: "co2" },
];

type SeedIntegrationConnection = Omit<InsertIntegrationConnection, "tenantId">;
const SEED_INTEGRATION_CONNECTIONS: SeedIntegrationConnection[] = [
  { id: "ic1", provider: "ServiceChannel", name: "ServiceChannel (Sandbox)", state: "Sandbox", environment: "Sandbox", config: { defaultCustomerId: "c1", defaultLocationId: "l1", inboundCount: 2 }, tokenHint: "sk_sandbox_••••4821", lastInboundAt: ts(-0.5) },
  { id: "ic2", provider: "EmailIntake", name: "Email Intake (Simulated)", state: "Simulated", environment: "Simulation", config: { defaultCustomerId: "c2", defaultLocationId: "l4", mailbox: "dispatch@serviceconnect.app" }, lastInboundAt: ts(-1) },
  { id: "ic3", provider: "GenericPortal", name: "FMPilot Portal (Simulated)", state: "Simulated", environment: "Simulation", config: { defaultCustomerId: "c5", defaultLocationId: "l7", portalName: "FMPilot" } },
  { id: "ic4", provider: "VoiceConnect", name: "VoiceConnect (Simulated STT)", state: "Simulated", environment: "Simulation", config: { defaultCustomerId: "c1", defaultLocationId: "l1" } },
  { id: "ic5", provider: "Routing", name: "Routing Estimator (Straight-line)", state: "Simulated", environment: "Simulation", config: {} },
  { id: "ic6", provider: "GenericPortal", name: "Corrigo Portal (Not Connected)", state: "ConfigurationRequired", environment: "Simulation", config: {}, lastError: "Field mapping not configured" },
];

type SeedIntegrationEvent = Omit<InsertIntegrationEvent, "tenantId">;
const SEED_INTEGRATION_EVENTS: SeedIntegrationEvent[] = [
  // Inbound WO from ServiceChannel, mapped to a draft intake (idempotent via id-map).
  { id: "ie1", connectionId: "ic1", direction: "Inbound", eventType: "work_order.created", externalId: "SC-884210", entityType: "Intake", entityId: "in1", status: "Mapped", requiresApproval: "false", payload: { externalWo: "SC-884210", site: "RaceTrac #145", priority: "High", description: "Backflow preventer leaking in mechanical room" }, mappedPayload: { customerId: "c1", locationId: "l1", priority: "High" }, statusHistory: [{ at: isoFull(-0.5), status: "Received", detail: "Inbound work_order.created received" }, { at: isoFull(-0.5), status: "Mapped", detail: "Mapped to Intake draft" }] },
  // Outbound status update held for approval (HITL — nothing auto-sends).
  { id: "ie2", connectionId: "ic1", direction: "Outbound", eventType: "work_order.status_update", externalId: "SC-884210", entityType: "WorkOrder", entityId: "wo1", status: "PendingApproval", requiresApproval: "true", payload: { externalWo: "SC-884210", status: "In Progress", note: "Technician on site" }, statusHistory: [{ at: isoFull(-0.3), status: "PendingApproval", detail: "Outbound update queued — awaiting approval" }] },
  // Inbound email intake, mapped to a draft.
  { id: "ie3", connectionId: "ic2", direction: "Inbound", eventType: "email.intake", externalId: "EM-55031", entityType: "Intake", entityId: "in2", status: "Mapped", requiresApproval: "false", payload: { from: "dana@truefood.com", subject: "Walk-in cooler not holding temp", body: "Our walk-in is at 52F. Need someone today." }, mappedPayload: { customerId: "c2", locationId: "l4", priority: "High" }, statusHistory: [{ at: isoFull(-1), status: "Received", detail: "Inbound email.intake received" }, { at: isoFull(-1), status: "Mapped", detail: "Mapped to Intake draft" }] },
  // A failed outbound submission that can be retried.
  { id: "ie4", connectionId: "ic3", direction: "Outbound", eventType: "invoice.push", externalId: "FMP-2201", entityType: "Invoice", entityId: "inv1", status: "Failed", requiresApproval: "true", approvedByUserId: "u1", approvedAt: ts(-1), attempts: 2, lastError: "Simulated portal timeout (GenericPortal adapter)", payload: { portal: "FMPilot", invoiceNumber: "INV-2026-2001", amount: 1240 }, statusHistory: [{ at: isoFull(-1), status: "Approved", detail: "Approved by administrator" }, { at: isoFull(-1), status: "Failed", detail: "Simulated portal timeout" }] },
];

type SeedIntegrationIdMap = Omit<InsertIntegrationIdMap, "tenantId">;
const SEED_INTEGRATION_ID_MAP: SeedIntegrationIdMap[] = [
  { id: "im1", connectionId: "ic1", externalId: "SC-884210", entityType: "Intake", entityId: "in1" },
  { id: "im2", connectionId: "ic2", externalId: "EM-55031", entityType: "Intake", entityId: "in2" },
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

  for (const c of SEED_CUSTOMERS) {
    await db
      .insert(customersTable)
      .values({ ...c, tenantId: TENANT_ID })
      .onConflictDoNothing();
  }

  for (const l of SEED_LOCATIONS) {
    await db
      .insert(locationsTable)
      .values({ ...l, tenantId: TENANT_ID })
      .onConflictDoNothing();
  }

  for (const iv of SEED_INVENTORY) {
    await db
      .insert(inventoryTable)
      .values({ ...iv, tenantId: TENANT_ID })
      .onConflictDoNothing();
    // Opening balance as a ledger transaction so on-hand is DERIVED, not
    // denormalized. Guarded so re-seeding never double-posts an opening.
    // Seed rows always define id/location even though the insert type makes
    // them optional (defaults exist).
    const itemId = iv.id!;
    const itemLocation = iv.location!;
    const existing = await db
      .select({ id: inventoryTransactionsTable.id })
      .from(inventoryTransactionsTable)
      .where(
        and(
          eq(inventoryTransactionsTable.tenantId, TENANT_ID),
          eq(inventoryTransactionsTable.itemId, itemId),
          eq(inventoryTransactionsTable.type, "opening"),
        ),
      );
    const openingQty = iv.quantity ?? 0;
    if (existing.length === 0 && openingQty > 0) {
      await db.insert(inventoryTransactionsTable).values({
        tenantId: TENANT_ID,
        itemId,
        type: "opening",
        quantity: openingQty,
        location: itemLocation,
        reason: "Opening balance (seed)",
        actorName: "System",
      });
    }
  }

  for (const wo of SEED_WORK_ORDERS) {
    await db
      .insert(workOrdersTable)
      .values({ ...wo, tenantId: TENANT_ID })
      .onConflictDoNothing();
  }

  for (const it of SEED_INTAKE) {
    await db
      .insert(intakeTable)
      .values({ ...it, tenantId: TENANT_ID })
      .onConflictDoNothing();
  }

  for (const co of SEED_CLOSEOUTS) {
    await db
      .insert(closeoutsTable)
      .values({
        ...co,
        tenantId: TENANT_ID,
        // Immutable snapshot of the AI draft at submission time.
        original: {
          aiSummary: co.aiSummary ?? "",
          workPerformed: co.workPerformed ?? "",
          materialsDetected: co.materialsDetected ?? [],
          laborSuggested: co.laborSuggested ?? "",
          returnTripReason: co.returnTripReason ?? undefined,
          quoteNotes: co.quoteNotes ?? undefined,
          missingInfo: co.missingInfo ?? [],
          customerUpdateText: co.customerUpdateText ?? "",
          billingLines: co.billingLines ?? [],
          portalUpdateText: co.portalUpdateText ?? "",
          transcript: co.transcript ?? "",
          transcriptLanguage:
            (co.transcriptLanguage as "English" | "Spanish") ?? "English",
          translatedSummary: co.translatedSummary ?? undefined,
        },
      })
      .onConflictDoNothing();
  }

  for (const eq of SEED_EQUIPMENT) {
    await db
      .insert(equipmentTable)
      .values({ ...eq, tenantId: TENANT_ID })
      .onConflictDoNothing();
  }

  for (const doc of SEED_DOCUMENTS) {
    await db
      .insert(documentsTable)
      .values({ ...doc, tenantId: TENANT_ID })
      .onConflictDoNothing();
  }

  for (const q of SEED_QUOTES) {
    await db
      .insert(quotesTable)
      .values({ ...q, tenantId: TENANT_ID })
      .onConflictDoNothing();
  }

  for (const inv of SEED_INVOICES) {
    await db
      .insert(invoicesTable)
      .values({ ...inv, tenantId: TENANT_ID })
      .onConflictDoNothing();
  }

  for (const pay of SEED_PAYMENTS) {
    await db
      .insert(paymentsTable)
      .values({ ...pay, tenantId: TENANT_ID })
      .onConflictDoNothing();
  }

  for (const sc of SEED_CONTRACTS) {
    await db
      .insert(serviceContractsTable)
      .values({ ...sc, tenantId: TENANT_ID })
      .onConflictDoNothing();
  }

  for (const rs of SEED_RECURRENCE) {
    await db
      .insert(recurrenceSchedulesTable)
      .values({ ...rs, tenantId: TENANT_ID })
      .onConflictDoNothing();
  }

  for (const nt of SEED_NOTIFICATION_TEMPLATES) {
    await db
      .insert(notificationTemplatesTable)
      .values({ ...nt, tenantId: TENANT_ID })
      .onConflictDoNothing();
  }

  for (const np of SEED_NOTIFICATION_PREFERENCES) {
    await db
      .insert(notificationPreferencesTable)
      .values({ ...np, tenantId: TENANT_ID })
      .onConflictDoNothing();
  }

  for (const ntf of SEED_NOTIFICATIONS) {
    await db
      .insert(notificationsTable)
      .values({ ...ntf, tenantId: TENANT_ID })
      .onConflictDoNothing();
  }

  for (const ic of SEED_INTEGRATION_CONNECTIONS) {
    await db
      .insert(integrationConnectionsTable)
      .values({ ...ic, tenantId: TENANT_ID })
      .onConflictDoNothing();
  }

  for (const ie of SEED_INTEGRATION_EVENTS) {
    await db
      .insert(integrationEventsTable)
      .values({ ...ie, tenantId: TENANT_ID })
      .onConflictDoNothing();
  }

  for (const im of SEED_INTEGRATION_ID_MAP) {
    await db
      .insert(integrationIdMapTable)
      .values({ ...im, tenantId: TENANT_ID })
      .onConflictDoNothing();
  }

  for (const sl of SEED_SAVED_LISTS) {
    await db
      .insert(savedListsTable)
      .values({ ...sl, tenantId: TENANT_ID })
      .onConflictDoNothing();
  }

  logger.info(
    {
      tenant: TENANT_ID,
      users: SEED_USERS.length,
      customers: SEED_CUSTOMERS.length,
      locations: SEED_LOCATIONS.length,
      inventory: SEED_INVENTORY.length,
      workOrders: SEED_WORK_ORDERS.length,
      intake: SEED_INTAKE.length,
      closeouts: SEED_CLOSEOUTS.length,
      equipment: SEED_EQUIPMENT.length,
      documents: SEED_DOCUMENTS.length,
      quotes: SEED_QUOTES.length,
      invoices: SEED_INVOICES.length,
      payments: SEED_PAYMENTS.length,
      contracts: SEED_CONTRACTS.length,
      recurrence: SEED_RECURRENCE.length,
      notificationTemplates: SEED_NOTIFICATION_TEMPLATES.length,
      notificationPreferences: SEED_NOTIFICATION_PREFERENCES.length,
      notifications: SEED_NOTIFICATIONS.length,
      integrationConnections: SEED_INTEGRATION_CONNECTIONS.length,
      integrationEvents: SEED_INTEGRATION_EVENTS.length,
      integrationIdMap: SEED_INTEGRATION_ID_MAP.length,
      savedLists: SEED_SAVED_LISTS.length,
    },
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
