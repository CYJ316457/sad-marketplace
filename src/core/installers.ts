import fs from "node:fs";
import path from "node:path";
import type { InstallScope, ManagedFileRecord, PackManifest, Platform } from "./types.js";
import { ensureDirectory, resolvePlatformRoots } from "./paths.js";
import { loadPackManifest, loadRegistryIndex } from "./registry.js";
import { readState, removeInstalledPack, upsertInstalledPack } from "./state.js";
import { removeFileIfExists, sha256, writeTextFile } from "./write.js";

function selectedPlatforms(
  manifest: PackManifest,
  platform: Platform | "all" | undefined,
): Platform[] {
  const requested: Platform[] =
    platform === "all" || !platform
      ? ["codex", "claude", "codebuddy"]
      : [platform];
  return requested.filter((item) => manifest.platformSupport[item]);
}

function packDirFromRegistry(registryPath: string, packName: string): string {
  return path.resolve(path.dirname(registryPath), "..", "packs", packName);
}

function skillContent(packDir: string, skillPath: string): string {
  return fs.readFileSync(path.join(packDir, skillPath, "SKILL.md"), "utf-8");
}

function codebuddyMarketplaceJson(packName: string): string {
  return JSON.stringify(
    {
      name: "sad-marketplace",
      description: "Shared skill marketplace for CodeBuddy, Codex, and Claude Code",
      owner: {
        name: "Local Publisher",
      },
      metadata: {
        version: "1.0.0",
      },
      plugins: [
        {
          name: packName,
          description: `Marketplace entry for ${packName}`,
          source: `./plugins/${packName}`,
          version: "1.0.0",
          category: "productivity",
          author: {
            name: "Local Publisher",
          },
          license: "MIT",
          skills: [`./plugins/${packName}`],
        },
      ],
    },
    null,
    2,
  );
}

function codebuddyPluginJson(pack: PackManifest): string {
  return JSON.stringify(
    {
      name: pack.codebuddy?.pluginName || pack.name,
      version: pack.version,
      description: pack.description,
      author: pack.author,
      category: pack.codebuddy?.category || "productivity",
      keywords: pack.tags,
    },
    null,
    2,
  );
}

function codebuddyTargets(cwd: string, scope: InstallScope): { marketplaceRoot: string; pluginRoot: string } {
  const base =
    scope === "global"
      ? path.join(process.env.SKILL_MARKETPLACE_HOME || path.join(cwd, ".global-home"), ".codebuddy", "plugins", "marketplaces", "sad-marketplace")
      : path.join(cwd, ".codebuddy", "plugins", "marketplaces", "sad-marketplace");
  return {
    marketplaceRoot: base,
    pluginRoot: path.join(base, "plugins"),
  };
}

function buildManagedFiles(
  cwd: string,
  scope: InstallScope,
  pack: PackManifest,
  packDir: string,
  platforms: Platform[],
): ManagedFileRecord[] {
  const managed: ManagedFileRecord[] = [];
  const roots = resolvePlatformRoots(cwd, scope);

  for (const platform of platforms) {
    const platformRoot = roots[platform];
    ensureDirectory(platformRoot);
    for (const skill of pack.contents.skills) {
      if (skill.kind === "platform" && platform === "codebuddy") continue;
      const content = skillContent(packDir, skill.path);
      const dest = path.join(platformRoot, skill.name, "SKILL.md");
      writeTextFile(dest, content);
      managed.push({
        path: dest,
        hash: sha256(content),
        kind: "skill",
        platform,
      });
    }
  }

  const codebuddy = codebuddyTargets(cwd, scope);
  ensureDirectory(codebuddy.marketplaceRoot);
  ensureDirectory(codebuddy.pluginRoot);
  writeTextFile(path.join(codebuddy.marketplaceRoot, ".codebuddy-plugin", "marketplace.json"), codebuddyMarketplaceJson(pack.name));
  const pluginDir = path.join(codebuddy.pluginRoot, pack.name);
  ensureDirectory(path.join(pluginDir, ".codebuddy-plugin"));
  writeTextFile(path.join(pluginDir, ".codebuddy-plugin", "plugin.json"), codebuddyPluginJson(pack));
  for (const skill of pack.contents.skills) {
    const content = skillContent(packDir, skill.path);
    const dest = path.join(pluginDir, "skills", skill.name, "SKILL.md");
    writeTextFile(dest, content);
    managed.push({
      path: dest,
      hash: sha256(content),
      kind: "skill",
      platform: "codebuddy",
    });
  }
  managed.push({
    path: path.join(codebuddy.marketplaceRoot, ".codebuddy-plugin", "marketplace.json"),
    hash: sha256(codebuddyMarketplaceJson(pack.name)),
    kind: "marketplace",
    platform: "codebuddy",
  });
  managed.push({
    path: path.join(pluginDir, ".codebuddy-plugin", "plugin.json"),
    hash: sha256(codebuddyPluginJson(pack)),
    kind: "plugin-meta",
    platform: "codebuddy",
  });

  return managed;
}

export async function listPacksFromRegistry(
  registryPath: string,
  _platform?: Platform | "all",
) {
  return loadRegistryIndex(registryPath).packs;
}

export async function installPackFromRegistry(options: {
  registryPath: string;
  packName: string;
  scope: InstallScope;
  cwd: string;
  platform?: Platform | "all";
}) {
  const index = loadRegistryIndex(options.registryPath);
  const summary = index.packs.find((pack) => pack.name === options.packName);
  if (!summary) throw new Error(`Pack not found: ${options.packName}`);
  const pack = loadPackManifest(packDirFromRegistry(options.registryPath, options.packName));
  const platforms = selectedPlatforms(pack, options.platform);
  const managedFiles = buildManagedFiles(options.cwd, options.scope, pack, packDirFromRegistry(options.registryPath, options.packName), platforms);
  const record = {
    name: pack.name,
    version: pack.version,
    scope: options.scope,
    platforms,
    source: summary.source,
    managedFiles,
  };
  upsertInstalledPack(options.cwd, options.scope, record);
  return record;
}

export async function updatePackFromRegistry(options: {
  registryPath: string;
  packName: string;
  scope: InstallScope;
  cwd: string;
  platform?: Platform | "all";
}) {
  removeInstalledPack(options.cwd, options.scope, options.packName);
  return installPackFromRegistry(options);
}

export async function uninstallPackFromRegistry(options: {
  packName: string;
  scope: InstallScope;
  cwd: string;
  platform?: Platform | "all";
}) {
  const removed = removeInstalledPack(options.cwd, options.scope, options.packName);
  if (!removed) return { removedPaths: [] };
  const removedPaths: string[] = [];
  for (const record of removed.managedFiles) {
    if (removeFileIfExists(record.path)) removedPaths.push(record.path);
  }
  return { removedPaths };
}

export function getInstalledState(cwd: string, scope: InstallScope) {
  return readState(cwd, scope);
}
