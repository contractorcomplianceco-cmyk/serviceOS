import {
  Customer,
  Location,
  User,
  WorkOrder,
  Invoice,
  AIRecommendation,
  IntakeItem,
  InventoryItem,
  Equipment,
  CustomerDocument,
  Closeout,
} from './types';

const now = Date.now();
const day = 86400000;
const iso = (offsetDays: number) => new Date(now + offsetDays * day).toISOString();

export const mockUsers: User[] = [
  { id: 'u1', name: 'Sarah Jenkins', role: 'Administrator', email: 'sarah@serviceconnect.app', phone: '813-555-0101', active: true, gpsConsent: true },
  { id: 'u2', name: 'Mike Ross', role: 'Scheduler', email: 'mike@serviceconnect.app', phone: '813-555-0102', active: true, gpsConsent: true },
  { id: 'u3', name: 'Angela Pruitt', role: 'Service Manager', email: 'angela@serviceconnect.app', phone: '813-555-0103', active: true, gpsConsent: true },
  { id: 'u4', name: 'David Chen', role: 'Technician', email: 'david@serviceconnect.app', phone: '813-555-0110', active: true, zone: 'Tampa', skills: ['Plumbing', 'Backflow', 'Drain Cleaning'], restrictedTasks: ['Gas Lines'], workloadHours: 7.5, capacityHours: 8, truckId: 'TRK-04', gpsConsent: true, hourlyCost: 42 },
  { id: 'u5', name: 'Marcus Johnson', role: 'Lead Technician', email: 'marcus@serviceconnect.app', phone: '407-555-0111', active: true, zone: 'Orlando', skills: ['Plumbing', 'Electrical', 'Gas Lines', 'HVAC'], workloadHours: 6, capacityHours: 8, truckId: 'TRK-07', gpsConsent: true, hourlyCost: 55 },
  { id: 'u6', name: 'Tony Alvarez', role: 'Technician', email: 'tony@serviceconnect.app', phone: '813-555-0112', active: true, zone: 'Tampa', skills: ['HVAC', 'Refrigeration'], workloadHours: 9.5, capacityHours: 8, truckId: 'TRK-02', gpsConsent: true, hourlyCost: 45 },
  { id: 'u7', name: 'Luis Ramirez', role: 'Technician', email: 'luis@serviceconnect.app', phone: '407-555-0113', active: true, zone: 'Orlando', skills: ['Plumbing', 'Drain Cleaning'], workloadHours: 4, capacityHours: 8, truckId: 'TRK-09', gpsConsent: false, hourlyCost: 40 },
  { id: 'u8', name: 'Elena Rodriguez', role: 'Billing', email: 'elena@serviceconnect.app', phone: '813-555-0120', active: true },
  { id: 'u9', name: 'Grace Miller', role: 'Bookkeeper', email: 'grace@serviceconnect.app', phone: '813-555-0121', active: true },
  { id: 'u10', name: 'Rapid Rooter Subs', role: 'Subcontractor', email: 'dispatch@rapidrooter.com', phone: '813-555-0130', active: true, zone: 'Tampa', skills: ['Drain Cleaning', 'Excavation'] },
];

export const mockCustomers: Customer[] = [
  {
    id: 'c1', name: 'RaceTrac', industry: 'Retail / Convenience', phone: '800-555-0101', email: 'facilities@racetrac.com', status: 'Active', accountManagerId: 'u3', tags: ['High Volume', 'Net 30', 'ServiceChannel'],
    contacts: [{ id: 'ct1', name: 'Bill Turner', title: 'Regional Facilities Mgr', phone: '800-555-0101', email: 'bturner@racetrac.com', primary: true }],
    rateRules: [{ id: 'r1', label: 'Standard Plumbing', laborRate: 145, afterHoursRate: 210, notes: 'NTE $750 without approval' }],
    requirements: ['COI on file required', 'Check in with store manager', 'Photos required at closeout'],
    portalRules: 'All updates via ServiceChannel. Do not email store directly.', taxCode: 'FL-HILLS-7.5', balance: 12480.5,
  },
  {
    id: 'c2', name: 'True Food Kitchen', industry: 'Restaurant', phone: '800-555-0102', email: 'maintenance@truefood.com', status: 'Active', accountManagerId: 'u3', tags: ['Priority', 'Net 15'],
    contacts: [{ id: 'ct2', name: 'Dana Cole', title: 'GM Tampa', phone: '813-555-0202', email: 'dana@truefood.com', primary: true }],
    rateRules: [{ id: 'r2', label: 'Restaurant Rate', laborRate: 155, afterHoursRate: 230 }],
    requirements: ['Service entrance in back', 'No work during lunch rush 11-2'],
    portalRules: 'Email GM + upload to customer portal.', taxCode: 'FL-HILLS-7.5', balance: 3250,
  },
  {
    id: 'c3', name: "Ruth's Chris Steakhouse", industry: 'Restaurant', phone: '800-555-0103', email: 'ops@ruthschris.com', status: 'Active', accountManagerId: 'u3', tags: ['White Glove'],
    contacts: [{ id: 'ct3', name: 'Marco Bianchi', title: 'Ops Director', phone: '407-555-0203', email: 'marco@ruthschris.com', primary: true }],
    rateRules: [{ id: 'r3', label: 'Premium Rate', laborRate: 175, afterHoursRate: 260 }],
    requirements: ['White glove — no visible work in dining hours'],
    portalRules: 'Manual email approval required before any invoice.', taxCode: 'FL-ORANGE-6.5', balance: 8900,
  },
  {
    id: 'c4', name: 'Heartland Dental', industry: 'Healthcare', phone: '800-555-0104', email: 'facilities@heartland.com', status: 'Active', accountManagerId: 'u3', tags: ['Compliance Heavy', 'Net 30'],
    contacts: [{ id: 'ct4', name: 'Priya Nair', title: 'Facilities Coordinator', phone: '813-555-0204', email: 'priya@heartland.com', primary: true }],
    rateRules: [{ id: 'r4', label: 'Healthcare Rate', laborRate: 160, afterHoursRate: 240 }],
    requirements: ['Background-checked techs only', 'W-9 + COI mandatory'],
    portalRules: 'Portal + billing rules doc governs invoicing.', taxCode: 'FL-HILLS-7.5', balance: 0,
  },
  {
    id: 'c5', name: 'Cracker Barrel', industry: 'Restaurant', phone: '800-555-0105', email: 'maint@crackerbarrel.com', status: 'Active', accountManagerId: 'u3', tags: ['Net 45'],
    contacts: [{ id: 'ct5', name: 'Hank Davis', title: 'Facilities Mgr', phone: '407-555-0205', email: 'hank@crackerbarrel.com', primary: true }],
    rateRules: [{ id: 'r5', label: 'Standard Rate', laborRate: 150, afterHoursRate: 225 }],
    requirements: ['Night service preferred'],
    portalRules: 'Other portal (FMPilot). Manual copy needed.', taxCode: 'FL-ORANGE-6.5', balance: 5610.75,
  },
  {
    id: 'c6', name: 'Publix', industry: 'Grocery', phone: '800-555-0106', email: 'facilities@publix.com', status: 'Active', accountManagerId: 'u3', tags: ['Enterprise', 'High Volume', 'Net 30'],
    contacts: [{ id: 'ct6', name: 'Renee Fox', title: 'Facilities Program Lead', phone: '863-555-0206', email: 'renee@publix.com', primary: true }],
    rateRules: [{ id: 'r6', label: 'Enterprise Rate', laborRate: 140, afterHoursRate: 205, notes: 'Volume discount applied' }],
    requirements: ['Night service preferred', 'Check in with dept manager'],
    portalRules: 'ServiceChannel + internal billing queue.', taxCode: 'FL-HILLS-7.5', balance: 21340,
  },
];

export const mockLocations: Location[] = [
  { id: 'l1', customerId: 'c1', name: 'RaceTrac #145', address: '123 Dale Mabry Hwy', city: 'Tampa', state: 'FL', zip: '33602', region: 'Tampa', notes: 'Check in with store manager. Restrooms in back.' },
  { id: 'l2', customerId: 'c1', name: 'RaceTrac #212', address: '9800 Colonial Dr', city: 'Orlando', state: 'FL', zip: '32817', region: 'Orlando', notes: 'High traffic, service before 6am.' },
  { id: 'l3', customerId: 'c2', name: 'True Food Kitchen — Hyde Park', address: '456 W Swann Ave', city: 'Tampa', state: 'FL', zip: '33609', region: 'Tampa', notes: 'Service entrance in back alley.' },
  { id: 'l4', customerId: 'c3', name: "Ruth's Chris — Winter Park", address: '610 N Orlando Ave', city: 'Winter Park', state: 'FL', zip: '32789', region: 'Orlando', notes: 'Enter via loading dock only.' },
  { id: 'l5', customerId: 'c4', name: 'Heartland Dental — Brandon', address: '789 Brandon Blvd', city: 'Brandon', state: 'FL', zip: '33511', region: 'Tampa', notes: 'Sign in at front desk, badge required.' },
  { id: 'l6', customerId: 'c5', name: 'Cracker Barrel #482', address: '5501 International Dr', city: 'Orlando', state: 'FL', zip: '32819', region: 'Orlando', notes: 'Night service preferred.' },
  { id: 'l7', customerId: 'c6', name: 'Publix #0842', address: '1600 S Dale Mabry', city: 'Tampa', state: 'FL', zip: '33629', region: 'Tampa', notes: 'Night service. Check in with dept manager.' },
  { id: 'l8', customerId: 'c6', name: 'Publix #1105', address: '2400 E Colonial Dr', city: 'Orlando', state: 'FL', zip: '32803', region: 'Orlando', notes: 'Deli refrigeration critical.' },
];

const emptyOps = { trips: [], labor: [], materials: [], attachments: [], internalLog: [] };

export const mockWorkOrders: WorkOrder[] = [
  {
    id: 'wo1', number: 'WO-2026-1042', source: 'ServiceChannel', customerId: 'c1', locationId: 'l1', poNumber: 'RT-889210', referenceNumber: 'SC-55219', externalId: 'SC#55219',
    priority: 'Emergency', status: 'Triage Needed', type: 'Plumbing', region: 'Tampa', dueDate: iso(0), billingStatus: 'Needs Review', accountManagerId: 'u3', serviceManagerId: 'u3',
    timeWindow: 'ASAP', description: 'Main water line leak near restrooms. Water shut off currently, store operating on bottled water.',
    importantNotes: 'Store manager Bill onsite. Bring wet/dry vac.', locationNotes: 'Shutoff valve behind mop sink.',
    portalSyncStatus: 'Needs Approval', materialsFlag: true,
    trips: [], labor: [], materials: [], attachments: [{ id: 'a1', name: 'leak-photo.jpg', type: 'Photo', uploadedBy: 'Bill Turner', date: iso(0) }],
    internalLog: [{ id: 'lg1', timestamp: iso(0), author: 'System', message: 'Imported from ServiceChannel' }], createdAt: iso(0),
  },
  {
    id: 'wo2', number: 'WO-2026-1043', source: 'Customer Portal', customerId: 'c2', locationId: 'l3', poNumber: 'TF-4471', referenceNumber: 'TFK-2201',
    priority: 'High', status: 'Scheduled', type: 'HVAC', region: 'Tampa', dueDate: iso(0), billingStatus: 'Needs Review', accountManagerId: 'u3', serviceManagerId: 'u3', assignedTechnicianId: 'u6',
    timeWindow: '08:00 AM – 12:00 PM', description: 'Kitchen exhaust fan grinding noise. Suspect bearing failure.',
    importantNotes: 'No work 11–2 lunch rush.', locationNotes: 'Roof access via ladder in back.',
    portalSyncStatus: 'Sent', ...emptyOps,
    trips: [{ id: 't1', tripNumber: 1, technicianId: 'u6', date: iso(0), managerOnSite: 'Dana Cole' }],
    internalLog: [{ id: 'lg2', timestamp: iso(-1), author: 'Mike Ross', message: 'Scheduled with Tony A.' }], createdAt: iso(-1),
  },
  {
    id: 'wo3', number: 'WO-2026-1044', source: 'Email', customerId: 'c6', locationId: 'l7', poNumber: 'PBX-99120',
    priority: 'Medium', status: 'Completed Pending Review', type: 'Electrical', region: 'Tampa', dueDate: iso(-1), billingStatus: 'Needs Review', accountManagerId: 'u3', serviceManagerId: 'u3', assignedTechnicianId: 'u4',
    timeWindow: '10:00 PM – 2:00 AM', description: 'Replace failed ballasts, aisle 4 & 7 lighting.',
    portalSyncStatus: 'Ready to Send', materialsFlag: true,
    trips: [{ id: 't2', tripNumber: 1, technicianId: 'u4', date: iso(-1), checkIn: '10:05 PM', checkOut: '1:20 AM', workPerformed: 'Replaced 6 T8 ballasts and 12 lamps.' }],
    labor: [{ id: 'lab1', technicianId: 'u4', date: iso(-1), hours: 3.25, rate: 140, type: 'After Hours', approved: false }],
    materials: [{ id: 'm1', name: 'T8 Ballast', quantity: 6, cost: 18, billablePrice: 42, approved: false }, { id: 'm2', name: 'F32T8 Lamp', quantity: 12, cost: 3.5, billablePrice: 9, approved: false }],
    attachments: [{ id: 'a2', name: 'before.jpg', type: 'Photo', uploadedBy: 'David Chen', date: iso(-1) }],
    internalLog: [{ id: 'lg3', timestamp: iso(-1), author: 'David Chen', message: 'Work complete, submitted for review.' }], createdAt: iso(-3),
  },
  {
    id: 'wo4', number: 'WO-2026-1045', source: 'ServiceChannel', customerId: 'c4', locationId: 'l5',
    priority: 'High', status: 'Need Scheduled', type: 'Plumbing', region: 'Tampa', dueDate: iso(1), billingStatus: 'Needs Review', accountManagerId: 'u3', serviceManagerId: 'u3',
    description: 'Operatory sink clogged, backing up. Affecting patient scheduling.',
    importantNotes: 'Background-checked tech only. Badge at front desk.', portalSyncStatus: 'Ready to Send', ...emptyOps,
    internalLog: [{ id: 'lg4', timestamp: iso(0), author: 'System', message: 'Imported from ServiceChannel' }], createdAt: iso(0),
  },
  {
    id: 'wo5', number: 'WO-2026-1046', source: 'Other Portal', customerId: 'c5', locationId: 'l6',
    priority: 'Emergency', status: 'Need Scheduled', type: 'Refrigeration', region: 'Orlando', dueDate: iso(0), billingStatus: 'Needs Review', accountManagerId: 'u3', serviceManagerId: 'u3',
    description: 'Walk-in cooler temp rising, product at risk. FMPilot ticket.', importantNotes: 'Product loss risk — expedite.', portalSyncStatus: 'Manual Copy Needed', ...emptyOps,
    internalLog: [{ id: 'lg5', timestamp: iso(0), author: 'System', message: 'Imported from FMPilot' }], createdAt: iso(0),
  },
  {
    id: 'wo6', number: 'WO-2026-1039', source: 'ServiceChannel', customerId: 'c6', locationId: 'l8', poNumber: 'PBX-98800',
    priority: 'High', status: 'Awaiting Materials', type: 'Refrigeration', region: 'Orlando', dueDate: iso(2), billingStatus: 'Needs Review', accountManagerId: 'u3', serviceManagerId: 'u3', assignedTechnicianId: 'u5',
    description: 'Deli case compressor intermittent. Needs replacement compressor.', portalSyncStatus: 'Sent', materialsFlag: true,
    trips: [{ id: 't3', tripNumber: 1, technicianId: 'u5', date: iso(-2), checkIn: '11:00 PM', checkOut: '1:00 AM', workPerformed: 'Diagnosed failed compressor. Ordered part.', returnTripReason: 'Awaiting compressor delivery', materialsNeeded: 'Copeland ZB compressor' }],
    labor: [{ id: 'lab2', technicianId: 'u5', date: iso(-2), hours: 2, rate: 205, type: 'After Hours', approved: true }],
    materials: [], attachments: [], internalLog: [{ id: 'lg6', timestamp: iso(-2), author: 'Marcus Johnson', message: 'Compressor on order, ETA 2 days.' }], createdAt: iso(-4),
  },
  {
    id: 'wo7', number: 'WO-2026-1030', source: 'Manual', customerId: 'c3', locationId: 'l4', poNumber: 'RC-3320',
    priority: 'Medium', status: 'Ready for Billing', type: 'Plumbing', region: 'Orlando', dueDate: iso(-2), billingStatus: 'Ready for Invoice', accountManagerId: 'u3', serviceManagerId: 'u3', assignedTechnicianId: 'u5',
    description: 'Grease trap overflow in kitchen. Pumped and cleared.', portalSyncStatus: 'Sent',
    trips: [{ id: 't4', tripNumber: 1, technicianId: 'u5', date: iso(-2), checkIn: '9:00 AM', checkOut: '11:30 AM', workPerformed: 'Pumped grease trap, cleared line, tested drainage.' }],
    labor: [{ id: 'lab3', technicianId: 'u5', date: iso(-2), hours: 2.5, rate: 175, type: 'Standard', approved: true }],
    materials: [{ id: 'm3', name: 'Enzyme treatment', quantity: 2, cost: 15, billablePrice: 35, approved: true }],
    attachments: [{ id: 'a3', name: 'grease-trap-after.jpg', type: 'Photo', uploadedBy: 'Marcus Johnson', date: iso(-2) }],
    internalLog: [{ id: 'lg7', timestamp: iso(-2), author: 'Angela Pruitt', message: 'Labor + materials approved. Ready to bill.' }], createdAt: iso(-5),
  },
  {
    id: 'wo8', number: 'WO-2026-1021', source: 'ServiceChannel', customerId: 'c1', locationId: 'l2', poNumber: 'RT-880011',
    priority: 'Low', status: 'Invoiced', type: 'Backflow', region: 'Orlando', dueDate: iso(-8), billingStatus: 'Invoiced', accountManagerId: 'u3', serviceManagerId: 'u3', assignedTechnicianId: 'u7',
    description: 'Annual backflow certification test.', portalSyncStatus: 'Sent',
    trips: [{ id: 't5', tripNumber: 1, technicianId: 'u7', date: iso(-8), checkIn: '7:30 AM', checkOut: '8:45 AM', workPerformed: 'Backflow tested and certified. Cert filed with county.' }],
    labor: [{ id: 'lab4', technicianId: 'u7', date: iso(-8), hours: 1.25, rate: 145, type: 'Standard', approved: true }],
    materials: [], attachments: [], internalLog: [], createdAt: iso(-12),
  },
  {
    id: 'wo9', number: 'WO-2026-1015', source: 'Customer Portal', customerId: 'c2', locationId: 'l3',
    priority: 'Medium', status: 'Awaiting Quote Approval', type: 'Plumbing', region: 'Tampa', dueDate: iso(3), billingStatus: 'Waiting on Approval', accountManagerId: 'u3', serviceManagerId: 'u3', assignedTechnicianId: 'u4',
    description: 'Recurring drain backups. Recommend hydro-jetting main line + camera inspection.',
    quoteNotes: 'Quote $1,850 for hydro-jet + camera. Awaiting GM approval.', portalSyncStatus: 'Needs Approval', quoteFlag: true,
    trips: [{ id: 't6', tripNumber: 1, technicianId: 'u4', date: iso(-1), workPerformed: 'Snaked line temporarily. Recommend jetting.', returnTripReason: 'Return for hydro-jet after approval' }],
    labor: [], materials: [], attachments: [], internalLog: [{ id: 'lg8', timestamp: iso(-1), author: 'David Chen', message: 'Quote submitted, awaiting approval.' }], createdAt: iso(-6),
  },
  {
    id: 'wo10', number: 'WO-2026-1048', source: 'Email', customerId: 'c6', locationId: 'l7',
    priority: 'Low', status: 'New', type: 'General', region: 'Tampa', dueDate: iso(4), billingStatus: 'Needs Review', accountManagerId: 'u3',
    description: 'Faucet drip in employee break room. Non-urgent.', portalSyncStatus: 'Ready to Send', ...emptyOps,
    internalLog: [], createdAt: iso(0),
  },
];

export const mockIntakeItems: IntakeItem[] = [
  { id: 'in1', source: 'ServiceChannel', customerId: 'c1', locationId: 'l1', priority: 'Emergency', requestedDate: iso(0), description: 'Water line leak — restrooms flooded.', hasAttachments: true, missingFields: [], suggestedAction: 'Create Work Order — Emergency', createdAt: iso(0) },
  { id: 'in2', source: 'Email', customerId: 'c4', locationId: 'l5', priority: 'High', requestedDate: iso(1), description: 'Operatory sink clog, patient impact.', hasAttachments: false, missingFields: ['PO Number'], suggestedAction: 'Request Missing Info (PO)', createdAt: iso(0) },
  { id: 'in3', source: 'Other Portal', customerId: 'c5', locationId: 'l6', priority: 'Emergency', requestedDate: iso(0), description: 'Walk-in cooler rising temp — FMPilot.', hasAttachments: true, missingFields: [], suggestedAction: 'Create Work Order — Orlando', createdAt: iso(0) },
  { id: 'in4', source: 'Customer Portal', customerId: 'c2', locationId: 'l3', priority: 'Medium', requestedDate: iso(2), description: 'Drain backup again in prep area.', hasAttachments: false, duplicateOf: 'wo9', missingFields: [], suggestedAction: 'Merge Duplicate with WO-2026-1015', createdAt: iso(0) },
  { id: 'in5', source: 'Manual', customerId: 'c6', priority: 'Low', requestedDate: iso(5), description: 'Quarterly preventive maintenance request.', hasAttachments: false, missingFields: ['Location', 'Contact'], suggestedAction: 'Assign to Scheduler', createdAt: iso(0) },
  { id: 'in6', source: 'ServiceChannel', customerId: 'c3', locationId: 'l4', priority: 'High', requestedDate: iso(1), description: 'Ice machine not producing. Bar impacted.', hasAttachments: true, missingFields: [], suggestedAction: 'Create Work Order', createdAt: iso(0) },
];

export const mockInventory: InventoryItem[] = [
  { id: 'iv1', name: '1/2" Copper Pipe (10ft)', category: 'Pipe', vendor: 'Ferguson', cost: 22, billablePrice: 48, quantity: 4, reorderPoint: 10, compatibleJobTypes: ['Plumbing'], location: 'Tampa Shop', lastUsed: iso(-2), notes: 'Below reorder point' },
  { id: 'iv2', name: 'Wax Ring Kit', category: 'Fittings', vendor: 'Ferguson', cost: 4, billablePrice: 14, quantity: 36, reorderPoint: 15, compatibleJobTypes: ['Plumbing'], location: 'Tampa Shop' },
  { id: 'iv3', name: 'T8 Ballast', category: 'Electrical', vendor: 'Grainger', cost: 18, billablePrice: 42, quantity: 8, reorderPoint: 12, compatibleJobTypes: ['Electrical'], location: 'Orlando Shop', lastUsed: iso(-1), notes: 'Below reorder point' },
  { id: 'iv4', name: 'F32T8 Lamp', category: 'Electrical', vendor: 'Grainger', cost: 3.5, billablePrice: 9, quantity: 60, reorderPoint: 24, compatibleJobTypes: ['Electrical'], location: 'Orlando Shop' },
  { id: 'iv5', name: 'Copeland ZB Compressor', category: 'Refrigeration', vendor: 'US Air Conditioning', cost: 640, billablePrice: 1150, quantity: 1, reorderPoint: 2, compatibleJobTypes: ['Refrigeration'], location: 'Orlando Shop', reservedForJob: 'wo6', notes: 'Reserved for WO-2026-1039' },
  { id: 'iv6', name: 'Enzyme Drain Treatment', category: 'Chemicals', vendor: 'Zep', cost: 15, billablePrice: 35, quantity: 22, reorderPoint: 10, compatibleJobTypes: ['Plumbing'], location: 'Truck', locationDetail: 'TRK-04 (David Chen)' },
  { id: 'iv7', name: 'Backflow Test Kit', category: 'Tools', vendor: 'Watts', cost: 320, billablePrice: 0, quantity: 2, reorderPoint: 1, compatibleJobTypes: ['Backflow'], location: 'Truck', locationDetail: 'TRK-09 (Luis Ramirez)' },
  { id: 'iv8', name: 'PVC Cement (Qt)', category: 'Chemicals', vendor: 'Ferguson', cost: 9, billablePrice: 24, quantity: 5, reorderPoint: 6, compatibleJobTypes: ['Plumbing'], location: 'Truck', locationDetail: 'TRK-02 (Tony Alvarez)', notes: 'Below reorder point' },
  { id: 'iv9', name: 'HVAC Belt A-42', category: 'HVAC', vendor: 'Grainger', cost: 12, billablePrice: 30, quantity: 14, reorderPoint: 8, compatibleJobTypes: ['HVAC'], location: 'Office' },
  { id: 'iv10', name: 'Fan Motor 1/3HP', category: 'HVAC', vendor: 'US Air Conditioning', cost: 145, billablePrice: 320, quantity: 3, reorderPoint: 2, compatibleJobTypes: ['HVAC', 'Refrigeration'], location: 'Tampa Shop' },
];

export const mockEquipment: Equipment[] = [
  { id: 'eq1', customerId: 'c6', locationId: 'l8', assetName: 'Deli Refrigeration Case', model: 'Hussmann Q3-DEP', serialNumber: 'HUS-88213-A', warrantyInfo: 'Parts warranty until 2027-03', lastServiced: iso(-2), relatedWorkOrderIds: ['wo6'], notes: 'Compressor replaced under WO-1039.' },
  { id: 'eq2', customerId: 'c2', locationId: 'l3', assetName: 'Kitchen Exhaust Fan', model: 'CaptiveAire NCA-14', serialNumber: 'CA-14-55201', warrantyInfo: 'Out of warranty', lastServiced: iso(-90), relatedWorkOrderIds: ['wo2'] },
  { id: 'eq3', customerId: 'c3', locationId: 'l4', assetName: 'Grease Interceptor', model: 'Schier GB-250', serialNumber: 'SCH-250-9981', warrantyInfo: 'N/A', lastServiced: iso(-2), relatedWorkOrderIds: ['wo7'] },
  { id: 'eq4', customerId: 'c1', locationId: 'l1', assetName: 'Backflow Preventer', model: 'Watts 909', serialNumber: 'W909-33221', warrantyInfo: '5yr, expires 2028', lastServiced: iso(-8), relatedWorkOrderIds: ['wo8'], notes: 'Annual cert current.' },
  { id: 'eq5', customerId: 'c4', locationId: 'l5', assetName: 'Vacuum Pump System', model: 'Air Techniques VacStar', serialNumber: 'AT-VS-7712', warrantyInfo: 'Warranty until 2026-12', relatedWorkOrderIds: [] },
];

export const mockDocuments: CustomerDocument[] = [
  { id: 'd1', customerId: 'c1', name: 'RaceTrac COI 2026', type: 'COI', expiration: iso(45), visibility: 'All Staff', status: 'Valid' },
  { id: 'd2', customerId: 'c1', name: 'RaceTrac Master Contract', type: 'Contract', visibility: 'Managers Only', status: 'Valid' },
  { id: 'd3', customerId: 'c4', name: 'Heartland W-9', type: 'W-9', visibility: 'Billing Only', status: 'Valid' },
  { id: 'd4', customerId: 'c4', name: 'Heartland COI', type: 'COI', expiration: iso(9), visibility: 'All Staff', status: 'Expiring Soon' },
  { id: 'd5', customerId: 'c3', name: "Ruth's Chris Billing Rules", type: 'Billing Rules', visibility: 'Billing Only', status: 'Valid' },
  { id: 'd6', customerId: 'c2', name: 'True Food COI', type: 'COI', expiration: iso(-5), visibility: 'All Staff', status: 'Expired' },
  { id: 'd7', customerId: 'c5', name: 'Cracker Barrel Portal Rules', type: 'Portal Rules', visibility: 'All Staff', status: 'Valid' },
  { id: 'd8', customerId: 'c6', name: 'Publix Site Instructions', type: 'Site Instructions', visibility: 'All Staff', status: 'Valid' },
];

export const mockInvoices: Invoice[] = [
  { id: 'inv1', number: 'INV-5001', workOrderId: 'wo8', customerId: 'c1', lines: [{ id: 'il1', description: 'Backflow certification test', quantity: 1.25, rate: 145 }], amount: 181.25, status: 'Invoiced', issueDate: iso(-7), dueDate: iso(23), createdAt: iso(-7) },
  { id: 'inv2', number: 'INV-4980', workOrderId: undefined, customerId: 'c6', lines: [{ id: 'il2', description: 'Refrigeration service — deli', quantity: 4, rate: 205 }], amount: 820, status: 'Past Due', issueDate: iso(-40), dueDate: iso(-10), createdAt: iso(-40) },
  { id: 'inv3', number: 'INV-4990', customerId: 'c1', lines: [{ id: 'il3', description: 'Plumbing repair — store #212', quantity: 3, rate: 145 }], amount: 435, status: 'Past Due', issueDate: iso(-55), dueDate: iso(-25), createdAt: iso(-55) },
  { id: 'inv4', number: 'INV-5002', workOrderId: 'wo7', customerId: 'c3', lines: [{ id: 'il4', description: 'Grease trap service', quantity: 2.5, rate: 175 }, { id: 'il5', description: 'Enzyme treatment', quantity: 2, rate: 35 }], amount: 507.5, status: 'Ready for Invoice', dueDate: iso(28), createdAt: iso(-1) },
  { id: 'inv5', number: 'INV-4975', customerId: 'c6', lines: [{ id: 'il6', description: 'Monthly PM — 6 stores', quantity: 6, rate: 140 }], amount: 840, status: 'Paid', issueDate: iso(-30), dueDate: iso(0), paidDate: iso(-3), createdAt: iso(-30) },
  { id: 'inv6', number: 'INV-4960', customerId: 'c5', lines: [{ id: 'il7', description: 'HVAC repair', quantity: 3.5, rate: 150 }], amount: 525, status: 'Past Due', issueDate: iso(-65), dueDate: iso(-35), createdAt: iso(-65) },
];

export const mockCloseouts: Closeout[] = [
  {
    id: 'co1', workOrderId: 'wo3', technicianId: 'u4', submittedAt: iso(-1), transcriptLanguage: 'English',
    transcript: "Alright, finished up at Publix on Dale Mabry. Replaced six T8 ballasts in aisle four and seven, also swapped twelve lamps that were flickering. Took about three and a quarter hours, worked after hours from ten to about one twenty. Everything tests good. Store manager signed off. Need to bill the ballasts and lamps.",
    aiSummary: 'Replaced 6 T8 ballasts (aisles 4 & 7) and 12 F32T8 lamps. After-hours labor 3.25 hrs. All fixtures tested operational, store manager signed off.',
    workPerformed: 'Replaced 6 T8 ballasts in aisles 4 and 7, replaced 12 flickering lamps, tested all fixtures.',
    materialsDetected: ['T8 Ballast x6', 'F32T8 Lamp x12'], laborSuggested: '3.25 hrs after-hours @ $140',
    missingInfo: [], customerUpdateText: 'Lighting repairs completed in aisles 4 and 7. All fixtures operational.',
    billingLines: ['After-hours labor 3.25 hrs — $455.00', 'T8 Ballast x6 — $252.00', 'F32T8 Lamp x12 — $108.00'],
    portalUpdateText: 'Work completed. Photos attached. Requesting closeout approval.', status: 'Pending Review',
  },
  {
    id: 'co2', workOrderId: 'wo7', technicianId: 'u5', submittedAt: iso(-2), transcriptLanguage: 'Spanish',
    transcript: 'Terminé en Ruth\'s Chris. Bombeé la trampa de grasa, limpié la línea y probé el drenaje. Todo funciona bien. Usé dos tratamientos de enzimas. Dos horas y media de trabajo.',
    translatedSummary: 'Finished at Ruth\'s Chris. Pumped the grease trap, cleared the line, and tested drainage. Everything works fine. Used two enzyme treatments. Two and a half hours of work.',
    aiSummary: 'Pumped grease trap, cleared line, tested drainage — all functioning. Used 2 enzyme treatments. 2.5 hrs standard labor.',
    workPerformed: 'Pumped grease trap, cleared blocked line, tested drainage flow.',
    materialsDetected: ['Enzyme treatment x2'], laborSuggested: '2.5 hrs standard @ $175',
    missingInfo: [], customerUpdateText: 'Grease trap serviced and line cleared. Drainage tested and confirmed.',
    billingLines: ['Standard labor 2.5 hrs — $437.50', 'Enzyme treatment x2 — $70.00'],
    portalUpdateText: 'Grease trap service complete. Awaiting billing approval.', status: 'Pending Review',
  },
];

export const mockRecommendations: AIRecommendation[] = [
  { id: 'rec1', type: 'Scheduling', severity: 'urgent', title: 'Emergency job needs scheduling', description: 'WO-2026-1042 (RaceTrac water leak) is unassigned. RoseOS suggests David Chen — 8 min drive, has drain skills, capacity available.', confidence: 94, primaryAction: 'Assign', relatedEntityId: 'wo1', needsApproval: true },
  { id: 'rec2', type: 'Overload', severity: 'warning', title: 'Technician overload warning', description: 'Tony Alvarez is booked 9.5 hrs against an 8 hr capacity today. Consider reassigning one HVAC job.', confidence: 88, primaryAction: 'Rebalance', relatedEntityId: 'u6', needsApproval: true },
  { id: 'rec3', type: 'Material', severity: 'warning', title: 'Job awaiting materials', description: 'WO-2026-1039 (Publix compressor) is blocked pending Copeland ZB compressor delivery (ETA 2 days).', confidence: 100, primaryAction: 'Review', relatedEntityId: 'wo6', needsApproval: false },
  { id: 'rec4', type: 'Billing', severity: 'info', title: 'Jobs ready for billing review', description: 'WO-2026-1030 (Ruth\'s Chris) has approved labor + materials and is ready for invoicing.', confidence: 100, primaryAction: 'Review', relatedEntityId: 'wo7', needsApproval: true },
  { id: 'rec5', type: 'Document', severity: 'urgent', title: 'Customer document expired', description: 'True Food Kitchen COI expired 5 days ago. Jobs at this customer may be non-compliant.', confidence: 100, primaryAction: 'Request', relatedEntityId: 'c2', needsApproval: false },
  { id: 'rec6', type: 'Inventory', severity: 'warning', title: 'Inventory below reorder point', description: '1/2" Copper Pipe (4 left, reorder at 10) and T8 Ballast (8 left, reorder at 12) are low. RoseOS suggests a reorder.', confidence: 97, primaryAction: 'Reorder', needsApproval: true },
  { id: 'rec7', type: 'AR', severity: 'warning', title: 'AR risk — aging invoices', description: '3 invoices totaling $1,780 are past due (RaceTrac, Publix, Cracker Barrel). Publix INV-4980 is 40 days out.', confidence: 100, primaryAction: 'Review', needsApproval: false },
  { id: 'rec8', type: 'Missing Info', severity: 'info', title: 'Job missing technician update', description: 'WO-2026-1043 (True Food HVAC) is scheduled but has no check-in or notes from the assigned tech.', confidence: 82, primaryAction: 'Nudge', relatedEntityId: 'wo2', needsApproval: false },
];
