import type { User } from "@workspace/db";

/** Map a DB user row to the public AuthUser shape (never leaks secrets). */
export function toAuthUser(user: User) {
  return {
    id: user.id,
    tenantId: user.tenantId,
    email: user.email,
    name: user.name,
    role: user.role,
    active: user.active,
    mustResetPassword: user.mustResetPassword,
    emailVerified: user.emailVerified,
    mfaEnabled: user.mfaEnabled,
    customerId: user.customerId ?? null,
    phone: user.phone ?? null,
    zone: user.zone ?? null,
    skills: user.skills ?? null,
    restrictedTasks: user.restrictedTasks ?? null,
    workloadHours: user.workloadHours ?? null,
    capacityHours: user.capacityHours ?? null,
    truckId: user.truckId ?? null,
    gpsConsent: user.gpsConsent ?? null,
    hourlyCost: user.hourlyCost ?? null,
    lastLoginAt: user.lastLoginAt ?? null,
    createdAt: user.createdAt,
  };
}
