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
  Quote,
  Invoice,
  Payment,
  ServiceContract,
  ContractReminder,
  RecurrenceSchedule,
  RecurrenceOccurrence,
  Notification,
  NotificationTemplate,
  NotificationPreference,
  IntegrationConnection,
  IntegrationEvent,
  Recommendation,
  Job,
  SavedList,
  MigrationBatch,
  MigrationRow,
  MigrationTemplate,
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

/** Map a DB quote row to the API Quote shape. */
export function toQuote(q: Quote) {
  return {
    id: q.id,
    tenantId: q.tenantId,
    customerId: q.customerId,
    locationId: q.locationId ?? null,
    workOrderId: q.workOrderId ?? null,
    number: q.number,
    title: q.title,
    lines: q.lines,
    amount: q.amount,
    status: q.status,
    notes: q.notes ?? null,
    validUntil: q.validUntil ?? null,
    decidedAt: iso(q.decidedAt),
    decidedByName: q.decidedByName ?? null,
    decisionNote: q.decisionNote ?? null,
    createdAt: q.createdAt.toISOString(),
    updatedAt: q.updatedAt.toISOString(),
  };
}

/** Map a DB invoice row (plus its payments) to the API Invoice shape. */
export function toInvoice(i: Invoice, payments: Payment[] = []) {
  return {
    id: i.id,
    tenantId: i.tenantId,
    customerId: i.customerId,
    workOrderId: i.workOrderId ?? null,
    number: i.number,
    lines: i.lines,
    amount: i.amount,
    amountPaid: i.amountPaid,
    status: i.status,
    issueDate: i.issueDate ?? null,
    dueDate: i.dueDate,
    paidDate: i.paidDate ?? null,
    notes: i.notes ?? null,
    payments: payments.map(toPayment),
    createdAt: i.createdAt.toISOString(),
    updatedAt: i.updatedAt.toISOString(),
  };
}

/** Map a DB payment row to the API Payment shape. */
export function toPayment(p: Payment) {
  return {
    id: p.id,
    tenantId: p.tenantId,
    invoiceId: p.invoiceId,
    customerId: p.customerId,
    date: p.date,
    amount: p.amount,
    method: p.method,
    type: p.type,
    recordedByUserId: p.recordedByUserId ?? null,
    recordedByName: p.recordedByName,
    note: p.note ?? null,
    createdAt: p.createdAt.toISOString(),
  };
}

/** Map a DB service contract row to the API ServiceContract shape. */
export function toServiceContract(c: ServiceContract) {
  return {
    id: c.id,
    tenantId: c.tenantId,
    customerId: c.customerId,
    locationId: c.locationId ?? null,
    name: c.name,
    description: c.description ?? null,
    laborRate: c.laborRate ?? null,
    afterHoursRate: c.afterHoursRate ?? null,
    value: c.value ?? null,
    includedServices: c.includedServices,
    coveredEquipmentIds: c.coveredEquipmentIds,
    startDate: c.startDate,
    renewalDate: c.renewalDate,
    status: c.status,
    notes: c.notes ?? null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

/** Map a DB contract reminder row to the API ContractReminder shape. */
export function toContractReminder(r: ContractReminder) {
  return {
    id: r.id,
    tenantId: r.tenantId,
    contractId: r.contractId,
    customerId: r.customerId,
    type: r.type,
    dueDate: r.dueDate,
    message: r.message,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
  };
}

/** Map a DB recurrence schedule row to the API RecurrenceSchedule shape. */
export function toRecurrenceSchedule(s: RecurrenceSchedule) {
  return {
    id: s.id,
    tenantId: s.tenantId,
    contractId: s.contractId ?? null,
    customerId: s.customerId,
    locationId: s.locationId,
    title: s.title,
    description: s.description ?? null,
    workOrderType: s.workOrderType,
    priority: s.priority,
    frequency: s.frequency,
    interval: s.interval,
    weekdays: s.weekdays,
    monthDays: s.monthDays,
    blackoutDates: s.blackoutDates,
    timeWindow: s.timeWindow ?? null,
    assignedTechnicianId: s.assignedTechnicianId ?? null,
    startDate: s.startDate,
    endDate: s.endDate ?? null,
    occurrenceLimit: s.occurrenceLimit ?? null,
    occurrencesGenerated: s.occurrencesGenerated,
    lastGeneratedDate: s.lastGeneratedDate ?? null,
    nextRunDate: s.nextRunDate ?? null,
    status: s.status,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

/** Map a DB recurrence occurrence row to the API RecurrenceOccurrence shape. */
export function toRecurrenceOccurrence(o: RecurrenceOccurrence) {
  return {
    id: o.id,
    tenantId: o.tenantId,
    scheduleId: o.scheduleId,
    sequence: o.sequence,
    scheduledDate: o.scheduledDate,
    status: o.status,
    workOrderId: o.workOrderId ?? null,
    createdAt: o.createdAt.toISOString(),
  };
}

/** Map a DB notification row to the API Notification shape. */
export function toNotification(n: Notification) {
  return {
    id: n.id,
    tenantId: n.tenantId,
    eventType: n.eventType,
    channel: n.channel,
    templateId: n.templateId ?? null,
    recipientType: n.recipientType,
    recipientUserId: n.recipientUserId ?? null,
    recipientCustomerId: n.recipientCustomerId ?? null,
    recipientAddress: n.recipientAddress ?? null,
    subject: n.subject ?? null,
    body: n.body,
    status: n.status,
    requiresApproval: n.requiresApproval === "true",
    approvedByUserId: n.approvedByUserId ?? null,
    approvedAt: iso(n.approvedAt),
    attempts: n.attempts,
    maxAttempts: n.maxAttempts,
    lastError: n.lastError ?? null,
    nextAttemptAt: iso(n.nextAttemptAt),
    statusHistory: n.statusHistory,
    relatedEntityType: n.relatedEntityType ?? null,
    relatedEntityId: n.relatedEntityId ?? null,
    readAt: iso(n.readAt),
    sentAt: iso(n.sentAt),
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
  };
}

/** Map a DB notification template row to the API shape. */
export function toNotificationTemplate(t: NotificationTemplate) {
  return {
    id: t.id,
    tenantId: t.tenantId,
    eventType: t.eventType,
    channel: t.channel,
    name: t.name,
    subject: t.subject ?? null,
    body: t.body,
    customerFacing: t.customerFacing,
    enabled: t.enabled,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

/** Map a DB notification preference row to the API shape. */
export function toNotificationPreference(p: NotificationPreference) {
  return {
    id: p.id,
    tenantId: p.tenantId,
    scope: p.scope,
    userId: p.userId ?? null,
    customerId: p.customerId ?? null,
    eventType: p.eventType,
    channel: p.channel,
    enabled: p.enabled,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

/** Map a DB integration connection row to the API shape. */
export function toIntegrationConnection(c: IntegrationConnection) {
  return {
    id: c.id,
    tenantId: c.tenantId,
    provider: c.provider,
    name: c.name,
    state: c.state,
    environment: c.environment,
    config: c.config,
    tokenHint: c.tokenHint ?? null,
    lastInboundAt: iso(c.lastInboundAt),
    lastOutboundAt: iso(c.lastOutboundAt),
    lastError: c.lastError ?? null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

/** Map a DB integration event row to the API shape. */
export function toIntegrationEvent(e: IntegrationEvent) {
  return {
    id: e.id,
    tenantId: e.tenantId,
    connectionId: e.connectionId,
    direction: e.direction,
    eventType: e.eventType,
    externalId: e.externalId ?? null,
    entityType: e.entityType ?? null,
    entityId: e.entityId ?? null,
    status: e.status,
    requiresApproval: e.requiresApproval === "true",
    approvedByUserId: e.approvedByUserId ?? null,
    approvedAt: iso(e.approvedAt),
    payload: e.payload,
    mappedPayload: e.mappedPayload ?? null,
    attempts: e.attempts,
    lastError: e.lastError ?? null,
    statusHistory: e.statusHistory,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}

/** Map a DB recommendation row to the API Recommendation shape. */
export function toRecommendation(r: Recommendation) {
  return {
    id: r.id,
    tenantId: r.tenantId,
    dedupeKey: r.dedupeKey,
    ruleKey: r.ruleKey,
    type: r.type,
    severity: r.severity,
    title: r.title,
    description: r.description,
    reason: r.reason,
    evidence: r.evidence,
    confidence: r.confidence,
    suggestedAction: r.suggestedAction,
    relatedEntityType: r.relatedEntityType ?? null,
    relatedEntityId: r.relatedEntityId ?? null,
    status: r.status,
    editedTitle: r.editedTitle ?? null,
    editedDescription: r.editedDescription ?? null,
    assignedToUserId: r.assignedToUserId ?? null,
    snoozeUntil: iso(r.snoozeUntil),
    resolvedByUserId: r.resolvedByUserId ?? null,
    resolvedAt: iso(r.resolvedAt),
    lifecycle: r.lifecycle,
    lastGeneratedAt: r.lastGeneratedAt.toISOString(),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

/** Map a DB job row to the API Job shape. */
export function toJob(j: Job) {
  return {
    id: j.id,
    tenantId: j.tenantId,
    type: j.type,
    status: j.status,
    payload: j.payload,
    result: j.result ?? null,
    runAt: j.runAt.toISOString(),
    attempts: j.attempts,
    maxAttempts: j.maxAttempts,
    lastError: j.lastError ?? null,
    recurringSeconds: j.recurringSeconds ?? null,
    dedupeKey: j.dedupeKey ?? null,
    log: j.log,
    startedAt: iso(j.startedAt),
    finishedAt: iso(j.finishedAt),
    createdByUserId: j.createdByUserId ?? null,
    createdAt: j.createdAt.toISOString(),
    updatedAt: j.updatedAt.toISOString(),
  };
}

/** Map a DB saved-list row to the API SavedList shape. */
export function toSavedList(s: SavedList) {
  return {
    id: s.id,
    tenantId: s.tenantId,
    name: s.name,
    entity: s.entity,
    filters: s.filters,
    search: s.search ?? null,
    sortField: s.sortField ?? null,
    sortDir: s.sortDir,
    visibility: s.visibility,
    roleRestrictions: s.roleRestrictions,
    ownerUserId: s.ownerUserId,
    favorite: s.favorite,
    sortOrder: s.sortOrder,
    isSeeded: s.isSeeded,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

/** Map a DB migration-batch row to the API MigrationBatch shape. */
export function toMigrationBatch(b: MigrationBatch) {
  return {
    id: b.id,
    tenantId: b.tenantId,
    entity: b.entity,
    fileName: b.fileName,
    status: b.status,
    sourceColumns: b.sourceColumns,
    mapping: b.mapping,
    dryRun: b.dryRun,
    summary: b.summary ?? null,
    createdByUserId: b.createdByUserId,
    importedAt: iso(b.importedAt),
    rolledBackAt: iso(b.rolledBackAt),
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  };
}

/** Map a DB migration-row to the API MigrationRow shape. */
export function toMigrationRow(r: MigrationRow) {
  return {
    id: r.id,
    tenantId: r.tenantId,
    batchId: r.batchId,
    rowNumber: r.rowNumber,
    raw: r.raw,
    mapped: r.mapped,
    status: r.status,
    errors: r.errors,
    sourceId: r.sourceId ?? null,
    createdEntityId: r.createdEntityId ?? null,
    createdAt: r.createdAt.toISOString(),
  };
}

/** Map a DB migration-template row to the API MigrationTemplate shape. */
export function toMigrationTemplate(t: MigrationTemplate) {
  return {
    id: t.id,
    tenantId: t.tenantId,
    name: t.name,
    entity: t.entity,
    mapping: t.mapping,
    createdByUserId: t.createdByUserId,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}
