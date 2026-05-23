#!/usr/bin/env node
import { Command } from "commander";
import { installPack, listPacks, uninstallPack, updatePack } from "../core/api.js";

export function buildCli(): Command {
  const program = new Command();
  program.name("market").description("Shared skill marketplace CLI");

  program
    .command("list")
    .option("--registry <path>", "registry index path", "registry/index.json")
    .action(async (options) => {
      const packs = await listPacks({ registryPath: options.registry });
      console.log(JSON.stringify(packs, null, 2));
    });

  program
    .command("install")
    .argument("<pack>")
    .option("--registry <path>", "registry index path", "registry/index.json")
    .option("--global", "install globally")
    .option("--project", "install in project")
    .option("--platform <name>", "codex|claude|codebuddy|all", "all")
    .action(async (pack, options) => {
      await installPack({
        registryPath: options.registry,
        packName: pack,
        scope: options.global ? "global" : "project",
        cwd: process.cwd(),
        platform: options.platform,
      });
    });

  program
    .command("update")
    .argument("[pack]")
    .option("--registry <path>", "registry index path", "registry/index.json")
    .option("--global", "install globally")
    .option("--project", "install in project")
    .option("--platform <name>", "codex|claude|codebuddy|all", "all")
    .action(async (pack, options) => {
      if (!pack) return;
      await updatePack({
        registryPath: options.registry,
        packName: pack,
        scope: options.global ? "global" : "project",
        cwd: process.cwd(),
        platform: options.platform,
      });
    });

  program
    .command("uninstall")
    .argument("<pack>")
    .option("--global", "install globally")
    .option("--project", "install in project")
    .option("--platform <name>", "codex|claude|codebuddy|all", "all")
    .action(async (pack, options) => {
      await uninstallPack({
        packName: pack,
        scope: options.global ? "global" : "project",
        cwd: process.cwd(),
        platform: options.platform,
      });
    });

  return program;
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}`) {
  buildCli().parse(process.argv);
}
