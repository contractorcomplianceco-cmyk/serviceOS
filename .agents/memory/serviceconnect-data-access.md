---
name: ServiceConnect data access pattern
description: When to use generated react-query hooks directly vs the AppContext store in the serviceconnect artifact.
---

# ServiceConnect data access

Most backend reads/writes are centralized in `src/lib/store.tsx` (`useAppStore()`), which
exposes a strict `AppContextType` interface and manages query keys + cache invalidation.

**Rule:** Feature-local, endpoint-centric UI surfaces (a single consuming component) may call
the generated orval hooks from `@workspace/api-client-react` directly, with their own
`useQueryClient()` invalidation — instead of expanding the `AppContextType` interface.
Shared cross-page state should still flow through `AppContext`.

**Why:** `store.tsx` is already large and its context is a strict typed interface; routing a
one-consumer feature through it bloats context and adds coupling for no benefit. The
NotificationCenter (Header) and Integrations page follow the direct-hook pattern.

**How to apply:** If exactly one component consumes an endpoint, use the generated hook
directly there. If two or more pages need the same data/actions, add it to the store.
