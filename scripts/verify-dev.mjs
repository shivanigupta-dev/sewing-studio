import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { verifyLocalhost } from "./verify-localhost.mjs";

const port = Number(process.env.SEWING_STUDIO_VERIFY_PORT ?? 3100);
if (!Number.isInteger(port) || port < 1024 || port > 65_535) throw new Error("SEWING_STUDIO_VERIFY_PORT must be a valid non-privileged port");

const baseUrl = `http://127.0.0.1:${port}`;
const localhostUrl = `http://localhost:${port}`;
const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const server = spawn(command, ["dev", "--port", String(port)], { cwd: process.cwd(), env: process.env, stdio: ["ignore", "pipe", "pipe"] });
let recentOutput = "";
const remember = (chunk) => { recentOutput = `${recentOutput}${chunk.toString()}`.slice(-12_000); };
server.stdout.on("data", remember); server.stderr.on("data", remember);
let exited = false; server.once("exit", () => { exited = true; });

async function stopServer() {
  if (exited) return;
  server.kill("SIGTERM");
  await Promise.race([new Promise((resolve) => server.once("exit", resolve)), delay(5_000).then(() => { if (!exited) server.kill("SIGKILL"); })]);
}

try {
  let ready = false;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (exited) throw new Error(`The development server exited before becoming ready.\n${recentOutput}`);
    try { if ((await fetch(baseUrl, { signal: AbortSignal.timeout(1_000) })).ok) { ready = true; break; } } catch { /* bounded startup race */ }
    await delay(500);
  }
  if (!ready) throw new Error(`The development server did not become ready at ${baseUrl}.\n${recentOutput}`);
  const results = await Promise.all([verifyLocalhost(baseUrl), verifyLocalhost(localhostUrl)]);
  console.log(`\nDevelopment fidelity passed (${results[0].assetCount} linked static assets).`);
} catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
finally { await stopServer(); }
