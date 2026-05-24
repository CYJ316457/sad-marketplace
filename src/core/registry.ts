import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import type { PackManifest, RegistryIndex } from "./types.js";

const registryIndexSchema = z.object({
  marketplace: z.object({
    name: z.string(),
    description: z.string(),
    source: z.string(),
    version: z.string(),
  }),
  packs: z.array(
    z.object({
      name: z.string(),
      version: z.string(),
      description: z.string(),
      author: z.object({
        name: z.string(),
        email: z.string().optional(),
      }),
      license: z.string(),
      tags: z.array(z.string()),
      source: z.string(),
      platformSupport: z.object({
        codex: z.boolean(),
        claude: z.boolean(),
        codebuddy: z.boolean(),
      }),
      install: z.object({
        unit: z.literal("pack"),
      }),
      contents: z.object({
        skills: z.array(z.string()),
        commands: z.array(z.string()).optional(),
      }),
    }),
  ),
});

const packManifestSchema = z.object({
  name: z.string(),
  version: z.string(),
  description: z.string(),
  author: z.object({
    name: z.string(),
    email: z.string().optional(),
  }),
  license: z.string(),
  tags: z.array(z.string()),
  platformSupport: z.object({
    codex: z.boolean(),
    claude: z.boolean(),
    codebuddy: z.boolean(),
  }),
  contents: z.object({
    skills: z.array(
      z.object({
        name: z.string(),
        path: z.string(),
        kind: z.enum(["shared", "platform"]),
      }),
    ),
    commands: z
      .array(
        z.object({
          name: z.string(),
          path: z.string(),
          kind: z.enum(["shared", "platform"]),
        }),
      )
      .optional(),
  }),
  codebuddy: z
    .object({
      pluginName: z.string(),
      category: z.string().optional(),
    })
    .optional(),
});

function readJsonFile(filePath: string): unknown {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

export function loadRegistryIndex(registryPath: string): RegistryIndex {
  const resolved = path.resolve(registryPath);
  const raw = readJsonFile(resolved);
  return registryIndexSchema.parse(raw);
}

export function loadPackManifest(packDir: string): PackManifest {
  const resolved = path.join(path.resolve(packDir), "pack.json");
  const raw = readJsonFile(resolved);
  return packManifestSchema.parse(raw);
}
