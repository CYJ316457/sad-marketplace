#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const args = parseArgs(process.argv.slice(2));
const port = args.port || Number(process.env.FLOATING_ISLAND_PORT) || 17321;
const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const islandRoot = path.resolve(scriptsDir, "..");
const runtimeExe = path.join(islandRoot, "runtime-win32-x64", "electron.exe");
const mainJs = path.join(islandRoot, "src", "main.js");
const islandctl = path.join(scriptsDir, "islandctl.js");

await ensureIslandReady(runtimeExe, mainJs, port);
await forwardState(islandctl, port, args);

async function forwardState(islandctlPath, apiPort, parsed) {
  const childArgs = [islandctlPath, "--port", String(apiPort)];
  if (parsed.action) childArgs.push(parsed.action);
  if (parsed.title !== undefined) childArgs.push(parsed.title);
  if (parsed.message) childArgs.push(parsed.message);

  const child = spawn(process.execPath, childArgs, {
    stdio: "inherit",
    windowsHide: true,
    env: {
      ...process.env,
      FLOATING_ISLAND_PORT: String(apiPort),
    },
  });

  await new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`islandctl terminated by signal ${signal}`));
        return;
      }
      resolve(code ?? 0);
    });
  }).then((code) => {
    process.exitCode = Number(code);
  });
}

async function ensureIslandReady(runtimeExePath, mainJsPath, apiPort) {
  if (await isServerReady(apiPort)) {
    return;
  }

  if (!fs.existsSync(runtimeExePath)) {
    throw new Error(`Floating Island runtime not found: ${runtimeExePath}`);
  }
  if (!fs.existsSync(mainJsPath)) {
    throw new Error(`Floating Island entrypoint not found: ${mainJsPath}`);
  }

  spawn(
    runtimeExePath,
    [mainJsPath],
    {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
      env: {
        ...process.env,
        FLOATING_ISLAND_PORT: String(apiPort),
        FLOATING_ISLAND_DEFAULT_TITLE:
          process.env.FLOATING_ISLAND_DEFAULT_TITLE || "CodeBuddy",
      },
    },
  ).unref();

  const ready = await waitForServer(apiPort, 12000, 250);
  if (!ready) {
    throw new Error(`Floating Island did not start on 127.0.0.1:${apiPort}`);
  }
}

async function waitForServer(apiPort, timeoutMs, intervalMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isServerReady(apiPort)) {
      return true;
    }
    await sleep(intervalMs);
  }
  return false;
}

async function isServerReady(apiPort) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 500);

  try {
    const response = await fetch(`http://127.0.0.1:${apiPort}/status`, {
      method: "GET",
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseArgs(argv) {
  let portValue;
  let index = 0;

  while (index < argv.length) {
    const arg = argv[index];
    if (arg === "--port") {
      const value = Number(argv[index + 1]);
      if (!Number.isFinite(value) || value <= 0) {
        console.error("Invalid --port value");
        process.exit(1);
      }
      portValue = value;
      index += 2;
      continue;
    }
    break;
  }

  return {
    port: portValue,
    action: argv[index] || "busy",
    title: argv[index + 1],
    message: argv.slice(index + 2).join(" "),
  };
}
