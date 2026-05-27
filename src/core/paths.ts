import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { InstallScope, MarketplacePaths, Platform } from "./types.js";

export function resolveMarketplacePaths(
  cwd: string,
  scope: InstallScope,
): MarketplacePaths {
  const homeDir =
    process.env.SKILL_MARKETPLACE_HOME?.trim() ||
    path.join(os.homedir(), ".skill-marketplace");
  return {
    homeDir,
    projectDir: cwd,
  };
}

export function resolvePlatformRoots(
  cwd: string,
  scope: InstallScope,
): Record<Platform, string> {
  const baseDir =
    scope === "global"
      ? resolveMarketplacePaths(cwd, scope).homeDir
      : cwd;

  return {
    codex:
      scope === "global"
        ? path.join(baseDir, ".codex", "skills")
        : path.join(baseDir, ".agents", "skills"),
    claude:
      scope === "global"
        ? path.join(baseDir, ".claude", "skills")
        : path.join(baseDir, ".claude", "skills"),
    codebuddy:
      scope === "global"
        ? path.join(baseDir, ".codebuddy", "plugins", "marketplaces", "sad-marketplace")
        : path.join(baseDir, ".codebuddy", "plugins", "marketplaces", "sad-marketplace"),
    opencode:
      scope === "global"
        ? path.join(baseDir, ".opencode", "skills")
        : path.join(baseDir, ".opencode", "skills"),
  };
}

export function resolvePlatformCommandRoots(
  cwd: string,
  scope: InstallScope,
): Record<Platform, string> {
  const baseDir =
    scope === "global"
      ? resolveMarketplacePaths(cwd, scope).homeDir
      : cwd;

  return {
    codex: path.join(baseDir, ".codex", "commands"),
    claude: path.join(baseDir, ".claude", "commands"),
    codebuddy:
      scope === "global"
        ? path.join(baseDir, ".codebuddy", "plugins", "marketplaces", "sad-marketplace")
        : path.join(baseDir, ".codebuddy", "plugins", "marketplaces", "sad-marketplace"),
    opencode: path.join(baseDir, ".opencode", "commands"),
  };
}

export function ensureDirectory(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}
