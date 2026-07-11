export type Role =
  | 'Administrator'
  | 'Scheduler'
  | 'Service Manager'
  | 'Technician'
  | 'Lead Technician'
  | 'Billing'
  | 'Bookkeeper'
  | 'Subcontractor';

export type Priority = 'Low' | 'Medium' | 'High' | 'Emergency';

export type WorkOrderStatus =
  | 'New'
  | 'Triage Needed'
  | 'Need Scheduled'
  | 'Scheduled'
  | 'First Trip'
  | 'On Site'
  | 'Awaiting Materials'
  | 'Awaiting Quote Approval'
  | 'Return Trip Needed'
  | 'Completed Pending Review'
  | 'Ready for Billing'
  | 'Invoiced'
  | 'Closed'
  | 'Cancelled';

export type WorkOrderSource =
  | 'ServiceChannel'
  | 'Email'
  | 'Customer Portal'
  | 'Manual'
  | 'Other Portal';

export type PortalSyncStatus =
  | 'Ready to Send'
  | 'Needs Approval'
  | 'Sent'
  | 'Failed'
  | 'Manual Copy Needed';

export type BillingStatus =
  | 'Needs Review'
  | 'Ready for Invoice'
  | 'Missing Info'
  | 'Waiting on Approval'
  | 'Invoiced'
  | 'Paid'
  | 'Past Due';

export type InventoryLocationType =
  | 'Tampa Shop'
  | 'Orlando Shop'
  | 'Office'
  | 'Truck'
  | 'Technician';

export interface User {
  id: string;
  name: string;
  role: Role;
  email: string;
  phone?: string;
  active: boolean;
  zone?: string;
  skills?: string[];
  restrictedTasks?: string[];
  workloadHours?: number;
  capacityHours?: number;
  truckId?: string;
  gpsConsent?: boolean;
  hourlyCost?: number;
}

export interface Contact {
  id: string;
  name: string;
  title: string;
  phone: string;
  email: string;
  primary?: boolean;
}

export interface RateRule {
  id: string;
  label: string;
  laborRate: number;
  afterHoursRate: number;
  notes?: string;
}

export interface Customer {
  id: string;
  name: string;
  industry: string;
  phone: string;
  email: string;
  status: 'Active' | 'Inactive';
  accountManagerId: string;
  tags: string[];
  contacts: Contact[];
  rateRules: RateRule[];
  requirements: string[];
  portalRules: string;
  taxCode: string;
  balance: number;
}

export interface Location {
  id: string;
  customerId: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  region: string;
  notes: string;
}

export interface Trip {
  id: string;
  tripNumber: number;
  technicianId?: string;
  date: string;
  managerOnSite?: string;
  checkIn?: string;
  checkOut?: string;
  workPerformed?: string;
  returnTripReason?: string;
  materialsNeeded?: string;
}

export interface LaborEntry {
  id: string;
  technicianId: string;
  date: string;
  hours: number;
  rate: number;
  type: 'Standard' | 'After Hours' | 'Travel';
  approved: boolean;
}

export interface MaterialEntry {
  id: string;
  inventoryItemId?: string;
  name: string;
  quantity: number;
  cost: number;
  billablePrice: number;
  approved: boolean;
}

export interface Attachment {
  id: string;
  name: string;
  type: 'Photo' | 'PDF' | 'Document';
  uploadedBy: string;
  date: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  author: string;
  message: string;
}

export interface WorkOrder {
  id: string;
  number: string;
  source: WorkOrderSource;
  customerId: string;
  locationId: string;
  poNumber?: string;
  referenceNumber?: string;
  externalId?: string;
  priority: Priority;
  status: WorkOrderStatus;
  type: string;
  region: string;
  dueDate: string;
  billingStatus: BillingStatus;
  accountManagerId?: string;
  serviceManagerId?: string;
  assignedTechnicianId?: string;
  timeWindow?: string;
  description: string;
  importantNotes?: string;
  locationNotes?: string;
  quoteNotes?: string;
  portalSyncStatus: PortalSyncStatus;
  materialsFlag?: boolean;
  quoteFlag?: boolean;
  trips: Trip[];
  labor: LaborEntry[];
  materials: MaterialEntry[];
  attachments: Attachment[];
  internalLog: LogEntry[];
  createdAt: string;
}

export interface IntakeItem {
  id: string;
  source: WorkOrderSource;
  customerId: string;
  locationId?: string;
  priority: Priority;
  requestedDate: string;
  description: string;
  hasAttachments: boolean;
  duplicateOf?: string;
  missingFields: string[];
  suggestedAction: string;
  createdAt: string;
}

export interface InvoiceLine {
  id: string;
  description: string;
  quantity: number;
  rate: number;
}

export interface Invoice {
  id: string;
  number: string;
  workOrderId?: string;
  customerId: string;
  lines: InvoiceLine[];
  amount: number;
  status: BillingStatus;
  issueDate?: string;
  dueDate: string;
  paidDate?: string;
  notes?: string;
  createdAt: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  vendor: string;
  cost: number;
  billablePrice: number;
  quantity: number;
  reorderPoint: number;
  compatibleJobTypes: string[];
  location: InventoryLocationType;
  locationDetail?: string;
  reservedForJob?: string;
  lastUsed?: string;
  notes?: string;
}

export interface Equipment {
  id: string;
  customerId: string;
  locationId: string;
  assetName: string;
  model: string;
  serialNumber: string;
  warrantyInfo: string;
  lastServiced?: string;
  relatedWorkOrderIds: string[];
  notes?: string;
}

export type DocumentType =
  | 'COI'
  | 'W-9'
  | 'Contract'
  | 'Site Instructions'
  | 'Billing Rules'
  | 'Portal Rules';

export interface CustomerDocument {
  id: string;
  customerId: string;
  name: string;
  type: DocumentType;
  expiration?: string;
  visibility: 'All Staff' | 'Managers Only' | 'Billing Only';
  status: 'Valid' | 'Expiring Soon' | 'Expired' | 'Missing';
}

export type RecommendationType =
  | 'Scheduling'
  | 'Overload'
  | 'Missing Info'
  | 'Material'
  | 'Document'
  | 'Billing'
  | 'AR'
  | 'Inventory'
  | 'Profitability';

export interface AIRecommendation {
  id: string;
  type: RecommendationType;
  severity: 'info' | 'warning' | 'urgent';
  title: string;
  description: string;
  confidence: number;
  primaryAction: string;
  relatedEntityId?: string;
  needsApproval: boolean;
}

export interface Closeout {
  id: string;
  workOrderId: string;
  technicianId: string;
  submittedAt: string;
  transcript: string;
  transcriptLanguage: 'English' | 'Spanish';
  translatedSummary?: string;
  aiSummary: string;
  workPerformed: string;
  materialsDetected: string[];
  laborSuggested: string;
  returnTripReason?: string;
  quoteNotes?: string;
  missingInfo: string[];
  customerUpdateText: string;
  billingLines: string[];
  portalUpdateText: string;
  status: 'Pending Review' | 'Approved' | 'Sent Back';
}
