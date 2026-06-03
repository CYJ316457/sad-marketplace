---
description: Convert a local document to Markdown with microsoft/markitdown, then inspect the generated Markdown before answering.
---

# MarkItDown Convert

Use this command when the user asks to convert a PDF/document to Markdown or asks the agent to read a local document through Markdown first.

## Steps

1. Locate the installed `markitdown` skill directory for the current host:
   - Codex project: `.agents/skills/markitdown`
   - Codex global: `~/.codex/skills/markitdown`
   - Claude Code: `.claude/skills/markitdown` or `~/.claude/skills/markitdown`
   - CodeBuddy marketplace plugin: `.codebuddy/plugins/marketplaces/sad-marketplace/plugins/markitdown/skills/markitdown`
   - OpenCode: `.opencode/skills/markitdown` or `~/.opencode/skills/markitdown`
2. Run:

```powershell
python .\scripts\convert_to_markdown.py "<input-file>" "<optional-output.md>"
```

3. Read the generated Markdown before summarizing or extracting information.
4. If conversion output is empty/short, report that OCR may be needed instead of fabricating content.
