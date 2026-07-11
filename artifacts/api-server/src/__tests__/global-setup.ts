import { execSync } from "node:child_process";

// Ensure the shared dev database has the canonical org1 seed data before any
// integration test runs. Seeding is idempotent (onConflictDoNothing), so this is
// safe to run on every invocation.
export default function setup(): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to run integration tests against production.");
  }
  process.env.NODE_ENV = process.env.NODE_ENV ?? "development";
  execSync("pnpm run seed", {
    cwd: new URL("../..", import.meta.url).pathname,
    stdio: "inherit",
  });
}
