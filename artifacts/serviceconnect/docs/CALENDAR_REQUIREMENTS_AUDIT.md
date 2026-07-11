# Dispatch Calendar — Requirements Audit

Audit of the ServiceConnect Dispatch Calendar against the client's layout/workflow spec.

- **Route:** `/dispatch` (guarded in `src/App.tsx`; dispatch/scheduler/manager roles).
- **Primary component:** `src/pages/DispatchCalendar.tsx` (rebuilt this pass into a technician-by-date grid).
- **Data/persistence:** global store `src/lib/store.tsx` → `updateWorkOrder()` = `useUpdateWorkOrder` mutation against the backend `api-server`; success invalidates `kWorkOrders` + `kAudit`.
- **Status legend:** **Complete** = built + persists/works · **Partial** = built but limited · **Static** = renders but mocked/non-functional · **Broken** = present but faulty · **Missing** = not implemented.

> Per the spec, the calendar is **not** marked complete just because a dispatch page exists. Overall estimate: **~65% complete** for the core operational grid; availability events, calendar settings, and full responsive/mobile remain the largest gaps.

---

## 1. Primary calendar structure

| Requirement | Status | Evidence / Gap |
|---|---|---|
| Technicians vertical, left side | **Complete** | Sticky left column, one row per tech. |
| Alphabetical by default | **Complete** | `sortBy="name"` default; `localeCompare`. |
| Photo/avatar beside name | **Partial** | Initials avatar chip (User model has no photo field). Gap: real photos. |
| Dates/days across the top | **Complete** | Header row built from `rangeFor(view, anchor)`. |
| One row per technician | **Complete** | `techs.map` → `Fragment` row. |
| Job cards in tech row × date column | **Complete** | `jobsFor(tech, day)` renders cards in each cell. |
| Multiple jobs stacked per cell | **Complete** | Cell is `flex-col`; cards stack vertically. |
| Visible empty cells | **Complete** | Empty cells show faint "Open". |
| Compact empty / expanded populated rows | **Partial** | Empty cells are short; populated grow with content. Gap: no explicit per-row height animation. |
| Horizontal scroll for dates | **Complete** | Grid `min-w-max` inside `overflow-auto`. |
| Vertical scroll for technicians | **Complete** | Same scroll container. |
| Sticky technician column | **Complete** | `sticky left-0 z-10`. |
| Sticky date header | **Complete** | `sticky top-0 z-20`; corner `z-30`. |
| Synchronized scrolling | **Complete** | Single CSS-grid scroll container (no dual-pane desync). |
| Current-day highlight | **Complete** | `sameDay(d, today)` tints header + column. |
| Weekend visibility | **Complete** | `isWeekend(d)` distinct cell background. |
| Compact/expanded density modes | **Complete** | Density toggle switches padding + card detail. |

## 2. Required calendar views

| View | Status | Evidence / Gap |
|---|---|---|
| Today | **Complete** | View switcher `Today`. |
| Day | **Complete** | Single-date range. |
| 3-Day | **Complete** | 3-column range. |
| Work Week | **Complete** | Mon–Fri; **default view**. |
| Full Week | **Complete** | Sun–Sat. |
| Custom Date Range | **Missing** | No custom range picker yet. |
| Technician Schedule | **Partial** | Achievable via region/sort; no single-tech focus mode. |
| Region Schedule | **Complete** | Region filter (see §9). |
| Unscheduled Work Drawer | **Complete** | Left drawer (see §10). |
| Monthly NOT primary | **Complete** | No monthly view; default is Work Week. |

## 3. Technician rows

| Field | Status | Evidence / Gap |
|---|---|---|
| Avatar | **Partial** | Initials (no photo field on `User`). |
| Name / Role | **Complete** | Rendered in tech column. |
| Zone/region | **Complete** | `tech.zone` badge. |
| On-call indicator | **Missing** | No on-call field/event model. |
| Availability status | **Missing** | Depends on calendar-events model (not built). |
| Scheduled hours / remaining capacity | **Complete** | `workloadHours`/`capacityHours` load bar. |
| Overload warning | **Complete** | Red bar + ⚠ when `load > cap`. |
| GPS indicator | **Complete** | `gpsConsent` satellite icon. |
| Assigned truck | **Complete** | `truckId` badge. |
| Sort: alphabetical / region / workload | **Complete** | Sort select. |
| Sort: manual / availability | **Missing** | No drag-reorder; availability model absent. |
| Filter by role / zone | **Partial** | Zone via region filter; field-roles enforced. Gap: explicit role filter UI. |
| Hide inactive employees | **Partial** | Inactive excluded by default (`u.active`). Gap: no toggle to show them. |

## 4. Job card content

| Field | Status | Evidence / Gap |
|---|---|---|
| Time / time window | **Complete** | `j.timeWindow` (falls back to "Flex"). |
| Internal WO number | **Complete** | `j.number`. |
| External portal number | **Complete** | `j.externalId` (when present). |
| Customer name | **Complete** | Resolved from `customerId`. |
| Location / city | **Complete** | City shown; full address in preview. |
| Source portal | **Partial** | Source shown on unscheduled + preview; omitted on dense card to save space. |
| Status | **Complete** | Color label via `statusClass`. |
| Priority | **Complete** | Emergency ring + priority in preview. |
| First-trip / return-trip label | **Complete** | `tripLabel()` from status/trips. |
| Quote status | **Complete** | `quoteFlag` label. |
| Materials status | **Complete** | `materialsFlag` label. |
| Important tech note | **Complete** | `importantNotes` (comfortable density). |
| Emergency indicator | **Complete** | Red ring on Emergency cards. |
| Portal-sync warning | **Partial** | Shown in preview; not surfaced as a card badge yet. |
| Overflow handling (wrap/fade/preview) | **Complete** | Truncation + click preview; density controls line count. |

## 5. Color & status logic

| Requirement | Status | Evidence / Gap |
|---|---|---|
| Color-coded statuses | **Complete** | `statusClass`/`priorityClass` label colors. |
| Strong labels (Scheduled/Emergency/First Trip/etc.) | **Complete** | Status pill + trip/materials/quote labels. |
| Text labels not color-only | **Complete** | Every color paired with text. |
| Colors configurable in Settings | **Missing** | No settings surface for card/status colors. |

## 6. Reminders & availability events

| Requirement | Status | Evidence / Gap |
|---|---|---|
| Non-WO calendar events (time off, on-call, lunch, training, truck maint, etc.) | **Missing** | No `CalendarEvent` type/store/UI. Highest-value remaining gap. |
| Events in tech row, distinct style | **Missing** | Depends on model above. |
| Recurring, start/end, notes, capacity impact, routing-aware | **Missing** | Not modeled. |

## 7. Interaction requirements

| Interaction | Status | Evidence / Gap |
|---|---|---|
| Drag job to another technician | **Complete** | Draggable cards → cell drop → confirm → persist. |
| Drag job to another day | **Complete** | Drop sets `dueDate`. |
| Drag job to another time | **Partial** | Day-granular; no intra-day time-slot drop. |
| Resize job duration | **Missing** | No duration model/resize handles. |
| Duplicate assignment | **Missing** | Not implemented. |
| Create return trip | **Partial** | Quick action opens WO (where trips are added). |
| Add / remove second technician | **Missing** | WO holds a single `assignedTechnicianId`. |
| Mark job unscheduled | **Partial** | Reassign via preview; no explicit "unschedule". |
| Quick preview | **Complete** | Non-navigating preview sheet. |
| Open full work order | **Complete** | "Open Work Order" → `/work-orders/:id`. |
| Change status / priority | **Partial** | Status via drag→Scheduled; no inline status/priority editor on calendar. |
| Edit time window / notes | **Partial** | Reschedule date inline; time-window/notes edited on WO page. |
| View customer / location / map / source / attachments / materials | **Partial** | Customer/location/map/source in preview; attachments/materials counts on WO page. |
| Confirmation where appropriate | **Complete** | Drag + RoseOS both require a confirm step. |
| Persist to database | **Complete** | `updateWorkOrder` mutation → backend. |
| Create audit record | **Complete** | Mutation invalidates `kAudit`; backend writes audit. |
| Update assignment / workload | **Complete** | Assignment persists; load bar reflects `workloadHours`. |
| Notification drafts / portal update drafts | **Missing** | Not auto-created on schedule change. |
| No send without approval | **Complete** | Guardrail preserved; drag only drafts. |

## 8. Hover & quick preview

| Requirement | Status | Evidence / Gap |
|---|---|---|
| Single-click preview panel | **Complete** | Click card → `QuickPreview` sheet. |
| Hover preview | **Partial** | Click-driven (hover not wired to avoid drag conflicts). |
| Fields: WO#, external ID, customer, address, contact, description, notes, status, priority, window, source, PO, materials, quote, assigned tech, portal-sync | **Complete** | Rendered in `QuickPreview`. |
| Attachments count / last update | **Missing** | Not surfaced in preview. |
| Quick actions: Open / Reassign / Reschedule / View Map / Create Return Trip | **Complete** | In preview footer + inline selects. |
| Quick actions: Add Note / Change Status | **Missing** | Done on WO page. |
| No navigation required | **Complete** | Preview is an overlay sheet. |

## 9. Region & smart-list support

| Requirement | Status | Evidence / Gap |
|---|---|---|
| Full region filter list (Tampa…Georgia + All) | **Complete** | `REGIONS` constant in region select. |
| Configurable additional regions | **Partial** | Constant list; not user-configurable. |
| Filter calendar by region | **Complete** | Filters techs (`zone`) + jobs (`region`). |
| Unscheduled jobs by region | **Complete** | Drawer respects region filter. |
| Nearby techs / bundle / cross-region / find-open | **Missing** | No geo/routing intelligence. |

## 10. Unscheduled jobs

| Requirement | Status | Evidence / Gap |
|---|---|---|
| Unscheduled drawer | **Complete** | Left panel with count. |
| Segmented (emergency, waiting materials/customer, return, region, portal, priority) | **Partial** | Region-filtered flat list; priority/materials/source badges shown, no grouped sections. |
| Drag unscheduled job to tech/date | **Complete** | Drawer items draggable → cell drop → confirm. |
| RoseOS recommendation before placement | **Partial** | Click-to-assign shows the (mocked) routing sheet; the drag-drop path shows only a confirm dialog — no recommendation summary on drag yet. |

## 11. RoseOS routing support

| Requirement | Status | Evidence / Gap |
|---|---|---|
| Routing recommendation surface | **Static** | Routing sheet shows match/logistics/skills/workload but values are **mocked** (94%, 12 min, etc.). |
| Real calc (nearest tech, ETA, skills, capacity, inventory, conflicts) | **Missing** | No routing engine. |
| Alternatives / confidence / risks | **Static** | Single mocked best match. |
| Human approval mandatory | **Complete** | "Approve Schedule Draft" required; no auto-schedule. |

## 12. Multiple assignments

| Requirement | Status | Evidence / Gap |
|---|---|---|
| Multiple visits per WO | **Partial** | `trips[]` exists on WO; calendar shows first/return label. |
| Multiple technicians per assignment | **Missing** | Single `assignedTechnicianId`. |
| Per-assignment completion / visit types | **Missing** | Not modeled at calendar level. |
| WO stays open until assignments complete | **Complete** | Status lifecycle enforced elsewhere; calendar doesn't auto-close. |

## 13. Calendar settings

| Requirement | Status | Evidence / Gap |
|---|---|---|
| Settings: default view, date range, workday start/end, density, card fields, colors, region display, sort, weekend, employee visibility, capacity, increments, DnD confirm, notification/portal/approval behavior | **Missing** | Density/sort/region/view are in-page controls, not persisted settings. No calendar Settings section. |

## 14. Responsive behavior

| Target | Status | Evidence / Gap |
|---|---|---|
| Desktop full grid | **Complete** | Optimized grid, horizontal scroll for large teams. |
| Tablet (rows + horizontal scroll + compact + sticky) | **Partial** | Grid scrolls + density; not tuned per breakpoint. |
| Mobile agenda / day view (no forced grid) | **Missing** | Grid is not adapted to a mobile agenda view. |

## 15. Performance

| Requirement | Status | Evidence / Gap |
|---|---|---|
| Memoized derivations | **Partial** | `useMemo` for days/techs/active/unassigned; cards not individually memoized. |
| Efficient date-range filtering | **Complete** | Range computed once; per-cell filter. |
| Virtualized rows | **Missing** | No virtualization (fine for current seed size). |
| Smooth DnD / no full-page rerender | **Partial** | Native HTML5 DnD; state updates re-render the board. |
| Optimistic updates + rollback / loading / errors | **Partial** | Mutation-based; relies on React Query defaults, no explicit optimistic/rollback here. |

## 16. Audit deliverable & tests

| Requirement | Status | Evidence / Gap |
|---|---|---|
| `CALENDAR_REQUIREMENTS_AUDIT.md` | **Complete** | This document. |
| Automated tests for dispatch | **Missing** | No dispatch tests (`src/__tests__` has none for this screen). |

---

## Acceptance-test walkthrough (spec §Acceptance Test)

| # | Step | Result |
|---|---|---|
| 1–7 | Open board; techs vertical/alphabetical; multi-day horizontal; sticky column + header; stacked cells; details on cards | **Pass** |
| 8 | Quick preview | **Pass** (single-click) |
| 9–15 | Drag to another tech → RoseOS/confirm → approval → save → persist → workload → audit | **Pass** (persist + audit via mutation; workload reflects stored hours) |
| 16–18 | Recurring availability note + routing respects it | **Fail** (availability-event model missing) |
| 19–20 | Region filter + drag regional unscheduled job in | **Pass** |
| 21 | Refresh persists | **Pass** (backend-persisted) |

## Highest-value remaining work

1. **Availability / non-WO calendar events** model + rendering + capacity/routing impact (unblocks steps 16–18).
2. **Calendar Settings** (persist default view, colors, workday, DnD confirm, approval/portal behavior).
3. **Real RoseOS routing** (replace mocked match/ETA with skills/zone/capacity/inventory logic + alternatives).
4. **Notification / portal-sync drafts** auto-created on schedule change.
5. **Mobile agenda view** + tablet tuning.
6. **Dispatch tests** (grid render, drag→confirm→persist, region filter).
