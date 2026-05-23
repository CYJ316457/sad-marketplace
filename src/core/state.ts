import fs from "node:fs";
import path from "node:path";
import type { InstallState, InstalledPackRecord, InstallScope } from "./types.js";

function stateFile(cwd: string, scope: InstallScope): string {
  return scope === "global"
    ? path.join(process.env.SKILL_MARKETPLACE_HOME || path.join(cwd, ".global-home"), ".skill-marketplace", "state.json")
    : path.join(cwd, ".skill-marketplace", "state.json");
}

export function readState(cwd: string, scope: InstallScope): InstallState {
  const file = stateFile(cwd, scope);
  if (!fs.existsSync(file)) {
    return { installedPacks: [] };
  }
  return JSON.parse(fs.readFileSync(file, "utf-8")) as InstallState;
}

export function writeState(
  cwd: string,
  scope: InstallScope,
  state: InstallState,
): void {
  const file = stateFile(cwd, scope);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(state, null, 2));
}

export function upsertInstalledPack(
  cwd: string,
  scope: InstallScope,
  record: InstalledPackRecord,
): void {
  const state = readState(cwd, scope);
  const next = state.installedPacks.filter((pack) => pack.name !== record.name);
  next.push(record);
  writeState(cwd, scope, { installedPacks: next });
}

export function removeInstalledPack(
  cwd: string,
  scope: InstallScope,
  packName: string,
): InstalledPackRecord | undefined {
  const state = readState(cwd, scope);
  const removed = state.installedPacks.find((pack) => pack.name === packName);
  if (!removed) return undefined;
  writeState(cwd, scope, {
    installedPacks: state.installedPacks.filter((pack) => pack.name !== packName),
  });
  return removed;
}
