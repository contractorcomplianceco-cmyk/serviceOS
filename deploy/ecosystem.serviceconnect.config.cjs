/**
 * ServiceConnect API — TEAM product (not partner).
 * DOMAIN=service.cagteam.com (easy swap: nginx sites-available/serviceconnect + uptime env).
 * Listen: from .env HOST=127.0.0.1 PORT=3022
 * Nginx fronts DOMAIN; do NOT use service.ccacompliancepartner.com.
 */
const fs = require("fs");

function loadEnvFile(filePath) {
  const env = {};
  if (!fs.existsSync(filePath)) return env;
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }
  return env;
}

const envFile = "/home/ubuntu/projects/serviceOS/.env";

module.exports = {
  apps: [
    {
      name: "serviceconnect-api",
      cwd: "/home/ubuntu/projects/serviceOS",
      script: "artifacts/api-server/dist/index.mjs",
      interpreter: "node",
      node_args: "--enable-source-maps",
      env: {
        NODE_ENV: "production",
        ...loadEnvFile(envFile),
      },
      max_restarts: 20,
      min_uptime: "5s",
      autorestart: true,
      watch: false,
    },
  ],
};
