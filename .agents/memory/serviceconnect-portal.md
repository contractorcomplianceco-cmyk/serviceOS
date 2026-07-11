---
name: ServiceConnect customer portal isolation
description: Why the customer portal is a separate app shell from the staff app, and how routing/auth keep the two apart.
---

# ServiceConnect customer portal isolation

## Portal users must never mount the staff shell
- A `Customer Portal User` renders `<PortalShell/>` directly from `AuthedApp` (App.tsx), BEFORE `AppProvider`/`AppLayout`/staff `Router` mount. Unauthenticated `/portal*` requests render `<PortalLogin/>`.
- **Why:** the staff store (`store.tsx`) fires generated list hooks (`useListWorkOrders`, `useListCustomers`, …) on mount. Portal users are authorized only for `/api/portal/*` and 403 on every staff endpoint, so mounting the staff shell would spray failing requests and break the store. Isolation is a correctness requirement, not just UX.
- **How to apply:** never gate portal vs staff purely with route guards inside the shared staff `Router` — branch at `AuthedApp` so the two experiences never share a provider tree. `roleHome('Customer Portal User')` returns `/portal`.

## Contracts + Recurrence share one nav key
- Both staff pages are gated by the single `contracts` NavKey (client mirror of backend `ROLE_NAV` in api-server authz — keep them identical). The Sidebar carries an optional `testId` field so the two items get unique `data-testid`s (`nav-contracts`, `nav-recurrence`) despite sharing a key.
- **Why:** adding a client-only `recurrence` NavKey would diverge from the backend authz map; reusing `contracts` avoids drift. Duplicate testids break deterministic UI tests.

## Recurrence worker only drafts
- The recurrence run/generation produces Draft work orders + renewal reminders — never auto-schedules/sends/invoices. This is the same HITL guardrail as RoseOS. Any UI or worker change must preserve draft-only output.

## Portal request attachments reuse the staff /files verification pattern
- `POST /portal/requests` verifies each attachment against the ACTUAL stored bytes (statObject → checkFilePolicy → declared size/contentType must match), sets an ACL owner, and links filesTable rows to the new Draft work order — identical to the staff `/files` POST route. Additionally restricts paths to the `/objects/uploads/` namespace (both local + object-storage backends normalize signed uploads to `/objects/uploads/<randomUUID>`).
- **Why:** the trusted source of truth is the stored object, never client JSON. Namespace + unguessable random upload id keep a customer from binding an object they didn't just upload.
- **How to apply:** a full pending-upload-token ownership model (single-use token keyed by objectPath+userId) was deliberately NOT added — it doesn't exist for staff uploads either and would diverge. If ever hardening object ownership, do it uniformly across `/files` and `/portal/requests`, not portal-only.

## Portal document visibility gate
- Portal (`/portal/documents`) shows a doc ONLY when `visibility === "Customer Visible"` (`isCustomerVisibleDocument` in authz.ts). Every staff class ("All Staff"/"Managers Only"/"Billing Only") is INTERNAL. Sharing a doc to the portal does NOT hide it from staff (canViewDocumentVisibility returns true for any non-restricted class).
- Portal work orders are gated by `portalSyncStatus ∈ {Sent, Synced}`; detail route returns 404 (not 403) for non-visible so existence isn't confirmed.
