---
description: Create or update an agent skill with validation and marketplace metadata
argument-hint: <skill name or capability request>
allowed-tools: [Bash(python *), Read, Glob]
---

Use this command when the user explicitly asks to create, scaffold, clone, or update a skill.

Steps:

1. Read the installed `skill-creator` skill instructions if they are not already active.
2. Determine whether this is a new skill, an update to an existing skill, or a marketplace pack integration.
3. For new skills, use the bundled scripts when appropriate:

```powershell
python scripts/init_skill.py <skill-name> --path <output-skill-root>
python scripts/quick_validate.py <path-to-skill-folder>
```

4. For this marketplace, update `pack.json`, platform plugin manifests, root marketplace JSON, and `registry/index.json` when the skill must be visible to Codex, Claude Code, CodeBuddy, and OpenCode.
5. Validate the skill folder and run repository tests before reporting completion.
