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
