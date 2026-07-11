import { Router, type IRouter } from "express";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import {
  db,
  closeoutsTable,
  workOrdersTable,
  inventoryTable,
  type Closeout,
  type CloseoutDraft,
  type LaborEntry,
  type MaterialEntry,
  type LogEntry,
} from "@workspace/db";
import {
  CreateCloseoutBody,
  UpdateCloseoutBody,
  UpdateCloseoutParams,
  ApproveCloseoutParams,
  SendBackCloseoutBody,
  SendBackCloseoutParams,
} from "@workspace/api-zod";
import { requireAuth, requireRoles } from "../middleware/auth";
import {
  canApproveCloseouts,
  isFieldRole,
  isValidRole,
} from "../lib/authz";
import { postTransaction, NegativeStockError } from "../lib/inventory-ledger";
import { toCloseout } from "../lib/serialize-ops";
import { writeAudit } from "../lib/audit";

const router: IRouter = Router();

// Parse a free-text labor suggestion like "3.5 hrs standard" into hours.
function parseHours(text: string): number {
  const m = text.match(/(\d+(\.\d+)?)/);
  return m ? parseFloat(m[1]) : 1;
}

// GET /closeouts — tenant-scoped. Field roles read their own drafts; approvers
// read the Pending Review queue. Available to any authenticated tenant user.
router.get(
  "/closeouts",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = req.user!;
    if (!isValidRole(user.role)) {
      res.status(403).json({ error: "Not authorized to view closeouts" });
      return;
    }
    // Only approvers (full tenant queue) and field roles (own drafts only) may
    // read closeouts — these contain transcripts, AI summaries, and billing
    // lines. Every other role is forbidden.
    const isApprover = canApproveCloseouts(user.role);
    const isField = isFieldRole(user.role);
    if (!isApprover && !isField) {
      res.status(403).json({ error: "Not authorized to view closeouts" });
      return;
    }
    const filters = [eq(closeoutsTable.tenantId, user.tenantId)];
    if (isField) {
      filters.push(eq(closeoutsTable.technicianId, user.id));
    }
    const rows = await db
      .select()
      .from(closeoutsTable)
      .where(and(...filters))
      .orderBy(closeoutsTable.submittedAt);
    res.json(rows.map(toCloseout));
  },
);

// POST /closeouts — technician submits a VoiceConnect draft. The AI draft is
// snapshotted into `original` (immutable) and the closeout enters Pending Review.
router.post(
  "/closeouts",
  requireAuth,
  requireRoles("Technician", "Lead Technician", "Subcontractor"),
  async (req, res): Promise<void> => {
    const parsed = CreateCloseoutBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const user = req.user!;
    const d = parsed.data;

    const [wo] = await db
      .select()
      .from(workOrdersTable)
      .where(
        and(
          eq(workOrdersTable.id, d.workOrderId),
          eq(workOrdersTable.tenantId, user.tenantId),
        ),
      );
    if (!wo) {
      res.status(404).json({ error: "Work order not found" });
      return;
    }

    const draft: CloseoutDraft = {
      aiSummary: d.aiSummary ?? "",
      workPerformed: d.workPerformed ?? "",
      materialsDetected: d.materialsDetected ?? [],
      laborSuggested: d.laborSuggested ?? "",
      returnTripReason: d.returnTripReason ?? undefined,
      quoteNotes: d.quoteNotes ?? undefined,
      missingInfo: d.missingInfo ?? [],
      customerUpdateText: d.customerUpdateText ?? "",
      billingLines: d.billingLines ?? [],
      portalUpdateText: d.portalUpdateText ?? "",
      transcript: d.transcript ?? "",
      transcriptLanguage: (d.transcriptLanguage as CloseoutDraft["transcriptLanguage"]) ?? "English",
      translatedSummary: d.translatedSummary ?? undefined,
    };

    const [created] = await db
      .insert(closeoutsTable)
      .values({
        tenantId: user.tenantId,
        workOrderId: d.workOrderId,
        // Ownership is set from the authenticated user, never trusted from the
        // body — a technician can only submit closeouts as themselves.
        technicianId: user.id,
        transcript: draft.transcript,
        transcriptLanguage: draft.transcriptLanguage,
        translatedSummary: draft.translatedSummary ?? null,
        aiSummary: draft.aiSummary,
        workPerformed: draft.workPerformed,
        materialsDetected: draft.materialsDetected,
        laborSuggested: draft.laborSuggested,
        returnTripReason: draft.returnTripReason ?? null,
        quoteNotes: draft.quoteNotes ?? null,
        missingInfo: draft.missingInfo,
        customerUpdateText: draft.customerUpdateText,
        billingLines: draft.billingLines,
        portalUpdateText: draft.portalUpdateText,
        status: "Pending Review",
        original: draft,
      })
      .returning();

    await writeAudit(
      {
        tenantId: user.tenantId,
        actorUserId: user.id,
        actorName: user.name,
        action: "Submitted",
        entityType: "Closeout",
        entityId: created.id,
        summary: `Closeout submitted for ${wo.number} (Pending Review)`,
        ip: req.ip ?? null,
      },
      req,
    );
    res.status(201).json(toCloseout(created));
  },
);

// PATCH /closeouts/:id — technician edits the draft before approval. The
// `original` snapshot is never touched.
router.patch(
  "/closeouts/:id",
  requireAuth,
  requireRoles("Technician", "Lead Technician", "Subcontractor"),
  async (req, res): Promise<void> => {
    const params = UpdateCloseoutParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = UpdateCloseoutBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const user = req.user!;
    const [target] = await db
      .select()
      .from(closeoutsTable)
      .where(
        and(
          eq(closeoutsTable.id, params.data.id),
          eq(closeoutsTable.tenantId, user.tenantId),
        ),
      );
    if (!target) {
      res.status(404).json({ error: "Closeout not found" });
      return;
    }
    // A field user may only edit their own draft.
    if (target.technicianId !== user.id) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    // Locked once an approver has acted — only drafts still with the technician
    // (Pending Review or Sent Back) are editable, preserving the review trail.
    if (target.status !== "Pending Review" && target.status !== "Sent Back") {
      res.status(409).json({ error: "Closeout is no longer editable" });
      return;
    }

    const d = parsed.data;
    const updates: Partial<Closeout> = {};
    if (d.transcript !== undefined) updates.transcript = d.transcript;
    if (d.transcriptLanguage !== undefined)
      updates.transcriptLanguage = d.transcriptLanguage;
    if (d.translatedSummary !== undefined)
      updates.translatedSummary = d.translatedSummary;
    if (d.aiSummary !== undefined) updates.aiSummary = d.aiSummary;
    if (d.workPerformed !== undefined) updates.workPerformed = d.workPerformed;
    if (d.materialsDetected !== undefined)
      updates.materialsDetected = d.materialsDetected;
    if (d.laborSuggested !== undefined)
      updates.laborSuggested = d.laborSuggested;
    if (d.returnTripReason !== undefined)
      updates.returnTripReason = d.returnTripReason;
    if (d.quoteNotes !== undefined) updates.quoteNotes = d.quoteNotes;
    if (d.missingInfo !== undefined) updates.missingInfo = d.missingInfo;
    if (d.customerUpdateText !== undefined)
      updates.customerUpdateText = d.customerUpdateText;
    if (d.billingLines !== undefined) updates.billingLines = d.billingLines;
    if (d.portalUpdateText !== undefined)
      updates.portalUpdateText = d.portalUpdateText;

    const [updated] = await db
      .update(closeoutsTable)
      .set(updates)
      .where(eq(closeoutsTable.id, target.id))
      .returning();

    await writeAudit(
      {
        tenantId: user.tenantId,
        actorUserId: user.id,
        actorName: user.name,
        action: "Edited",
        entityType: "Closeout",
        entityId: target.id,
        summary: `Closeout draft edited (${Object.keys(updates).length} field(s))`,
        ip: req.ip ?? null,
      },
      req,
    );
    res.json(toCloseout(updated));
  },
);

// POST /closeouts/:id/approve — supervisor approves. Idempotent: only a
// Pending Review closeout is processed, so labor/materials post once and
// inventory is deducted exactly once. Records the review + billing handoff.
router.post(
  "/closeouts/:id/approve",
  requireAuth,
  requireRoles("Administrator", "Service Manager", "Supervisor"),
  async (req, res): Promise<void> => {
    const params = ApproveCloseoutParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const user = req.user!;

    try {
      const result = await db.transaction(async (tx) => {
        const [co] = await tx
          .select()
          .from(closeoutsTable)
          .where(
            and(
              eq(closeoutsTable.id, params.data.id),
              eq(closeoutsTable.tenantId, user.tenantId),
            ),
          )
          .for("update");
        if (!co) return { notFound: true as const };
        // Idempotency guard: only Pending Review closeouts advance.
        if (co.status !== "Pending Review") {
          return { closeout: co, alreadyDone: true as const };
        }
        const [wo] = await tx
          .select()
          .from(workOrdersTable)
          .where(
            and(
              eq(workOrdersTable.id, co.workOrderId),
              eq(workOrdersTable.tenantId, user.tenantId),
            ),
          )
          .for("update");
        if (!wo) return { notFound: true as const };

        const consumed: { id: string; name: string; qty: number }[] = [];
        const laborEntry: LaborEntry = {
          id: randomUUID(),
          technicianId: co.technicianId,
          date: co.submittedAt.toISOString(),
          hours: parseHours(co.laborSuggested),
          rate: 125,
          type: "Standard",
          approved: true,
        };

        const items = await tx
          .select()
          .from(inventoryTable)
          .where(eq(inventoryTable.tenantId, user.tenantId))
          .for("update");
        const stock = [...items];
        const consumedItems: { item: (typeof stock)[number]; qty: number }[] = [];
        const materialEntries: MaterialEntry[] = co.materialsDetected.map(
          (detected) => {
            const match = stock.find(
              (it) =>
                detected.toLowerCase().includes(it.name.toLowerCase()) ||
                it.name
                  .toLowerCase()
                  .includes(
                    detected.toLowerCase().replace(/^\d+\s*[x×]?\s*/, ""),
                  ),
            );
            const qtyMatch = detected.match(/^(\d+)/);
            const qty = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;
            if (match) {
              consumedItems.push({ item: match, qty });
              consumed.push({ id: match.id, name: match.name, qty });
            }
            return {
              id: randomUUID(),
              inventoryItemId: match?.id,
              name: match?.name ?? detected,
              quantity: qty,
              cost: match?.cost ?? 0,
              billablePrice: match?.billablePrice ?? 0,
              approved: true,
            };
          },
        );

        // Post a consumption transaction per detected material. Negative-stock
        // protection applies with no automatic bypass: closeout approval has no
        // explicit-override affordance, so if stock is insufficient the approval
        // is blocked (a privileged user must first post an inventory adjustment).
        for (const { item, qty } of consumedItems) {
          await postTransaction(tx, {
            tenantId: user.tenantId,
            itemId: item.id,
            type: "consumption",
            location: item.location,
            quantity: -qty,
            workOrderId: wo.id,
            reason: `Closeout ${co.id} approved`,
            override: false,
            privileged: false,
            actorUserId: user.id,
            actorName: user.name,
          });
          await tx
            .update(inventoryTable)
            .set({ lastUsed: new Date() })
            .where(eq(inventoryTable.id, item.id));
        }

        const log: LogEntry = {
          id: randomUUID(),
          timestamp: new Date().toISOString(),
          author: user.name,
          message:
            "Closeout approved; labor & materials posted, inventory deducted.",
        };
        await tx
          .update(workOrdersTable)
          .set({
            status: "Ready for Billing",
            billingStatus: "Ready for Invoice",
            labor: [...wo.labor, laborEntry],
            materials: [...wo.materials, ...materialEntries],
            internalLog: [...wo.internalLog, log],
          })
          .where(eq(workOrdersTable.id, wo.id));

        const [updated] = await tx
          .update(closeoutsTable)
          .set({
            status: "Approved",
            reviewedBy: user.id,
            reviewedAt: new Date(),
          })
          .where(eq(closeoutsTable.id, co.id))
          .returning();

        return { closeout: updated, wo, consumed, created: true as const };
      });

      if ("notFound" in result) {
        res.status(404).json({ error: "Closeout not found" });
        return;
      }
      if ("alreadyDone" in result) {
        // Idempotent no-op: return the already-approved (or otherwise resolved)
        // closeout without re-posting anything.
        res.json(toCloseout(result.closeout));
        return;
      }

      await writeAudit(
        {
          tenantId: user.tenantId,
          actorUserId: user.id,
          actorName: user.name,
          action: "Approved",
          entityType: "Closeout",
          entityId: result.closeout.id,
          summary: `Closeout approved for ${result.wo.number}`,
          ip: req.ip ?? null,
        },
        req,
      );
      for (const c of result.consumed) {
        await writeAudit(
          {
            tenantId: user.tenantId,
            actorUserId: user.id,
            actorName: user.name,
            action: "Consumed",
            entityType: "Inventory",
            entityId: c.id,
            summary: `-${c.qty} ${c.name} (${result.wo.number})`,
            ip: req.ip ?? null,
          },
          req,
        );
      }
      res.json(toCloseout(result.closeout));
    } catch (err) {
      if (err instanceof NegativeStockError) {
        res.status(400).json({
          error: `${err.message} — post an inventory adjustment before approving this closeout`,
        });
        return;
      }
      req.log.error({ err }, "Failed to approve closeout");
      res.status(500).json({ error: "Failed to approve closeout" });
    }
  },
);

// POST /closeouts/:id/send-back — return the draft to the technician.
router.post(
  "/closeouts/:id/send-back",
  requireAuth,
  requireRoles("Administrator", "Service Manager", "Supervisor"),
  async (req, res): Promise<void> => {
    const params = SendBackCloseoutParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = SendBackCloseoutBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const user = req.user!;
    const reason = parsed.data.reason;
    const [target] = await db
      .select()
      .from(closeoutsTable)
      .where(
        and(
          eq(closeoutsTable.id, params.data.id),
          eq(closeoutsTable.tenantId, user.tenantId),
        ),
      );
    if (!target) {
      res.status(404).json({ error: "Closeout not found" });
      return;
    }
    // Only a draft still awaiting review may be sent back. Once a closeout is
    // Approved (or already Sent Back / billed) it is locked — reopening it would
    // undermine the approval trail and post-approval integrity.
    if (target.status !== "Pending Review") {
      res.status(409).json({
        error: "Only closeouts pending review can be sent back",
      });
      return;
    }

    const [updated] = await db
      .update(closeoutsTable)
      .set({
        status: "Sent Back",
        reviewedBy: user.id,
        reviewedAt: new Date(),
        reviewNote: reason ?? null,
      })
      .where(eq(closeoutsTable.id, target.id))
      .returning();

    await writeAudit(
      {
        tenantId: user.tenantId,
        actorUserId: user.id,
        actorName: user.name,
        action: "Sent Back",
        entityType: "Closeout",
        entityId: target.id,
        summary: `Returned to technician${reason ? `: ${reason}` : ""}`,
        ip: req.ip ?? null,
      },
      req,
    );
    res.json(toCloseout(updated));
  },
);

export default router;
