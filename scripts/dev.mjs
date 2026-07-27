#!/usr/bin/env node
/**
 * Runs the worker and the web app together in one terminal, with each line
 * prefixed so it is obvious which process said what.
 *
 * Two terminals work just as well (`npm run dev:worker`, `npm run dev:web`);
 * this exists so the local prototype is a single command.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

// Missing env files mean the worker dies with a bare "Missing required
// environment variable", which reads like a bug rather than a missing setup step.
const required = [
  ["apps/worker/.env", "the worker's Supabase credentials"],
  ["apps/web/.env.local", "the web app's Supabase credentials"],
];
const missing = required.filter(([file]) => !existsSync(join(root, file)));
if (missing.length > 0) {
  console.error("Missing local configuration:\n");
  for (const [file, what] of missing) console.error(`  ${file}  — ${what}`);
  console.error("\nRun this first:\n\n  npm run local:setup\n");
  process.exit(1);
}

const procs = [
  { name: "worker", colour: "\u001b[36m", args: ["run", "dev:worker"] },
  { name: "web", colour: "\u001b[35m", args: ["run", "dev:web"] },
];

const useColour = process.stdout.isTTY;
const OFF = useColour ? "\u001b[0m" : "";
const label = (p) => (useColour ? `${p.colour}${p.name.padEnd(6)}${OFF}` : `${p.name.padEnd(6)}`);

let shuttingDown = false;

function pipe(stream, proc, out) {
  let buffer = "";
  stream.on("data", (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) out.write(`${label(proc)} │ ${line}\n`);
  });
  // Flush a trailing partial line rather than swallowing it.
  stream.on("end", () => {
    if (buffer) out.write(`${label(proc)} │ ${buffer}\n`);
  });
}

const isWindows = process.platform === "win32";

const children = procs.map((proc) => {
  const child = spawn("npm", proc.args, {
    cwd: root,
    stdio: ["ignore", "pipe", "pipe"],
    // npm is a shell script on Windows; harmless elsewhere.
    shell: isWindows,
    // Each child leads its own process group, so stopping it takes npm's
    // children with it. Signalling npm alone leaves tsx and next running, and
    // the next start then fails on a port already in use.
    detached: !isWindows,
  });
  pipe(child.stdout, proc, process.stdout);
  pipe(child.stderr, proc, process.stderr);

  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    console.error(`\n${proc.name} exited (${signal ?? code}). Stopping the other process.`);
    shutdown(code ?? 1);
  });
  child.on("error", (err) => {
    console.error(`\nCould not start ${proc.name}: ${err.message}`);
    shutdown(1);
  });
  return child;
});

/** Signals a child's whole process group, so npm's descendants go too. */
function signalGroup(child, signal) {
  if (child.exitCode !== null || child.signalCode !== null || !child.pid) return;
  try {
    if (isWindows) child.kill(signal);
    else process.kill(-child.pid, signal);
  } catch {
    // Already gone between the check and the signal.
  }
}

function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  // Set here rather than in the timer below: once both children are gone Node
  // exits on its own, before an unref'd timer ever fires, and a failure would
  // otherwise report success.
  process.exitCode = code;
  for (const child of children) signalGroup(child, "SIGTERM");

  // The worker drains in-flight runs on SIGTERM. Give it a moment, then insist,
  // so Ctrl-C never leaves something holding port 3000 or 8080.
  setTimeout(() => {
    const alive = children.filter((c) => c.exitCode === null && c.signalCode === null);
    if (alive.length > 0) {
      console.error("Still running after 6s — forcing.");
      for (const child of alive) signalGroup(child, "SIGKILL");
    }
    setTimeout(() => process.exit(code), 500).unref();
  }, 6000).unref();
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    console.log("\nShutting down…");
    shutdown(0);
  });
}
