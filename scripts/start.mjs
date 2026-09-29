import { cpSync } from "node:fs";
import { spawn } from "node:child_process";

// Next's standalone output requires its static assets alongside server.js.
cpSync(".next/static", ".next/standalone/.next/static", { recursive: true });
const server = spawn(process.execPath, [".next/standalone/server.js"], {
  stdio: "inherit",
  env: {
    ...process.env,
    PORT: process.env.KUZELKATOR_PORT || "43127",
    HOSTNAME: "127.0.0.1",
  },
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => server.kill(signal));
server.on("exit", (code) => process.exit(code ?? 0));
