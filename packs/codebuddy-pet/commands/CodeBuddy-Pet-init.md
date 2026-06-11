---
description: Initialize the CodeBuddy desktop pet in a project
argument-hint: [project-path]
allowed-tools: [Bash(node *), Read, Glob]
---

Locate the installed script:

`<marketplace-root>/plugins/codebuddy-pet/skills/codebuddy-pet/scripts/codebuddy-pet.js`

Run it for the current project or the user-provided path:

`node "<script>" init --project <project-path>`

Initialization installs the local Electron runtime dependencies if needed and starts the pet window. Restart CodeBuddy only when you need it to reload `.codebuddy/settings.json` hooks.
