import fs from "node:fs";
import os from "node:os";
import net from "node:net";
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
  return process.cwd();
}

function registryPath(): string {
  return path.join(repoRoot(), "registry", "index.json");
}

const ANDROID_ADB_COMMANDS = [
  "ADB-Devices",
  "ADB-Pair",
  "ADB-Connect",
  "ADB-Disconnect",
  "ADB-Shell",
  "ADB-Install",
  "ADB-Launch",
  "ADB-Packages",
  "ADB-UI-Dump",
  "ADB-Screenshot",
  "ADB-Tap",
  "ADB-Text",
  "ADB-Keyevent",
  "ADB-Swipe",
  "ADB-Pull",
  "ADB-Logcat",
  "ADB-Screenrecord",
  "ADB-Push",
  "ADB-Clear-Data",
  "ADB-Force-Stop",
];

const ANDROID_ADB_CODEBUDDY_COMMANDS = ANDROID_ADB_COMMANDS.map(
  (command) => `./commands/${command}.md`,
);

const tempDirs: string[] = [];

function tempWorkspace(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sad-marketplace-"));
  tempDirs.push(dir);
  return dir;
}


function reserveFreePort(): Promise<{ port: number; release: () => Promise<void> }> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("Unable to reserve test port")));
        return;
      }
      resolve({
        port: address.port,
        release: () => new Promise((closeResolve) => server.close(() => closeResolve())),
      });
    });
  });
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
}, 60_000);

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
      "trellis-dashboard",
      "markitdown",
      "android-adb",
      "ppt-master",
    ]);
    expect(marketplace.plugins.map((plugin) => plugin.name)).not.toContain("cb-hud");
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
      "cb-hud",
      "trellis-dashboard",
      "markitdown",
      "android-adb",
      "ppt-master",
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
    ) as { name: string; skills?: string[]; commands?: string[] };

    expect(starter.name).toBe("starter-pack");
    expect(floating.name).toBe("floating-island-hooks");
    expect(floating.skills).toEqual(["./skills/project-floating-island-hooks"]);
    expect(floating.commands).toContain("./commands/Start-Floating-Island.md");

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

    const markitdown = JSON.parse(
      fs.readFileSync(
        path.join(repoRoot(), "packs", "markitdown", ".codebuddy-plugin", "plugin.json"),
        "utf-8",
      ),
    ) as { name: string; skills?: string[]; commands?: string[] };
    expect(markitdown.name).toBe("markitdown");
    expect(markitdown.skills).toEqual(["./skills/markitdown"]);
    expect(markitdown.commands).toContain("./commands/MarkItDown-Convert.md");

    const androidAdb = JSON.parse(
      fs.readFileSync(
        path.join(repoRoot(), "packs", "android-adb", ".codebuddy-plugin", "plugin.json"),
        "utf-8",
      ),
    ) as { name: string; skills?: string[]; commands?: string[] };
    expect(androidAdb.name).toBe("android-adb");
    expect(androidAdb.skills).toEqual(["./skills/android-adb"]);
    expect(androidAdb.commands).toEqual(ANDROID_ADB_CODEBUDDY_COMMANDS);

    const pptMaster = JSON.parse(
      fs.readFileSync(
        path.join(repoRoot(), "packs", "ppt-master", ".codebuddy-plugin", "plugin.json"),
        "utf-8",
      ),
    ) as { name: string; skills?: string[] };
    expect(pptMaster.name).toBe("ppt-master");
    expect(pptMaster.skills).toEqual(["./skills/ppt-master"]);

    const cbHud = JSON.parse(
      fs.readFileSync(
        path.join(repoRoot(), "packs", "cb-hud", ".codebuddy-plugin", "plugin.json"),
        "utf-8",
      ),
    ) as { name: string; skills?: string[]; commands?: string[] };
    expect(cbHud.name).toBe("cb-hud");
    expect(cbHud.skills).toEqual(["./skills/cb-hud"]);
    expect(cbHud.commands).toEqual([
      "./commands/CB-HUD-init.md",
      "./commands/CB-HUD-show.md",
      "./commands/CB-HUD-hide.md",
      "./commands/CB-HUD-uninstall.md",
    ]);
  });

  test("trellis-dashboard plugin manifests include commands", async () => {
    const codebuddy = JSON.parse(
      fs.readFileSync(
        path.join(repoRoot(), "packs", "trellis-dashboard", ".codebuddy-plugin", "plugin.json"),
        "utf-8",
      ),
    ) as { name: string; commands?: string[]; skills?: string[] };
    const claude = JSON.parse(
      fs.readFileSync(
        path.join(repoRoot(), "packs", "trellis-dashboard", ".claude-plugin", "plugin.json"),
        "utf-8",
      ),
    ) as { name: string; commands?: string[]; skills?: string[] };

    expect(codebuddy.name).toBe("trellis-dashboard");
    expect(codebuddy.skills).toEqual(["./skills/trellis-dashboard"]);
    expect(codebuddy.commands).toContain("./commands/Trellis-Dashboard-Init.md");
    expect(codebuddy.commands).toContain("./commands/Trellis-Dashboard-Start.md");
    expect(claude.name).toBe("trellis-dashboard");
    expect(claude.commands).toContain("./commands/Trellis-Dashboard-Install-OpenCode.md");
  });

  test("trellis-dashboard start command assigns per-project dashboard records", async () => {
    const script = path.join(
      repoRoot(),
      "packs",
      "trellis-dashboard",
      "skills",
      "trellis-dashboard",
      "scripts",
      "dashboard-server.js",
    );
    const workspace = tempWorkspace();
    const project = path.join(workspace, "project");
    fs.mkdirSync(path.join(project, ".trellis", ".runtime", "dashboard"), { recursive: true });
    fs.mkdirSync(path.join(project, ".trellis", "tasks"), { recursive: true });

    const reserved = await reserveFreePort();
    const port = reserved.port;
    await reserved.release();

    const first = spawnSync("node", [script, "start", "--project", project, "--port", String(port)], {
      encoding: "utf-8",
    });
    expect(first.status).toBe(0);
    const payload = JSON.parse(first.stdout.trim());
    expect(payload.repoRoot || project).toContain(project);
    expect(payload.url).toContain("http://127.0.0.1:");

    const open = spawnSync("node", [script, "open", "--project", project], { encoding: "utf-8" });
    expect(open.status).toBe(0);

    const stop = spawnSync("node", [script, "stop", "--project", project], { encoding: "utf-8" });
    expect(stop.status).toBe(0);
  });

  test("trellis-dashboard event writer tolerates invalid unicode surrogates", async () => {
    const script = path.join(
      repoRoot(),
      "packs",
      "trellis-dashboard",
      "skills",
      "trellis-dashboard",
      "scripts",
      "write_dashboard_event.py",
    );
    const workspace = tempWorkspace();
    fs.mkdirSync(path.join(workspace, ".trellis", ".runtime"), { recursive: true });

    const py = pythonCommand();
    const result = spawnSync(
      py.cmd,
      [...py.args, script, "--project", workspace, "--host", "codebuddy", "--stage", "Stop"],
      {
        encoding: "utf-8",
        input: "{\"cwd\":\"" + workspace.replace(/\\/g, "\\\\") + "\",\"message\":\"\\udcad\"}",
      },
    );

    expect(result.status).toBe(0);
    const events = fs.readFileSync(
      path.join(workspace, ".trellis", ".runtime", "dashboard-events.jsonl"),
      "utf-8",
    );
    expect(events).toContain('"host": "codebuddy"');
  });
  test("trellis-dashboard init bootstrap script supports auto platform and startup flags", async () => {
    const script = path.join(
      repoRoot(),
      "packs",
      "trellis-dashboard",
      "skills",
      "trellis-dashboard",
      "scripts",
      "install_hooks.py",
    );
    const workspace = tempWorkspace();
    fs.mkdirSync(path.join(workspace, ".claude"), { recursive: true });

    const py = pythonCommand();
    const result = spawnSync(
      py.cmd,
      [
        ...py.args,
        script,
        "--project",
        workspace,
        "--platform",
        "auto",
        "--start",
        "--open",
        "--dry-run",
      ],
      { encoding: "utf-8" },
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("install_claude_hooks.py");
    expect(result.stdout).toContain("dashboard-server.js start");
    expect(result.stdout).toContain("dashboard-server.js open");
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
    ) as { name: string; skills?: string[]; commands?: string[] };

    expect(starter.name).toBe("starter-pack");
    expect(floating.name).toBe("floating-island-hooks");
    expect(floating.skills).toEqual(["./skills/project-floating-island-hooks"]);
    expect(floating.commands).toContain("./commands/Start-Floating-Island.md");

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

    const markitdown = JSON.parse(
      fs.readFileSync(
        path.join(repoRoot(), "packs", "markitdown", ".claude-plugin", "plugin.json"),
        "utf-8",
      ),
    ) as { name: string; commands?: string[]; skills?: string[] };
    expect(markitdown.name).toBe("markitdown");
    expect(markitdown.skills).toEqual(["./skills/markitdown"]);
    expect(markitdown.commands).toContain("./commands");

    const androidAdb = JSON.parse(
      fs.readFileSync(
        path.join(repoRoot(), "packs", "android-adb", ".claude-plugin", "plugin.json"),
        "utf-8",
      ),
    ) as { name: string; commands?: string[]; skills?: string[] };
    expect(androidAdb.name).toBe("android-adb");
    expect(androidAdb.skills).toEqual(["./skills/android-adb"]);
    expect(androidAdb.commands).toEqual(["./commands"]);

    const pptMaster = JSON.parse(
      fs.readFileSync(
        path.join(repoRoot(), "packs", "ppt-master", ".claude-plugin", "plugin.json"),
        "utf-8",
      ),
    ) as { name: string; skills?: string[] };
    expect(pptMaster.name).toBe("ppt-master");
    expect(pptMaster.skills).toEqual(["./skills/ppt-master"]);
  });

  test("lists packs from the registry", async () => {
    const packs = await listPacks({ registryPath: registryPath() });
    expect(packs).toHaveLength(9);
    expect(packs[0]?.name).toBe("starter-pack");
    expect(packs[0]?.contents.skills).toEqual(["writing-clearly", "release-checklist"]);
    expect(packs[1]?.name).toBe("floating-island-hooks");
    expect(packs[1]?.contents.skills).toEqual(["project-floating-island-hooks"]);
    expect(packs[1]?.contents.commands).toEqual(["Start-Floating-Island"]);
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
    expect(packs[4]?.name).toBe("cb-hud");
    expect(packs[4]?.platformSupport).toEqual({
      codex: false,
      claude: false,
      codebuddy: true,
      opencode: false,
    });
    expect(packs[4]?.contents.skills).toEqual(["cb-hud"]);
    expect(packs[4]?.contents.commands).toEqual([
      "CB-HUD-init",
      "CB-HUD-show",
      "CB-HUD-hide",
      "CB-HUD-uninstall",
    ]);
    expect(packs[5]?.name).toBe("trellis-dashboard");
    expect(packs[5]?.platformSupport).toEqual({
      codex: true,
      claude: true,
      codebuddy: true,
      opencode: true,
    });
    expect(packs[5]?.contents.skills).toEqual(["trellis-dashboard"]);
    expect(packs[5]?.contents.commands).toEqual([
      "Trellis-Dashboard-Init",
      "Trellis-Dashboard-Start",
      "Trellis-Dashboard-Open",
      "Trellis-Dashboard-Stop",
      "Trellis-Dashboard-Install-CodeBuddy",
      "Trellis-Dashboard-Install-Claude",
      "Trellis-Dashboard-Install-OpenCode",
    ]);

    expect(packs[6]?.name).toBe("markitdown");
    expect(packs[6]?.platformSupport).toEqual({
      codex: true,
      claude: true,
      codebuddy: true,
      opencode: true,
    });
    expect(packs[6]?.contents.skills).toEqual(["markitdown"]);
    expect(packs[6]?.contents.commands).toEqual(["MarkItDown-Convert"]);

    expect(packs[7]?.name).toBe("android-adb");
    expect(packs[7]?.platformSupport).toEqual({
      codex: true,
      claude: true,
      codebuddy: true,
      opencode: true,
    });
    expect(packs[7]?.contents.skills).toEqual(["android-adb"]);
    expect(packs[7]?.contents.commands).toEqual(ANDROID_ADB_COMMANDS);

    expect(packs[8]?.name).toBe("ppt-master");
    expect(packs[8]?.platformSupport).toEqual({
      codex: true,
      claude: true,
      codebuddy: true,
      opencode: true,
    });
    expect(packs[8]?.contents.skills).toEqual(["ppt-master"]);
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

    expect(record.platforms).toEqual(["codex", "claude", "codebuddy", "opencode"]);
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

    expect(record.platforms).toEqual(["codex", "claude", "codebuddy", "opencode"]);
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
    expect(
      fs.existsSync(
        path.join(
          workspace,
          "home",
          ".opencode",
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
    expect(result.stdout).toContain("island-hook.js");
    expect(result.stdout).toContain("--port");
    expect(result.stdout).not.toContain("cmd.exe /d /s /c call");
  });

  test("floating island installer emits auto-start wrapper scripts", async () => {
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
    const wrapper = fs.readFileSync(
      path.join(project, ".codebuddy", "floating-island", "scripts", "island-hook.js"),
      "utf-8",
    );
    expect(wrapper).toContain("waitForServer");
    expect(wrapper).toContain("runtime-win32-x64");
    expect(wrapper).toContain("main.js");
    expect(wrapper).toContain("spawn");
    expect(wrapper).toContain("/status");
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

    expect(record.platforms).toEqual(["codex", "claude", "codebuddy", "opencode"]);
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
    expect(
      fs.existsSync(path.join(workspace, "home", ".opencode", "skills", "SVN-log", "SKILL.md")),
    ).toBe(true);
  });

  test("installs floating island start command for all supported platforms", async () => {
    const workspace = tempWorkspace();
    process.env.SKILL_MARKETPLACE_HOME = path.join(workspace, "home");

    const record = await installPack({
      registryPath: registryPath(),
      packName: "floating-island-hooks",
      scope: "global",
      cwd: workspace,
      platform: "all",
    });

    expect(record.platforms).toEqual(["codex", "claude", "codebuddy", "opencode"]);
    expect(
      fs.existsSync(
        path.join(
          workspace,
          "home",
          ".codex",
          "skills",
          "Start-Floating-Island",
          "SKILL.md",
        ),
      ),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(workspace, "home", ".claude", "commands", "Start-Floating-Island.md"),
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
          "commands",
          "Start-Floating-Island.md",
        ),
      ),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(workspace, "home", ".opencode", "skills", "Start-Floating-Island", "SKILL.md"),
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

    expect(record.platforms).toEqual(["codex", "claude", "codebuddy", "opencode"]);
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
    expect(
      fs.existsSync(
        path.join(workspace, "home", ".opencode", "skills", "gpt-image-2-gen", "scripts", "generate_gpt_image_2.py"),
      ),
    ).toBe(true);
  });

  test("installs cb-hud only for CodeBuddy with status line commands", async () => {
    const workspace = tempWorkspace();
    process.env.SKILL_MARKETPLACE_HOME = path.join(workspace, "home");

    const record = await installPack({
      registryPath: registryPath(),
      packName: "cb-hud",
      scope: "global",
      cwd: workspace,
      platform: "all",
    });

    expect(record.platforms).toEqual(["codebuddy"]);
    expect(
      fs.existsSync(path.join(workspace, "home", ".codex", "skills", "cb-hud", "SKILL.md")),
    ).toBe(false);
    expect(
      fs.existsSync(path.join(workspace, "home", ".claude", "skills", "cb-hud", "SKILL.md")),
    ).toBe(false);
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
          "cb-hud",
          "skills",
          "cb-hud",
          "scripts",
          "cb-hud.js",
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
          "cb-hud",
          "commands",
          "CB-HUD-init.md",
        ),
      ),
    ).toBe(true);
  });

  test("cb-hud status line script renders styled session state", async () => {
    const script = path.join(
      repoRoot(),
      "packs",
      "cb-hud",
      "skills",
      "cb-hud",
      "scripts",
      "cb-hud.js",
    );
    const result = spawnSync("node", [script, "statusline"], {
      encoding: "utf-8",
      input: JSON.stringify({
        session_id: "abcdef123456",
        cwd: "C:/work/demo",
        model: { display_name: "GPT-5.5" },
        workspace: { current_dir: "C:/work/demo" },
        version: "2.96.0",
        cost: {
          total_cost_usd: 0.0123,
          total_duration_ms: 125000,
          total_api_duration_ms: 2300,
          total_lines_added: 12,
          total_lines_removed: 3,
          total_input_tokens: 1536,
          total_output_tokens: 2400000,
        },
      }),
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("CB HUD");
    expect(result.stdout).toContain("🐱 CB HUD");
    expect(result.stdout).toContain("🎯 idle");
    expect(result.stdout).not.toContain("🟢 CB HUD");
    expect(result.stdout).toContain("🤖 GPT-5.5");
    expect(result.stdout).toContain("📁 demo");
    expect(result.stdout).toContain("GPT-5.5");
    expect(result.stdout).toContain("demo");
    expect(result.stdout).toContain("⏱ 2m5s");
    expect(result.stdout).toContain("API 2.3s");
    expect(result.stdout).toContain("🧾 2.4M tok");
    expect(result.stdout).toContain("📝");
    expect(result.stdout).toContain("+12");
    expect(result.stdout).toContain("-3");
    expect(result.stdout).not.toContain("⬆");
    expect(result.stdout).not.toContain("⬇");
    expect(result.stdout).toContain("\u001b[");
  });

  test("cb-hud multiline status line uses three-line layout", async () => {
    const script = path.join(
      repoRoot(),
      "packs",
      "cb-hud",
      "skills",
      "cb-hud",
      "scripts",
      "cb-hud.js",
    );
    const result = spawnSync("node", [script, "statusline", "--multiline"], {
      encoding: "utf-8",
      input: JSON.stringify({
        session_id: "abcdef123456",
        cwd: "C:/work/demo",
        agent: { name: "frontend-agent" },
        model: { display_name: "GPT-5.5" },
        version: "2.96.0",
        workspace: { current_dir: "C:/work/demo" },
        cost: {
          total_duration_ms: 125000,
          total_api_duration_ms: 2300,
          total_lines_added: 12,
          total_lines_removed: 3,
        },
      }),
    });

    expect(result.status).toBe(0);
    const lines = result.stdout.trimEnd().split(/\r?\n/);
    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain("🐱 CB HUD");
    expect(lines[0]).toContain("🎯 idle");
    expect(lines[0]).toContain("📁 demo");
    expect(lines[0]).toContain("#abcdef12");
    expect(lines[0]).not.toContain("🧩");
    expect(lines[0]).not.toContain("🔧");
    expect(lines[0]).not.toContain("🛠");
    expect(lines[0]).not.toContain("🤖 GPT-5.5");
    expect(lines[0]).not.toContain("⏱ 2m5s");
    expect(lines[1]).toContain("🤝 frontend-agent");
    expect(lines[1]).not.toContain("🎯 idle");
    expect(lines[2]).toContain("⏱ 2m5s");
    expect(lines[2]).toContain("API 2.3s");
    expect(lines[2]).toContain("v2.96.0");
    expect(lines[2]).toContain("🤖 GPT-5.5");
    expect(lines[2]).toContain("📝");
    expect(lines[2]).toContain("+12");
    expect(lines[2]).toContain("-3");
  });

  test("cb-hud multiline keeps done skill and tool on second line only", async () => {
    const workspace = tempWorkspace();
    const script = path.join(
      repoRoot(),
      "packs",
      "cb-hud",
      "skills",
      "cb-hud",
      "scripts",
      "cb-hud.js",
    );
    const stateDir = path.join(workspace, ".codebuddy", "cb-hud");
    fs.mkdirSync(stateDir, { recursive: true });
    fs.writeFileSync(
      path.join(stateDir, "state.json"),
      JSON.stringify(
        {
          activity: {
            state: "done",
            stateStartedAt: new Date(Date.now() - 5000).toISOString(),
            lastSkill: "startup",
            lastTool: "Write",
          },
        },
        null,
        2,
      ),
    );

    const result = spawnSync("node", [script, "statusline", "--multiline"], {
      encoding: "utf-8",
      input: JSON.stringify({
        session_id: "abcdef123456",
        cwd: workspace,
        agent: { name: "main-agent" },
        model: { display_name: "GPT-5.5" },
        workspace: { current_dir: workspace },
      }),
    });

    expect(result.status).toBe(0);
    const lines = result.stdout.trimEnd().split(/\r?\n/);
    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain("🎯 done");
    expect(lines[0]).not.toContain("🧩 startup");
    expect(lines[0]).not.toContain("🛠 Write");
    expect(lines[1]).toContain("🤝 main-agent");
    expect(lines[1]).toContain("🧩 startup");
    expect(lines[1]).toContain("🛠 Write");
    expect(lines[1]).not.toContain("🎯 done");
  });

  test("cb-hud init wires status line and tool tracking hooks", async () => {
    const workspace = tempWorkspace();
    const script = path.join(
      repoRoot(),
      "packs",
      "cb-hud",
      "skills",
      "cb-hud",
      "scripts",
      "cb-hud.js",
    );

    const result = spawnSync("node", [script, "init", "--project", workspace], {
      encoding: "utf-8",
    });

    expect(result.status).toBe(0);
    const settings = JSON.parse(
      fs.readFileSync(path.join(workspace, ".codebuddy", "settings.json"), "utf-8"),
    ) as {
      statusLine?: { command?: string };
      hooks?: Record<string, Array<{ matcher?: string; hooks: Array<{ command: string }> }>>;
    };

    expect(settings.statusLine?.command).toContain("cb-hud.js");
    expect(settings.hooks?.UserPromptSubmit?.[0]?.hooks[0]?.command).toContain(
      "hook UserPromptSubmit",
    );
    expect(settings.hooks?.PreToolUse?.[0]?.matcher).toBe("*");
    expect(settings.hooks?.PreToolUse?.[0]?.hooks[0]?.command).toContain("hook PreToolUse");
    expect(settings.hooks?.PostToolUse?.[0]?.hooks[0]?.command).toContain("hook PostToolUse");
    expect(settings.hooks?.Stop?.[0]?.hooks[0]?.command).toContain("hook Stop");
  });

  test("cb-hud hooks update current tool state for status line rendering", async () => {
    const workspace = tempWorkspace();
    const script = path.join(
      repoRoot(),
      "packs",
      "cb-hud",
      "skills",
      "cb-hud",
      "scripts",
      "cb-hud.js",
    );

    const hookResult = spawnSync(
      "node",
      [script, "hook", "PreToolUse", "--project", workspace],
      {
        encoding: "utf-8",
        input: JSON.stringify({
          hook_event_name: "PreToolUse",
          tool_name: "Bash",
          skill_name: "cb-hud",
          cwd: workspace,
          transcript_path: path.join(workspace, "transcript.jsonl"),
        }),
      },
    );
    expect(hookResult.status).toBe(0);
    const statePath = path.join(workspace, ".codebuddy", "cb-hud", "state.json");
    const state = JSON.parse(fs.readFileSync(statePath, "utf-8")) as {
      activity?: { stateStartedAt?: string };
    };
    fs.writeFileSync(
      statePath,
      JSON.stringify(
        {
          ...state,
          activity: {
            ...state.activity,
            stateStartedAt: new Date(Date.now() - 18000).toISOString(),
          },
        },
        null,
        2,
      ),
    );
    const svnBin = path.join(workspace, process.platform === "win32" ? "svn.cmd" : "svn");
    fs.writeFileSync(
      svnBin,
      process.platform === "win32"
        ? "@echo off\r\necho M file-a\r\necho ? file-b\r\necho A file-c\r\n"
        : "#!/bin/sh\nprintf 'M file-a\\n? file-b\\nA file-c\\n'\n",
    );
    if (process.platform !== "win32") fs.chmodSync(svnBin, 0o755);

    const statusEnv = { ...process.env };
    statusEnv.PATH = `${workspace}${path.delimiter}${process.env.PATH || process.env.Path || ""}`;
    statusEnv.Path = statusEnv.PATH;
    const statusResult = spawnSync("node", [script, "statusline"], {
      encoding: "utf-8",
      env: statusEnv,
      input: JSON.stringify({
        session_id: "abcdef123456",
        cwd: workspace,
        model: { display_name: "GPT-5.5" },
        workspace: { current_dir: workspace },
      }),
    });

    expect(statusResult.status).toBe(0);
    expect(statusResult.stdout).toContain("🐱 CB HUD");
    expect(statusResult.stdout).not.toContain("🟢 CB HUD");
    expect(statusResult.stdout).toContain("🎯 tool");
    expect(statusResult.stdout).toContain("🔥");
    expect(statusResult.stdout).toContain("🧩 cb-hud");
    expect(statusResult.stdout).toContain("🔧");
    expect(statusResult.stdout).toContain("Bash");
    expect(statusResult.stdout).toContain("📦 SVN 3");
    expect(statusResult.stdout).not.toContain("skill:");
    expect(statusResult.stdout).not.toContain("tool:");
    expect(statusResult.stdout).toMatch(/[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]/u);
    expect(statusResult.stdout).not.toContain("\n\n");

    const stopResult = spawnSync("node", [script, "hook", "Stop", "--project", workspace], {
      encoding: "utf-8",
      input: JSON.stringify({ hook_event_name: "Stop", cwd: workspace }),
    });
    expect(stopResult.status).toBe(0);
    const stoppedState = JSON.parse(
      fs.readFileSync(path.join(workspace, ".codebuddy", "cb-hud", "state.json"), "utf-8"),
    ) as { activity?: { state?: string; currentTool?: string } };
    expect(stoppedState.activity?.state).toBe("done");
    expect(stoppedState.activity?.currentTool).toBeUndefined();
  });

  test("cb-hud hide removes only cb-hud hooks and preserves other hooks", async () => {
    const workspace = tempWorkspace();
    const script = path.join(
      repoRoot(),
      "packs",
      "cb-hud",
      "skills",
      "cb-hud",
      "scripts",
      "cb-hud.js",
    );
    const settingsPath = path.join(workspace, ".codebuddy", "settings.json");
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
    fs.writeFileSync(
      settingsPath,
      JSON.stringify(
        {
          hooks: {
            Stop: [
              {
                hooks: [
                  { type: "command", command: 'node "cb-hud.js" hook Stop' },
                  { type: "command", command: "node other-hook.js" },
                ],
              },
            ],
          },
        },
        null,
        2,
      ),
    );

    const result = spawnSync("node", [script, "hide", "--project", workspace], {
      encoding: "utf-8",
    });

    expect(result.status).toBe(0);
    const settings = JSON.parse(fs.readFileSync(settingsPath, "utf-8")) as {
      hooks?: Record<string, Array<{ hooks: Array<{ command: string }> }>>;
    };
    expect(settings.hooks?.Stop).toHaveLength(1);
    expect(settings.hooks?.Stop?.[0]?.hooks).toEqual([
      { type: "command", command: "node other-hook.js" },
    ]);
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

  test("markitdown script selects Office extras by input suffix", async () => {
    const script = path.join(
      repoRoot(),
      "packs",
      "markitdown",
      "skills",
      "markitdown",
      "scripts",
      "convert_to_markdown.py",
    );
    const probe = path.join(tempWorkspace(), "probe_markitdown_specs.py");
    fs.writeFileSync(
      probe,
      [
        "import importlib.util",
        "import json",
        "from pathlib import Path",
        `spec = importlib.util.spec_from_file_location('convert_to_markdown', r'''${script}''')`,
        "mod = importlib.util.module_from_spec(spec)",
        "spec.loader.exec_module(mod)",
        "suffixes = ['demo.pdf', 'demo.docx', 'demo.pptx', 'demo.xlsx', 'demo.xls', 'demo.html']",
        "print(json.dumps({name: mod.markitdown_install_spec(Path(name)) for name in suffixes}, sort_keys=True))",
      ].join("\n"),
      "utf-8",
    );

    const py = pythonCommand();
    const result = spawnSync(py.cmd, [...py.args, probe], { encoding: "utf-8" });

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout.trim())).toEqual({
      "demo.docx": "markitdown[docx]",
      "demo.html": "markitdown",
      "demo.pdf": "markitdown[pdf]",
      "demo.pptx": "markitdown[pptx]",
      "demo.xls": "markitdown[xls]",
      "demo.xlsx": "markitdown[xlsx]",
    });
  });

  test("markitdown script retries Office conversion after installing missing extras", async () => {
    const script = path.join(
      repoRoot(),
      "packs",
      "markitdown",
      "skills",
      "markitdown",
      "scripts",
      "convert_to_markdown.py",
    );
    const workspace = tempWorkspace();
    const probe = path.join(workspace, "probe_markitdown_retry.py");
    fs.writeFileSync(
      probe,
      [
        "import importlib.util",
        "import json",
        "from pathlib import Path",
        "from types import SimpleNamespace",
        `spec = importlib.util.spec_from_file_location('convert_to_markdown', r'''${script}''')`,
        "mod = importlib.util.module_from_spec(spec)",
        "spec.loader.exec_module(mod)",
        "installed = []",
        "calls = []",
        "def fake_install(spec):",
        "    installed.append(spec)",
        "def fake_convert_once(input_path):",
        "    calls.append(input_path.suffix.lower())",
        "    if len(calls) == 1:",
        "        raise ImportError('Missing optional dependency [pptx]')",
        "    return SimpleNamespace(text_content='Converted office document with enough content for this retry test.')",
        "mod.run_pip_install = fake_install",
        "mod.convert_once = fake_convert_once",
        "input_path = Path(r'''" + path.join(workspace, "deck.pptx") + "''')",
        "input_path.write_text('pptx placeholder', encoding='utf-8')",
        "output_path = Path(r'''" + path.join(workspace, "deck.md") + "''')",
        "mod.convert(input_path, output_path, no_clean=True)",
        "print(json.dumps({'installed': installed, 'calls': calls, 'output': output_path.read_text(encoding='utf-8')}, sort_keys=True))",
      ].join("\n"),
      "utf-8",
    );

    const py = pythonCommand();
    const result = spawnSync(py.cmd, [...py.args, probe], { encoding: "utf-8" });

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout.trim().split(/\r?\n/).at(-1) ?? "{}")).toEqual({
      calls: [".pptx", ".pptx"],
      installed: ["markitdown[pptx]"],
      output: "Converted office document with enough content for this retry test.",
    });
  });

  test("installs markitdown for all supported platforms", async () => {
    const workspace = tempWorkspace();
    process.env.SKILL_MARKETPLACE_HOME = path.join(workspace, "home");

    const record = await installPack({
      registryPath: registryPath(),
      packName: "markitdown",
      scope: "global",
      cwd: workspace,
      platform: "all",
    });

    expect(record.platforms).toEqual(["codex", "claude", "codebuddy", "opencode"]);
    expect(
      fs.existsSync(
        path.join(workspace, "home", ".codex", "skills", "markitdown", "scripts", "convert_to_markdown.py"),
      ),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(workspace, "home", ".claude", "skills", "markitdown", "SKILL.md"),
      ),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(workspace, "home", ".opencode", "skills", "markitdown", "scripts", "convert_to_markdown.py"),
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
          "markitdown",
          "skills",
          "markitdown",
          "scripts",
          "convert_to_markdown.py",
        ),
      ),
    ).toBe(true);
  });

  test("android-adb commands use Windows-safe filenames with user-facing ADB titles", async () => {
    const commandTitles = new Map([
      ["ADB-Devices", "ADB: Devices"],
      ["ADB-Pair", "ADB: Pair"],
      ["ADB-Connect", "ADB: Connect"],
      ["ADB-Disconnect", "ADB: Disconnect"],
      ["ADB-Shell", "ADB: Shell"],
      ["ADB-Install", "ADB: Install"],
      ["ADB-Launch", "ADB: Launch"],
      ["ADB-Packages", "ADB: Packages"],
      ["ADB-UI-Dump", "ADB: UI Dump"],
      ["ADB-Screenshot", "ADB: Screenshot"],
      ["ADB-Tap", "ADB: Tap"],
      ["ADB-Text", "ADB: Text"],
      ["ADB-Keyevent", "ADB: Keyevent"],
      ["ADB-Swipe", "ADB: Swipe"],
      ["ADB-Pull", "ADB: Pull"],
      ["ADB-Logcat", "ADB: Logcat"],
      ["ADB-Screenrecord", "ADB: Screenrecord"],
      ["ADB-Push", "ADB: Push"],
      ["ADB-Clear-Data", "ADB: Clear Data"],
      ["ADB-Force-Stop", "ADB: Force Stop"],
    ]);
    const commandDir = path.join(repoRoot(), "packs", "android-adb", "commands");

    for (const command of ANDROID_ADB_COMMANDS) {
      const fileName = `${command}.md`;
      expect(fileName).not.toContain(":");
      expect(fileName).toMatch(/^ADB-[A-Za-z0-9-]+\.md$/);

      const commandDoc = fs.readFileSync(path.join(commandDir, fileName), "utf-8");
      expect(commandDoc).toContain(`# ${commandTitles.get(command)}`);
      expect(commandDoc).toContain("Use this command when");
      expect(commandDoc).toContain("adb ");
      expect(commandDoc).toContain("## Safety");
    }
  });

  test("android-adb pack and Claude plugin manifests include explicit commands", async () => {
    const pack = JSON.parse(
      fs.readFileSync(path.join(repoRoot(), "packs", "android-adb", "pack.json"), "utf-8"),
    ) as {
      contents: {
        commands?: Array<{ name: string; path: string; kind: string }>;
      };
    };

    expect(pack.contents.commands).toEqual(
      ANDROID_ADB_COMMANDS.map((command) => ({
        name: command,
        path: `commands/${command}.md`,
        kind: "shared",
      })),
    );

    const claude = JSON.parse(
      fs.readFileSync(
        path.join(repoRoot(), "packs", "android-adb", ".claude-plugin", "plugin.json"),
        "utf-8",
      ),
    ) as { commands?: string[] };

    expect(claude.commands).toEqual(["./commands"]);
  });

  test("android-adb skill metadata and safety guidance stay aligned", async () => {
    const skillDoc = fs.readFileSync(
      path.join(repoRoot(), "packs", "android-adb", "skills", "android-adb", "SKILL.md"),
      "utf-8",
    );

    expect(skillDoc).toContain("name: android-adb");
    expect(skillDoc).toContain("## Command Safety");
    expect(skillDoc).toContain("## Explicit Commands");
    expect(skillDoc).toContain("Windows does not allow `:`");
    expect(skillDoc).toContain("ADB-Devices` — ADB: Devices");
    expect(skillDoc).toContain("ADB-Connect` — ADB: Connect");
    expect(skillDoc).toContain("ADB-Launch` — ADB: Launch");
    expect(skillDoc).toContain("ADB-UI-Dump` — ADB: UI Dump");
    expect(skillDoc).toContain("ADB-Screenshot` — ADB: Screenshot");
    expect(skillDoc).toContain("ADB-Logcat` — ADB: Logcat");
    expect(skillDoc).toContain("ADB-Screenrecord` — ADB: Screenrecord");
    expect(skillDoc).toContain("ADB-Clear-Data` — ADB: Clear Data");
    expect(skillDoc).toContain("ADB-Force-Stop` — ADB: Force Stop");
    expect(skillDoc).toContain("^[A-Za-z0-9_.]+$");
    expect(skillDoc).toContain('execFile("adb", ["shell", "input", "text", sanitizedText])');
    expect(skillDoc).toContain("./adb-artifacts/screen.png");
  });

  test("installs ppt-master for all supported platforms", async () => {
    const workspace = tempWorkspace();
    process.env.SKILL_MARKETPLACE_HOME = path.join(workspace, "home");

    const record = await installPack({
      registryPath: registryPath(),
      packName: "ppt-master",
      scope: "global",
      cwd: workspace,
      platform: "all",
    });

    expect(record.platforms).toEqual(["codex", "claude", "codebuddy", "opencode"]);
    expect(
      fs.existsSync(path.join(workspace, "home", ".codex", "skills", "ppt-master", "SKILL.md")),
    ).toBe(true);
    expect(
      fs.existsSync(path.join(workspace, "home", ".claude", "skills", "ppt-master", "scripts", "svg_to_pptx.py")),
    ).toBe(true);
    expect(
      fs.existsSync(path.join(workspace, "home", ".opencode", "skills", "ppt-master", "requirements.txt")),
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
          "ppt-master",
          "skills",
          "ppt-master",
          "templates",
        ),
      ),
    ).toBe(true);
  }, 120_000);

  test("installs android-adb for all supported platforms", async () => {
    const workspace = tempWorkspace();
    process.env.SKILL_MARKETPLACE_HOME = path.join(workspace, "home");

    const record = await installPack({
      registryPath: registryPath(),
      packName: "android-adb",
      scope: "global",
      cwd: workspace,
      platform: "all",
    });

    expect(record.platforms).toEqual(["codex", "claude", "codebuddy", "opencode"]);
    expect(
      fs.existsSync(path.join(workspace, "home", ".codex", "skills", "android-adb", "SKILL.md")),
    ).toBe(true);
    expect(
      fs.existsSync(path.join(workspace, "home", ".claude", "skills", "android-adb", "SKILL.md")),
    ).toBe(true);
    expect(
      fs.existsSync(path.join(workspace, "home", ".opencode", "skills", "android-adb", "SKILL.md")),
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
          "android-adb",
          "skills",
          "android-adb",
          "SKILL.md",
        ),
      ),
    ).toBe(true);
    expect(
      fs.existsSync(path.join(workspace, "home", ".codex", "skills", "ADB-Screenshot", "SKILL.md")),
    ).toBe(true);
    expect(
      fs.existsSync(path.join(workspace, "home", ".claude", "commands", "ADB-Screenshot.md")),
    ).toBe(true);
    expect(
      fs.existsSync(path.join(workspace, "home", ".opencode", "skills", "ADB-Screenshot", "SKILL.md")),
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
          "android-adb",
          "commands",
          "ADB-Screenshot.md",
        ),
      ),
    ).toBe(true);
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

  test("installs trellis-dashboard for all supported platforms including opencode", async () => {
    const workspace = tempWorkspace();
    process.env.SKILL_MARKETPLACE_HOME = path.join(workspace, "home");

    const record = await installPack({
      registryPath: registryPath(),
      packName: "trellis-dashboard",
      scope: "global",
      cwd: workspace,
      platform: "all",
    });

    expect(record.platforms).toEqual(["codex", "claude", "codebuddy", "opencode"]);
    expect(
      fs.existsSync(
        path.join(workspace, "home", ".codex", "skills", "trellis-dashboard", "scripts", "dashboard-server.js"),
      ),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(workspace, "home", ".claude", "skills", "trellis-dashboard", "web", "index.html"),
      ),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(workspace, "home", ".opencode", "skills", "trellis-dashboard", "scripts", "install_opencode_hooks.py"),
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
          "trellis-dashboard",
          "skills",
          "trellis-dashboard",
          "scripts",
          "dashboard-server.js",
        ),
      ),
    ).toBe(true);
  });
});
