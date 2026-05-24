import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import {
  installPack,
  listPacks,
  uninstallPack,
  updatePack,
} from "../src/core/api.js";

function repoRoot(): string {
  return "C:\\AI\\Codex\\Install\\sad-marketplace";
}

function registryPath(): string {
  return path.join(repoRoot(), "registry", "index.json");
}

const tempDirs: string[] = [];

function tempWorkspace(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sad-marketplace-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("shared skill marketplace", () => {
  test("exposes a Claude-native marketplace root", async () => {
    const marketplace = JSON.parse(
      fs.readFileSync(path.join(repoRoot(), ".claude-plugin", "marketplace.json"), "utf-8"),
    ) as {
      name: string;
      owner: { name: string };
      plugins: Array<{ name: string; source: string }>;
    };

    expect(marketplace.name).toBe("sad-marketplace");
    expect(marketplace.owner.name).toBe("Local Publisher");
    expect(marketplace.plugins.map((plugin) => plugin.name)).toEqual([
      "starter-pack",
      "floating-island-hooks",
    ]);
  });

  test("exposes a CodeBuddy-native marketplace root", async () => {
    const marketplace = JSON.parse(
      fs.readFileSync(path.join(repoRoot(), ".codebuddy-plugin", "marketplace.json"), "utf-8"),
    ) as {
      name: string;
      owner: { name: string };
      plugins: Array<{ name: string; source: string }>;
    };

    expect(marketplace.name).toBe("sad-marketplace");
    expect(marketplace.owner.name).toBe("Local Publisher");
    expect(marketplace.plugins.map((plugin) => plugin.name)).toEqual([
      "starter-pack",
      "floating-island-hooks",
    ]);
  });

  test("each pack exposes a CodeBuddy plugin manifest", async () => {
    const starter = JSON.parse(
      fs.readFileSync(
        path.join(repoRoot(), "packs", "starter-pack", ".codebuddy-plugin", "plugin.json"),
        "utf-8",
      ),
    ) as { name: string; skills?: string[] };
    const floating = JSON.parse(
      fs.readFileSync(
        path.join(
          repoRoot(),
          "packs",
          "floating-island-hooks",
          ".codebuddy-plugin",
          "plugin.json",
        ),
        "utf-8",
      ),
    ) as { name: string; skills?: string[] };

    expect(starter.name).toBe("starter-pack");
    expect(floating.name).toBe("floating-island-hooks");
    expect(floating.skills).toEqual(["./skills/project-floating-island-hooks"]);
  });

  test("each pack exposes a Claude plugin manifest", async () => {
    const starter = JSON.parse(
      fs.readFileSync(
        path.join(repoRoot(), "packs", "starter-pack", ".claude-plugin", "plugin.json"),
        "utf-8",
      ),
    ) as { name: string; skills?: string[] };
    const floating = JSON.parse(
      fs.readFileSync(
        path.join(
          repoRoot(),
          "packs",
          "floating-island-hooks",
          ".claude-plugin",
          "plugin.json",
        ),
        "utf-8",
      ),
    ) as { name: string; skills?: string[] };

    expect(starter.name).toBe("starter-pack");
    expect(floating.name).toBe("floating-island-hooks");
    expect(floating.skills).toEqual(["./skills/project-floating-island-hooks"]);
  });

  test("lists packs from the registry", async () => {
    const packs = await listPacks({ registryPath: registryPath() });
    expect(packs).toHaveLength(2);
    expect(packs[0]?.name).toBe("starter-pack");
    expect(packs[0]?.contents.skills).toEqual(["writing-clearly", "release-checklist"]);
    expect(packs[1]?.name).toBe("floating-island-hooks");
    expect(packs[1]?.contents.skills).toEqual(["project-floating-island-hooks"]);
  });

  test("installs a pack globally for codex and claude", async () => {
    const workspace = tempWorkspace();
    process.env.SKILL_MARKETPLACE_HOME = path.join(workspace, "home");

    const record = await installPack({
      registryPath: registryPath(),
      packName: "starter-pack",
      scope: "global",
      cwd: workspace,
      platform: "all",
    });

    expect(record.platforms).toEqual(["codex", "claude", "codebuddy"]);
    expect(
      fs.existsSync(
        path.join(workspace, "home", ".codex", "skills", "writing-clearly", "SKILL.md"),
      ),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(workspace, "home", ".claude", "skills", "release-checklist", "SKILL.md"),
      ),
    ).toBe(true);
  });

  test("installs floating island hooks with scripts and bundled assets", async () => {
    const workspace = tempWorkspace();
    process.env.SKILL_MARKETPLACE_HOME = path.join(workspace, "home");

    const record = await installPack({
      registryPath: registryPath(),
      packName: "floating-island-hooks",
      scope: "global",
      cwd: workspace,
      platform: "all",
    });

    expect(record.platforms).toEqual(["codex", "claude", "codebuddy"]);
    expect(
      fs.existsSync(
        path.join(
          workspace,
          "home",
          ".codex",
          "skills",
          "project-floating-island-hooks",
          "scripts",
          "install_codebuddy_hooks.py",
        ),
      ),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(
          workspace,
          "home",
          ".claude",
          "skills",
          "project-floating-island-hooks",
          "assets",
          "floating-island",
          "scripts",
          "islandctl.js",
        ),
      ),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(
          workspace,
          "home",
          ".codebuddy",
          "plugins",
          "marketplaces",
          "sad-marketplace",
          "plugins",
          "floating-island-hooks",
          "skills",
          "project-floating-island-hooks",
          "scripts",
          "install_codebuddy_hooks.py",
        ),
      ),
    ).toBe(true);
  });

  test("floating island skill docs do not hardcode machine-local skill paths", async () => {
    const skillDoc = fs.readFileSync(
      path.join(
        repoRoot(),
        "packs",
        "floating-island-hooks",
        "skills",
        "project-floating-island-hooks",
        "SKILL.md",
      ),
      "utf-8",
    );

    expect(skillDoc).not.toContain("C:\\Users\\C\\.agents\\skills\\project-floating-island-hooks");
    expect(skillDoc).not.toContain("C:\\AI\\Codex\\Install\\FloatingIsland");
  });

  test("installs a pack in project mode with codex shared skills and codebuddy plugin layout", async () => {
    const workspace = tempWorkspace();

    const record = await installPack({
      registryPath: registryPath(),
      packName: "starter-pack",
      scope: "project",
      cwd: workspace,
      platform: "all",
    });

    expect(record.name).toBe("starter-pack");
    expect(
      fs.existsSync(path.join(workspace, ".agents", "skills", "writing-clearly", "SKILL.md")),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(
          workspace,
          ".codebuddy",
          "plugins",
          "marketplaces",
          "sad-marketplace",
          ".codebuddy-plugin",
          "marketplace.json",
        ),
      ),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(
          workspace,
          ".codebuddy",
          "plugins",
          "marketplaces",
          "sad-marketplace",
          "plugins",
          "starter-pack",
          ".codebuddy-plugin",
          "plugin.json",
        ),
      ),
    ).toBe(true);
  });

  test("updates a pack by replacing only managed files", async () => {
    const workspace = tempWorkspace();

    await installPack({
      registryPath: registryPath(),
      packName: "starter-pack",
      scope: "project",
      cwd: workspace,
      platform: "codex",
    });

    const updated = await updatePack({
      registryPath: registryPath(),
      packName: "starter-pack",
      scope: "project",
      cwd: workspace,
      platform: "codex",
    });

    expect(updated.name).toBe("starter-pack");
    expect(updated.managedFiles.length).toBeGreaterThan(0);
  });

  test("uninstalls a pack without removing unrelated files", async () => {
    const workspace = tempWorkspace();
    const unrelated = path.join(workspace, ".agents", "skills", "custom-skill", "SKILL.md");
    fs.mkdirSync(path.dirname(unrelated), { recursive: true });
    fs.writeFileSync(unrelated, "custom");

    await installPack({
      registryPath: registryPath(),
      packName: "starter-pack",
      scope: "project",
      cwd: workspace,
      platform: "all",
    });

    const result = await uninstallPack({
      packName: "starter-pack",
      scope: "project",
      cwd: workspace,
      platform: "all",
    });

    expect(result.removedPaths.length).toBeGreaterThan(0);
    expect(fs.existsSync(unrelated)).toBe(true);
    expect(
      fs.existsSync(path.join(workspace, ".agents", "skills", "writing-clearly", "SKILL.md")),
    ).toBe(false);
  });
});
