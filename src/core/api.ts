import type {
  InstallScope,
  InstalledPackRecord,
  PackManifest,
  Platform,
  RegistryIndex,
} from "./types.js";
import {
  getInstalledState,
  installPackFromRegistry,
  listPacksFromRegistry,
  uninstallPackFromRegistry,
  updatePackFromRegistry,
} from "./installers.js";
import { loadPackManifest, loadRegistryIndex } from "./registry.js";

export async function loadRegistry(registryPath: string): Promise<RegistryIndex> {
  return loadRegistryIndex(registryPath);
}

export async function loadPack(
  registryPath: string,
  packName: string,
): Promise<PackManifest> {
  const baseDir = registryPath.replace(/[/\\]registry[/\\]index\.json$/, "");
  return loadPackManifest(`${baseDir}/packs/${packName}`);
}

export async function listPacks(options: {
  registryPath: string;
  platform?: Platform | "all";
}) {
  return listPacksFromRegistry(options.registryPath, options.platform);
}

export async function installPack(options: {
  registryPath: string;
  packName: string;
  scope: InstallScope;
  cwd: string;
  platform?: Platform | "all";
}): Promise<InstalledPackRecord> {
  return installPackFromRegistry(options);
}

export async function updatePack(options: {
  registryPath: string;
  packName: string;
  scope: InstallScope;
  cwd: string;
  platform?: Platform | "all";
}): Promise<InstalledPackRecord> {
  return updatePackFromRegistry(options);
}

export async function uninstallPack(options: {
  packName: string;
  scope: InstallScope;
  cwd: string;
  platform?: Platform | "all";
}) {
  return uninstallPackFromRegistry(options);
}

export { getInstalledState };
