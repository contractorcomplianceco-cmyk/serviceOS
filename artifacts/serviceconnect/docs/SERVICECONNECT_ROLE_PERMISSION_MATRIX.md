# ServiceConnect — Role & Permission Matrix

Source of truth: `src/lib/permissions.ts` (`canAccess`, `navFor`, `canApproveCloseouts`,
`isFieldRole`) and the `Protected` route guards in `src/App.tsx`. Gating is enforced at the **route**
level, not just nav visibility — verified by e2e (a Technician is blocked from `/review`).

## Roles (8)

Administrator, Scheduler, Service Manager, Technician, Lead Technician, Billing, Bookkeeper,
Subcontractor.

## Access matrix

Legend: ✔ full access · ● read/limited · — no access. (Reflects the intent enforced by
`permissions.ts`; confirm exact per-route flags in code for edge roles.)

| Area / Route | Admin | Scheduler | Service Mgr | Technician | Lead Tech | Billing | Bookkeeper | Subcontractor |
|---|---|---|---|---|---|---|---|---|
| Today Dashboard `/` | ✔ | ✔ | ✔ | ● | ● | ✔ | ✔ | ● |
| Intake `/intake` | ✔ | ✔ | ✔ | — | — | — | — | — |
| Work Orders `/work-orders` | ✔ | ✔ | ✔ | ● | ● | ● | ● | ● |
| Dispatch `/dispatch` | ✔ | ✔ | ✔ | — | ● | — | — | — |
| Technicians `/technicians` | ✔ | ✔ | ✔ | — | ● | — | — | — |
| Customers `/customers` | ✔ | ✔ | ✔ | — | — | ● | ● | — |
| Locations `/locations` | ✔ | ✔ | ✔ | — | — | ● | ● | — |
| Inventory `/inventory` | ✔ | ✔ | ✔ | ● | ● | — | — | ● |
| Equipment `/equipment` | ✔ | ✔ | ✔ | ● | ● | — | — | — |
| Billing `/billing` | ✔ | — | ● | — | — | ✔ | ✔ | — |
| Accounting `/accounting` | ✔ | — | ● | — | — | ✔ | ✔ | — |
| Documents `/documents` | ✔ | ● | ✔ | ● | ● | ● | ● | ● |
| Reports `/reports` | ✔ | ● | ✔ | — | — | ● | ✔ | — |
| Intelligence `/intelligence` | ✔ | ✔ | ✔ | — | ● | ● | ● | — |
| **Supervisor Review `/review`** | ✔ | — | ✔ | — | — | — | — | — |
| Technician Mobile `/tech` | ● | — | ● | ✔ | ✔ | — | — | ✔ |
| VoiceConnect `/voiceconnect` | ● | — | ● | ✔ | ✔ | — | — | ✔ |
| Settings `/settings` (+ Audit Trail) | ✔ | ● | ● | ● | ● | ● | ● | ● |

## Key gates (verified logic)

- **`canApproveCloseouts`** → Administrator and Service Manager only. `/review` is wrapped in
  `<Protected allow={canApproveCloseouts}>`. **E2E-verified: Technician blocked.**
- **`isFieldRole`** → Technician, Lead Technician, Subcontractor. `/tech*` routes are restricted to
  field roles.
- **Create actions** (new WO/customer/location/equipment) are hidden from field roles in the UI.

## Enforcement notes (honest)

- Gating is **client-side only**. It correctly blocks navigation and direct URL access within the app,
  but is not a security boundary — there is no server to enforce it. Production requires server-side
  authorization tied to real authentication.
- The Settings **Audit Trail** view is intended for Administrators.
