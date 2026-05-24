import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
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

function pythonCommand(): { cmd: string; args: string[] } {
  const python = spawnSync("python", ["--version"], { encoding: "utf-8" });
  if (python.status === 0) {
    return { cmd: "python", args: [] };
  }

  const py = spawnSync("py", ["-3", "--version"], { encoding: "utf-8" });
  if (py.status === 0) {
    return { cmd: "py", args: ["-3"] };
  }

  throw new Error("Python runtime not available for gpt-image-2 skill test");
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
      "svn-toolkit",
      "gpt-image-2-gen",
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
      "svn-toolkit",
      "gpt-image-2-gen",
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

    const svn = JSON.parse(
      fs.readFileSync(
        path.join(repoRoot(), "packs", "svn-toolkit", ".codebuddy-plugin", "plugin.json"),
        "utf-8",
      ),
    ) as { name: string; commands?: string[] };
    expect(svn.name).toBe("svn-toolkit");
    expect(svn.commands).toContain("./commands/SVN-log.md");

    const image = JSON.parse(
      fs.readFileSync(
        path.join(repoRoot(), "packs", "gpt-image-2-gen", ".codebuddy-plugin", "plugin.json"),
        "utf-8",
      ),
    ) as { name: string; commands?: string[] };
    expect(image.name).toBe("gpt-image-2-gen");
    expect(image.commands).toContain("./commands/GPT-image-2-Gen.md");
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

    const svn = JSON.parse(
      fs.readFileSync(
        path.join(repoRoot(), "packs", "svn-toolkit", ".claude-plugin", "plugin.json"),
        "utf-8",
      ),
    ) as { name: string; commands?: string[] };
    expect(svn.name).toBe("svn-toolkit");
    expect(svn.commands).toContain("./commands");

    const image = JSON.parse(
      fs.readFileSync(
        path.join(repoRoot(), "packs", "gpt-image-2-gen", ".claude-plugin", "plugin.json"),
        "utf-8",
      ),
    ) as { name: string; commands?: string[] };
    expect(image.name).toBe("gpt-image-2-gen");
    expect(image.commands).toContain("./commands");
  });

  test("lists packs from the registry", async () => {
    const packs = await listPacks({ registryPath: registryPath() });
    expect(packs).toHaveLength(4);
    expect(packs[0]?.name).toBe("starter-pack");
    expect(packs[0]?.contents.skills).toEqual(["writing-clearly", "release-checklist"]);
    expect(packs[1]?.name).toBe("floating-island-hooks");
    expect(packs[1]?.contents.skills).toEqual(["project-floating-island-hooks"]);
    expect(packs[2]?.name).toBe("svn-toolkit");
    expect(packs[2]?.contents.skills).toEqual(["svn-workflow"]);
    expect(packs[2]?.contents.commands).toEqual([
      "SVN-info",
      "SVN-log",
      "SVN-status",
      "SVN-diff",
      "SVN-update",
      "SVN-add",
      "SVN-delete",
      "SVN-revert",
      "SVN-commit",
      "SVN-resolve",
      "SVN-blame",
      "SVN-list",
      "SVN-switch",
      "SVN-cleanup",
    ]);
    expect(packs[3]?.name).toBe("gpt-image-2-gen");
    expect(packs[3]?.contents.skills).toEqual(["gpt-image-2-gen"]);
    expect(packs[3]?.contents.commands).toEqual(["GPT-image-2-Gen"]);
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
          ".claude",
          "skills",
          "project-floating-island-hooks",
          "assets",
          "floating-island-runtime-win32-x64",
          "README.md",
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

  test("floating island installer docs describe prebuilt windows runtime delivery", async () => {
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
    const installer = fs.readFileSync(
      path.join(
        repoRoot(),
        "packs",
        "floating-island-hooks",
        "skills",
        "project-floating-island-hooks",
        "scripts",
        "install_codebuddy_hooks.py",
      ),
      "utf-8",
    );

    expect(skillDoc).toContain("预打包");
    expect(skillDoc).not.toContain("run `npm install`");
    expect(installer).toContain("extract_runtime");
    expect(installer).toContain("start-floating-island.cmd");
    expect(installer).not.toContain("npm start");
  });

  test("floating island installer emits shell-safe hook commands", async () => {
    const workspace = tempWorkspace();
    process.env.SKILL_MARKETPLACE_HOME = path.join(workspace, "home");

    await installPack({
      registryPath: registryPath(),
      packName: "floating-island-hooks",
      scope: "global",
      cwd: workspace,
      platform: "codex",
    });

    const project = path.join(workspace, "project");
    fs.mkdirSync(project, { recursive: true });
    const script = path.join(
      workspace,
      "home",
      ".codex",
      "skills",
      "project-floating-island-hooks",
      "scripts",
      "install_codebuddy_hooks.py",
    );

    const py = pythonCommand();
    const result = spawnSync(
      py.cmd,
      [...py.args, script, "--project", project, "--platform", "codebuddy", "--dry-run"],
      { encoding: "utf-8" },
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("node ");
    expect(result.stdout).toContain("islandctl.js");
    expect(result.stdout).toContain("--port");
    expect(result.stdout).not.toContain("cmd.exe /d /s /c call");
  });

  test("floating island start script sets a default idle title", async () => {
    const workspace = tempWorkspace();
    process.env.SKILL_MARKETPLACE_HOME = path.join(workspace, "home");

    await installPack({
      registryPath: registryPath(),
      packName: "floating-island-hooks",
      scope: "global",
      cwd: workspace,
      platform: "codex",
    });

    const project = path.join(workspace, "project");
    fs.mkdirSync(project, { recursive: true });
    const script = path.join(
      workspace,
      "home",
      ".codex",
      "skills",
      "project-floating-island-hooks",
      "scripts",
      "install_codebuddy_hooks.py",
    );

    const py = pythonCommand();
    const installResult = spawnSync(
      py.cmd,
      [...py.args, script, "--project", project, "--platform", "codebuddy"],
      { encoding: "utf-8" },
    );

    expect(installResult.status).toBe(0);
    const startScript = fs.readFileSync(
      path.join(project, ".codebuddy", "floating-island", "start-floating-island.cmd"),
      "utf-8",
    );
    expect(startScript).toContain("FLOATING_ISLAND_DEFAULT_TITLE=CodeBuddy");
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

  test("installs svn commands for all supported platforms", async () => {
    const workspace = tempWorkspace();
    process.env.SKILL_MARKETPLACE_HOME = path.join(workspace, "home");

    const record = await installPack({
      registryPath: registryPath(),
      packName: "svn-toolkit",
      scope: "global",
      cwd: workspace,
      platform: "all",
    });

    expect(record.platforms).toEqual(["codex", "claude", "codebuddy"]);
    expect(
      fs.existsSync(path.join(workspace, "home", ".codex", "skills", "SVN-log", "SKILL.md")),
    ).toBe(true);
    expect(
      fs.existsSync(path.join(workspace, "home", ".claude", "commands", "SVN-log.md")),
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
          "svn-toolkit",
          "commands",
          "SVN-log.md",
        ),
      ),
    ).toBe(true);
  });

  test("installs gpt-image-2 generator skill assets", async () => {
    const workspace = tempWorkspace();
    process.env.SKILL_MARKETPLACE_HOME = path.join(workspace, "home");

    const record = await installPack({
      registryPath: registryPath(),
      packName: "gpt-image-2-gen",
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
          "gpt-image-2-gen",
          "scripts",
          "generate_gpt_image_2.py",
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
          "gpt-image-2-gen",
          ".gpt-image-2.env",
        ),
      ),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(
          workspace,
          "home",
          ".claude",
          "commands",
          "GPT-image-2-Gen.md",
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
          "gpt-image-2-gen",
          "commands",
          "GPT-image-2-Gen.md",
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
          "gpt-image-2-gen",
          "skills",
          "gpt-image-2-gen",
          "scripts",
          "generate_gpt_image_2.py",
        ),
      ),
    ).toBe(true);
  });

  test("gpt-image-2 script creates project env demo on first run", async () => {
    const workspace = tempWorkspace();
    process.env.SKILL_MARKETPLACE_HOME = path.join(workspace, "home");

    await installPack({
      registryPath: registryPath(),
      packName: "gpt-image-2-gen",
      scope: "global",
      cwd: workspace,
      platform: "codex",
    });

    const project = path.join(workspace, "project");
    fs.mkdirSync(project, { recursive: true });
    const script = path.join(
      workspace,
      "home",
      ".codex",
      "skills",
      "gpt-image-2-gen",
      "scripts",
      "generate_gpt_image_2.py",
    );

    const py = pythonCommand();
    const result = spawnSync(
      py.cmd,
      [...py.args, script, "--project", project, "--prompt", "demo image"],
      { encoding: "utf-8" },
    );

    expect(result.status).toBe(0);
    expect(fs.existsSync(path.join(project, ".gpt-image-2.env"))).toBe(true);
    expect(fs.readFileSync(path.join(project, ".gpt-image-2.env"), "utf-8")).toContain(
      "OPENAI_API_KEY=sk-your-api-key-here",
    );
  });

  test("gpt-image-2 script maps aspect ratio to a supported size", async () => {
    const workspace = tempWorkspace();
    process.env.SKILL_MARKETPLACE_HOME = path.join(workspace, "home");

    await installPack({
      registryPath: registryPath(),
      packName: "gpt-image-2-gen",
      scope: "global",
      cwd: workspace,
      platform: "codex",
    });

    const script = path.join(
      workspace,
      "home",
      ".codex",
      "skills",
      "gpt-image-2-gen",
      "scripts",
      "generate_gpt_image_2.py",
    );
    const probe = path.join(workspace, "probe_gpt_image_2.py");
    fs.writeFileSync(
      probe,
      [
        "import importlib.util",
        "import json",
        `spec = importlib.util.spec_from_file_location('gpt_image_2_gen', r'''${script}''')`,
        "mod = importlib.util.module_from_spec(spec)",
        "spec.loader.exec_module(mod)",
        "print(json.dumps({",
        "  'ratio_16_9': mod.resolve_size(None, '16:9'),",
        "  'ratio_9_16': mod.resolve_size(None, '9:16'),",
        "  'size_wins': mod.resolve_size('1024x1536', '16:9')",
        "}))",
      ].join("\n"),
      "utf-8",
    );

    const py = pythonCommand();
    const result = spawnSync(
      py.cmd,
      [...py.args, probe],
      { encoding: "utf-8" },
    );

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout.trim())).toEqual({
      ratio_16_9: "1536x1024",
      ratio_9_16: "1024x1536",
      size_wins: "1024x1536",
    });
  });

  test("gpt-image-2 docs expose custom size and aspect ratio options", async () => {
    const commandDoc = fs.readFileSync(
      path.join(repoRoot(), "packs", "gpt-image-2-gen", "commands", "GPT-image-2-Gen.md"),
      "utf-8",
    );
    const skillDoc = fs.readFileSync(
      path.join(repoRoot(), "packs", "gpt-image-2-gen", "skills", "gpt-image-2-gen", "SKILL.md"),
      "utf-8",
    );

    expect(commandDoc).toContain("--size");
    expect(commandDoc).toContain("--aspect-ratio");
    expect(skillDoc).toContain("--size");
    expect(skillDoc).toContain("--aspect-ratio");
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
