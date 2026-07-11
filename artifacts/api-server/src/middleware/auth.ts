import type { NextFunction, Request, Response } from "express";
import type { User } from "@workspace/db";
import { getUserForToken } from "../lib/auth/session";
import { SESSION_COOKIE_NAME } from "../lib/auth/config";
import {
  hasNavAccess,
  isPortalUser,
  isValidRole,
  type NavKey,
  type Role,
} from "../lib/authz";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User;
      sessionToken?: string;
    }
  }
}

function readToken(req: Request): string | null {
  const raw = req.cookies?.[SESSION_COOKIE_NAME];
  return typeof raw === "string" && raw.length > 0 ? raw : null;
}

/** Attach req.user if a valid session cookie is present; otherwise 401. */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = readToken(req);
  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const user = await getUserForToken(token);
  if (!user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  req.user = user;
  req.sessionToken = token;
  next();
}

/** Require the authenticated user to hold one of the given roles. */
export function requireRoles(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    if (!isValidRole(user.role) || !roles.includes(user.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}

/**
 * Require the authenticated user to be a Customer Portal User. Portal routes are
 * tenant- AND customer-scoped: the handler must further restrict every query to
 * `req.user.customerId`. Non-portal (staff) users are rejected so staff can only
 * reach staff routes and portal users can only reach portal routes.
 */
export function requirePortalUser(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  if (!isValidRole(user.role) || !isPortalUser(user.role)) {
    res.status(403).json({ error: "Portal access only" });
    return;
  }
  if (!user.customerId) {
    res.status(403).json({ error: "Portal user is not linked to a customer" });
    return;
  }
  next();
}

/**
 * Require the authenticated user to be a staff member (not a Customer Portal
 * User). Keeps portal users out of internal staff routes.
 */
export function requireStaff(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  if (isValidRole(user.role) && isPortalUser(user.role)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
}

/**
 * Require the authenticated user's role to have access to a given nav section.
 * Mirrors the client route guards so backend authz never diverges from the UI.
 */
export function requireNav(key: NavKey) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    if (!isValidRole(user.role) || !hasNavAccess(user.role, key)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}
