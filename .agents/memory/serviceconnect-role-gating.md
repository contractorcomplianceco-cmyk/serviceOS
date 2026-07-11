---
name: ServiceConnect role gating mirror
description: The client permissions map mirrors the server authz map; keep them identical.
---

# ServiceConnect role gating

`artifacts/serviceconnect/src/lib/permissions.ts` is the CLIENT mirror of the
backend-enforced source of truth in `artifacts/api-server/src/lib/authz.ts`.

**Rule:** When adding a NavKey or a role-capability helper, update BOTH files identically:
the `NavKey` union, the `ALL` array, the per-role `ROLE_NAV` map, and any capability
helpers (e.g. `canViewIntegrations` / `canManageIntegrations`). The server is authoritative
and enforces at the route level (`Protected` in `App.tsx` blocks direct URL access).

**Why:** If client nav visibility diverges from server authorization, users either see nav
they get 403'd on, or lose access to sections they're entitled to.

**How to apply:** After editing `authz.ts`, grep the same identifiers in `permissions.ts`
and reconcile. Route-level `Protected allow={nav(key)}` must exist for every gated page.
