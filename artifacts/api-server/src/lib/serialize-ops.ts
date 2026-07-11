import type {
  Customer,
  Location,
  Inventory,
  Intake,
  WorkOrder,
  Closeout,
} from "@workspace/db";

const iso = (d: Date | null | undefined): string | null =>
  d ? d.toISOString() : null;

/** Map a DB customer row to the API Customer shape. */
export function toCustomer(c: Customer) {
  return {
    id: c.id,
    tenantId: c.tenantId,
    name: c.name,
    industry: c.industry,
    phone: c.phone,
    email: c.email,
    status: c.status,
    accountManagerId: c.accountManagerId,
    tags: c.tags,
    contacts: c.contacts,
    rateRules: c.rateRules,
    requirements: c.requirements,
    portalRules: c.portalRules,
    taxCode: c.taxCode,
    balance: c.balance,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

/** Map a DB location row to the API Location shape. */
export function toLocation(l: Location) {
  return {
    id: l.id,
    tenantId: l.tenantId,
    customerId: l.customerId,
    name: l.name,
    address: l.address,
    city: l.city,
    state: l.state,
    zip: l.zip,
    region: l.region,
    notes: l.notes,
    createdAt: l.createdAt.toISOString(),
    updatedAt: l.updatedAt.toISOString(),
  };
}

/** Map a DB inventory row to the API InventoryItem shape. */
export function toInventoryItem(i: Inventory) {
  return {
    id: i.id,
    tenantId: i.tenantId,
    name: i.name,
    category: i.category,
    vendor: i.vendor,
    cost: i.cost,
    billablePrice: i.billablePrice,
    quantity: i.quantity,
    reorderPoint: i.reorderPoint,
    compatibleJobTypes: i.compatibleJobTypes,
    location: i.location,
    locationDetail: i.locationDetail ?? null,
    reservedForJob: i.reservedForJob ?? null,
    lastUsed: iso(i.lastUsed),
    notes: i.notes ?? null,
  };
}

/** Map a DB intake row to the API IntakeItem shape. */
export function toIntake(i: Intake) {
  return {
    id: i.id,
    tenantId: i.tenantId,
    source: i.source,
    customerId: i.customerId,
    locationId: i.locationId ?? null,
    priority: i.priority,
    requestedDate: i.requestedDate,
    description: i.description,
    hasAttachments: i.hasAttachments,
    duplicateOf: i.duplicateOf ?? null,
    missingFields: i.missingFields,
    suggestedAction: i.suggestedAction,
    status: i.status,
    convertedWorkOrderId: i.convertedWorkOrderId ?? null,
    createdAt: i.createdAt.toISOString(),
  };
}

/** Map a DB work order row to the API WorkOrder shape. */
export function toWorkOrder(w: WorkOrder) {
  return {
    id: w.id,
    tenantId: w.tenantId,
    number: w.number,
    source: w.source,
    customerId: w.customerId,
    locationId: w.locationId,
    poNumber: w.poNumber ?? null,
    referenceNumber: w.referenceNumber ?? null,
    externalId: w.externalId ?? null,
    priority: w.priority,
    status: w.status,
    type: w.type,
    region: w.region,
    dueDate: w.dueDate,
    billingStatus: w.billingStatus,
    accountManagerId: w.accountManagerId ?? null,
    serviceManagerId: w.serviceManagerId ?? null,
    assignedTechnicianId: w.assignedTechnicianId ?? null,
    timeWindow: w.timeWindow ?? null,
    scheduledStart: iso(w.scheduledStart),
    scheduledEnd: iso(w.scheduledEnd),
    scheduleApprovedBy: w.scheduleApprovedBy ?? null,
    scheduleApprovedAt: iso(w.scheduleApprovedAt),
    description: w.description,
    importantNotes: w.importantNotes ?? null,
    locationNotes: w.locationNotes ?? null,
    quoteNotes: w.quoteNotes ?? null,
    portalSyncStatus: w.portalSyncStatus,
    materialsFlag: w.materialsFlag ?? null,
    quoteFlag: w.quoteFlag ?? null,
    trips: w.trips,
    labor: w.labor,
    materials: w.materials,
    expenses: w.expenses,
    attachments: w.attachments,
    internalLog: w.internalLog,
    statusHistory: w.statusHistory,
    createdAt: w.createdAt.toISOString(),
    updatedAt: w.updatedAt.toISOString(),
  };
}

/** Map a DB closeout row to the API Closeout shape. */
export function toCloseout(c: Closeout) {
  return {
    id: c.id,
    tenantId: c.tenantId,
    workOrderId: c.workOrderId,
    technicianId: c.technicianId,
    submittedAt: c.submittedAt.toISOString(),
    transcript: c.transcript,
    transcriptLanguage: c.transcriptLanguage,
    translatedSummary: c.translatedSummary ?? null,
    aiSummary: c.aiSummary,
    workPerformed: c.workPerformed,
    materialsDetected: c.materialsDetected,
    laborSuggested: c.laborSuggested,
    returnTripReason: c.returnTripReason ?? null,
    quoteNotes: c.quoteNotes ?? null,
    missingInfo: c.missingInfo,
    customerUpdateText: c.customerUpdateText,
    billingLines: c.billingLines,
    portalUpdateText: c.portalUpdateText,
    status: c.status,
    reviewedBy: c.reviewedBy ?? null,
    reviewedAt: iso(c.reviewedAt),
    reviewNote: c.reviewNote ?? null,
  };
}
