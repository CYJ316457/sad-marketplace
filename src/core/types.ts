export type Platform = "codex" | "claude" | "codebuddy";
export type InstallScope = "global" | "project";

export interface PackAuthor {
  name: string;
  email?: string;
}

export interface RegistryPackSummary {
  name: string;
  version: string;
  description: string;
  author: PackAuthor;
  license: string;
  tags: string[];
  source: string;
  platformSupport: Record<Platform, boolean>;
  install: {
    unit: "pack";
  };
  contents: {
    skills: string[];
    commands?: string[];
  };
}

export interface RegistryIndex {
  marketplace: {
    name: string;
    description: string;
    source: string;
    version: string;
  };
  packs: RegistryPackSummary[];
}

export interface PackSkill {
  name: string;
  path: string;
  kind: "shared" | "platform";
}

export interface PackCommand {
  name: string;
  path: string;
  kind: "shared" | "platform";
}

export interface PackManifest {
  name: string;
  version: string;
  description: string;
  author: PackAuthor;
  license: string;
  tags: string[];
  platformSupport: Record<Platform, boolean>;
  contents: {
    skills: PackSkill[];
    commands?: PackCommand[];
  };
  codebuddy?: {
    pluginName: string;
    category?: string;
  };
}

export interface ManagedFileRecord {
  path: string;
  hash: string;
  kind: "skill" | "command" | "marketplace" | "plugin-meta";
  platform: Platform;
}

export interface InstalledPackRecord {
  name: string;
  version: string;
  scope: InstallScope;
  platforms: Platform[];
  source: string;
  managedFiles: ManagedFileRecord[];
}

export interface InstallState {
  installedPacks: InstalledPackRecord[];
}

export interface MarketplacePaths {
  homeDir: string;
  projectDir: string;
}
