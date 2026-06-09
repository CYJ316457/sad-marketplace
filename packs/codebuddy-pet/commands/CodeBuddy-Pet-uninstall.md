---
description: Uninstall the CodeBuddy desktop pet from a project
argument-hint: [project-path]
allowed-tools: [Bash(node *), Read, Glob]
---

Locate the installed script:

`<marketplace-root>/plugins/codebuddy-pet/skills/codebuddy-pet/scripts/codebuddy-pet.js`

Run it for the current project or the user-provided path:

`node "<script>" uninstall --project <project-path>`

This removes this pack's hook entries and deletes `<project>/.codebuddy/codebuddy-pet/`.
