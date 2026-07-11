import { hash, verify } from "@node-rs/argon2";

// Argon2id parameters (OWASP-recommended baseline).
// algorithm defaults to Argon2id in @node-rs/argon2.
const ARGON2_OPTS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

export const PASSWORD_ALGO = "argon2id";

export async function hashPassword(plain: string): Promise<string> {
  return hash(plain, ARGON2_OPTS);
}

/**
 * Verify a plaintext password against a stored hash. Supports argon2id
 * (current) and is structured so other algorithms (e.g. bcrypt) can be added
 * per the stored `passwordAlgo` without changing callers.
 */
export async function verifyPassword(
  storedHash: string,
  algo: string,
  plain: string,
): Promise<boolean> {
  if (algo === "argon2id") {
    try {
      return await verify(storedHash, plain);
    } catch {
      return false;
    }
  }
  return false;
}

// Basic strength policy shared by set-password flows.
export function isPasswordStrongEnough(plain: string): boolean {
  return typeof plain === "string" && plain.length >= 8;
}
