import { describe, it, expect } from "vitest";
import express, { type Express } from "express";
import cors from "cors";
import supertest from "supertest";
import { parseAllowedOrigins, buildCorsOptions } from "../lib/cors";

const LOVABLE = "https://connect-bridge-swift.lovable.app";
const EVIL = "https://evil.example.com";

// Build a minimal app that exercises the real credentialed CORS middleware in
// isolation (no DB, no auth) so preflight and header behavior can be asserted
// deterministically for a given SERVICECONNECT_ALLOWED_ORIGINS value.
function appWith(raw: string | undefined): Express {
  const app = express();
  app.use(cors(buildCorsOptions(raw)));
  app.post("/api/auth/login", (_req, res) =>
    res.status(200).json({ ok: true }),
  );
  return app;
}

describe("parseAllowedOrigins", () => {
  it("returns an empty set for unset or empty input", () => {
    expect(parseAllowedOrigins(undefined).size).toBe(0);
    expect(parseAllowedOrigins("").size).toBe(0);
    expect(parseAllowedOrigins("   ").size).toBe(0);
  });

  it("trims whitespace and drops empty entries", () => {
    const set = parseAllowedOrigins(`  ${LOVABLE} , http://localhost:5173 ,, `);
    expect([...set]).toEqual([LOVABLE, "http://localhost:5173"]);
  });

  it("stores origins for exact matching only", () => {
    const set = parseAllowedOrigins(LOVABLE);
    expect(set.has(LOVABLE)).toBe(true);
    // No substring / suffix leakage.
    expect(set.has(`${LOVABLE}.evil.com`)).toBe(false);
    expect(set.has("https://connect-bridge-swift.lovable.app/")).toBe(false);
  });
});

describe("credentialed CORS preflight", () => {
  it("allows the Lovable origin when listed", async () => {
    const res = await supertest(appWith(LOVABLE))
      .options("/api/auth/login")
      .set("Origin", LOVABLE)
      .set("Access-Control-Request-Method", "POST");
    expect([200, 204]).toContain(res.status);
    expect(res.headers["access-control-allow-origin"]).toBe(LOVABLE);
    expect(res.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("echoes the exact origin (not a wildcard) on actual requests", async () => {
    const res = await supertest(appWith(`${LOVABLE},http://localhost:5173`))
      .post("/api/auth/login")
      .set("Origin", LOVABLE);
    expect(res.status).toBe(200);
    expect(res.headers["access-control-allow-origin"]).toBe(LOVABLE);
    expect(res.headers["access-control-allow-origin"]).not.toBe("*");
    expect(res.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("does not authorize a non-listed origin", async () => {
    const res = await supertest(appWith(LOVABLE))
      .options("/api/auth/login")
      .set("Origin", EVIL)
      .set("Access-Control-Request-Method", "POST");
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
    expect(res.headers["access-control-allow-credentials"]).toBeUndefined();
  });

  it("rejects a suffix look-alike of an allowed origin", async () => {
    const res = await supertest(appWith(LOVABLE))
      .options("/api/auth/login")
      .set("Origin", `${LOVABLE}.evil.com`)
      .set("Access-Control-Request-Method", "POST");
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("authorizes no browser origin when the allowlist is empty", async () => {
    const res = await supertest(appWith(""))
      .options("/api/auth/login")
      .set("Origin", LOVABLE)
      .set("Access-Control-Request-Method", "POST");
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
