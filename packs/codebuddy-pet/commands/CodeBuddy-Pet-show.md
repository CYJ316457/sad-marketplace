---
description: Show or re-enable the CodeBuddy desktop pet
argument-hint: [project-path]
allowed-tools: [Bash(node *), Read, Glob]
---

Locate the installed script:

`<marketplace-root>/plugins/codebuddy-pet/skills/codebuddy-pet/scripts/codebuddy-pet.js`

Run it for the current project or the user-provided path:

`node "<script>" show --project <project-path>`

The command refreshes local pet files, installs runtime dependencies if needed, re-enables hooks, and starts the pet window. Restart CodeBuddy only when you need it to reload hook settings.
