---
name: ServiceConnect dispatch calendar
description: Conventions for the /dispatch technician×date grid (day serialization, status preservation).
---

# Dispatch calendar (`/dispatch`, `DispatchCalendar.tsx`)

The board is a **technicians-down-left × dates-across-top** grid (not hours, not monthly). Rendering buckets a work order into a day by comparing local Y/M/D of `new Date(wo.dueDate)` to each column date.

## Persist calendar days as local-noon ISO
When a drag/drop, reschedule, or assign writes `dueDate`, serialize with a Date built at **local noon** (`new Date(y, m, d, 12, 0, 0)`), not `startOfDay(...).toISOString()`.

**Why:** the grid compares local calendar days, but `toISOString()` of local midnight can land on the previous UTC day in negative-offset zones (US), shifting the job one column. Noon-anchoring round-trips safely for realistic timezones. Also parse `<input type="date">` values as local (`new Date(y, m-1, d)`), never `new Date("YYYY-MM-DD")` (that's UTC midnight).

## Preserve workflow status on move/reassign
Only promote a WO to `Scheduled` when its current status is in `{New, Triage Needed, Need Scheduled}`. Moving a job already at `First Trip`/`On Site`/`Awaiting Materials`/etc. must keep its status.

**Why:** blindly setting `status: "Scheduled"` on every reassign silently downgrades in-progress work orders.

## Human-in-the-loop is preserved
Drag/drop and RoseOS assign both require an explicit confirm step; nothing auto-sends. RoseOS routing figures (match %, ETA, mileage) are still **mocked** — no real routing engine yet.
