import type {
  Customer,
  Location,
  Inventory,
  Intake,
  WorkOrder,
  Closeout,
  InventoryTransaction,
  PurchaseRequest,
  Equipment,
  EquipmentExtraction,
  DocumentRecord,
  DocumentVersion,
  DocumentReminder,
  FileRecord,
} from "@workspace/db";
import type { DerivedBalances } from "./inventory-ledger";

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

/**
 * Map a DB inventory row to the API InventoryItem shape. When `balances` is
 * provided (derived from the transaction ledger), the response includes the
 * per-location breakdown plus total on-hand/reserved/available. `quantity`
 * reflects total on-hand so legacy readers keep working.
 */
export function toInventoryItem(i: Inventory, balances?: DerivedBalances) {
  return {
    id: i.id,
    tenantId: i.tenantId,
    name: i.name,
    category: i.category,
    vendor: i.vendor,
    cost: i.cost,
    billablePrice: i.billablePrice,
    quantity: balances ? balances.onHand : i.quantity,
    reorderPoint: i.reorderPoint,
    compatibleJobTypes: i.compatibleJobTypes,
    location: i.location,
    locationDetail: i.locationDetail ?? null,
    reservedForJob: i.reservedForJob ?? null,
    lastUsed: iso(i.lastUsed),
    notes: i.notes ?? null,
    ...(balances
      ? {
          onHand: balances.onHand,
          reserved: balances.reserved,
          available: balances.available,
          locationBalances: balances.locationBalances,
        }
      : {}),
  };
}

/** Map a DB inventory transaction row to the API InventoryTransaction shape. */
export function toInventoryTransaction(t: InventoryTransaction) {
  return {
    id: t.id,
    tenantId: t.tenantId,
    itemId: t.itemId,
    type: t.type,
    quantity: t.quantity,
    reservedDelta: t.reservedDelta,
    location: t.location,
    toLocation: t.toLocation ?? null,
    workOrderId: t.workOrderId ?? null,
    purchaseRequestId: t.purchaseRequestId ?? null,
    reason: t.reason ?? null,
    overridden: t.overridden,
    actorUserId: t.actorUserId ?? null,
    actorName: t.actorName,
    createdAt: t.createdAt.toISOString(),
  };
}

/** Map a DB purchase request row to the API PurchaseRequest shape. */
export function toPurchaseRequest(p: PurchaseRequest) {
  return {
    id: p.id,
    tenantId: p.tenantId,
    itemId: p.itemId,
    itemName: p.itemName ?? undefined,
    quantity: p.quantity,
    location: p.location ?? null,
    vendor: p.vendor ?? null,
    status: p.status,
    reason: p.reason ?? null,
    requestedByUserId: p.requestedByUserId ?? null,
    requestedByName: p.requestedByName,
    approvedByUserId: p.approvedByUserId ?? null,
    approvedByName: p.approvedByName ?? null,
    approvedAt: iso(p.approvedAt),
    receivedAt: iso(p.receivedAt),
    createdAt: p.createdAt.toISOString(),
  };
}

/** Map a DB equipment row to the API Equipment shape. */
export function toEquipment(e: Equipment) {
  return {
    id: e.id,
    tenantId: e.tenantId,
    customerId: e.customerId,
    locationId: e.locationId,
    assetName: e.assetName,
    manufacturer: e.manufacturer,
    model: e.model,
    serialNumber: e.serialNumber,
    category: e.category,
    condition: e.condition,
    installDate: e.installDate ?? null,
    warrantyInfo: e.warrantyInfo,
    warrantyExpiration: e.warrantyExpiration ?? null,
    lastServiced: e.lastServiced ?? null,
    relatedWorkOrderIds: e.relatedWorkOrderIds,
    serviceHistory: e.serviceHistory,
    partsHistory: e.partsHistory,
    photos: e.photos,
    notes: e.notes ?? null,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}

/** Map a DB equipment extraction row to the API EquipmentExtraction shape. */
export function toEquipmentExtraction(x: EquipmentExtraction) {
  return {
    id: x.id,
    tenantId: x.tenantId,
    equipmentId: x.equipmentId ?? null,
    customerId: x.customerId ?? null,
    locationId: x.locationId ?? null,
    fileId: x.fileId ?? null,
    sourceName: x.sourceName,
    simulated: x.simulated,
    status: x.status,
    extractedFields: x.extractedFields,
    note: x.note ?? null,
    createdByUserId: x.createdByUserId ?? null,
    createdByName: x.createdByName,
    reviewedByUserId: x.reviewedByUserId ?? null,
    reviewedByName: x.reviewedByName ?? null,
    reviewedAt: iso(x.reviewedAt),
    createdAt: x.createdAt.toISOString(),
  };
}

/** Map a DB document row to the API DocumentRecord shape. */
export function toDocument(d: DocumentRecord) {
  return {
    id: d.id,
    tenantId: d.tenantId,
    customerId: d.customerId ?? null,
    name: d.name,
    type: d.type,
    visibility: d.visibility,
    expiration: d.expiration ?? null,
    currentVersion: d.currentVersion,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}

/** Map a DB document version row to the API DocumentVersion shape. */
export function toDocumentVersion(v: DocumentVersion) {
  return {
    id: v.id,
    tenantId: v.tenantId,
    documentId: v.documentId,
    version: v.version,
    fileId: v.fileId ?? null,
    notes: v.notes ?? null,
    uploadedByUserId: v.uploadedByUserId ?? null,
    uploadedByName: v.uploadedByName,
    createdAt: v.createdAt.toISOString(),
  };
}

/** Map a DB document reminder row to the API DocumentReminder shape. */
export function toDocumentReminder(r: DocumentReminder) {
  return {
    id: r.id,
    tenantId: r.tenantId,
    documentId: r.documentId,
    remindAt: r.remindAt,
    reason: r.reason,
    status: r.status,
    createdByUserId: r.createdByUserId ?? null,
    createdByName: r.createdByName,
    createdAt: r.createdAt.toISOString(),
  };
}

/** Map a DB file row to the API FileRecord shape. */
export function toFileRecord(f: FileRecord) {
  return {
    id: f.id,
    tenantId: f.tenantId,
    objectPath: f.objectPath,
    name: f.name,
    contentType: f.contentType,
    size: f.size,
    entityType: f.entityType,
    entityId: f.entityId ?? null,
    version: f.version,
    visibility: f.visibility,
    uploadedByUserId: f.uploadedByUserId ?? null,
    uploadedByName: f.uploadedByName,
    createdAt: f.createdAt.toISOString(),
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
