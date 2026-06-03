---
name: markitdown
description: Convert PDFs, Office files, HTML, images, audio, and other local documents to Markdown for AI reading and analysis using microsoft/markitdown. Use when the user gives a PDF/document path and asks AI to read, summarize, extract, analyze, or convert it to Markdown. Compatible with Codex, Claude Code, CodeBuddy, and OpenCode.
metadata:
  short-description: Convert documents to Markdown for AI
---

# MarkItDown Document Reader

Use this skill when the user gives a local PDF or other document and wants AI to read, summarize, extract, analyze, or convert it.

## Supported hosts

- Codex: installed under `.codex/skills` globally or `.agents/skills` in a project.
- Claude Code: installed under `.claude/skills` and exposed through `.claude-plugin/plugin.json`.
- CodeBuddy: exposed as a marketplace plugin through `.codebuddy-plugin/marketplace.json`; when CodeBuddy detects the marketplace it can download/install the `markitdown` plugin directly.
- OpenCode: installed under `.opencode/skills`.

## Core workflow

1. Resolve the input file path exactly. Do not invent file contents.
2. Convert the file to Markdown with `scripts/convert_to_markdown.py`.
3. Read the generated `.md` file before answering content questions.
4. If conversion fails, report the exact error and do not summarize fabricated content.
5. If the Markdown is empty or clearly missing正文, say the PDF may be scanned/image-only and needs OCR.

## Command

From this skill directory:

```powershell
python .\scripts\convert_to_markdown.py "D:\docs\example.pdf"
```

Optional explicit output path:

```powershell
python .\scripts\convert_to_markdown.py "D:\docs\example.pdf" "D:\docs\example.md"
```

For PDF files, the script installs the `markitdown[pdf]` extra automatically when needed. It does not require cloning the GitHub repository.

## Output rules

- Save Markdown next to the input file by default, same basename plus `.md`.
- Use UTF-8.
- After conversion, inspect output size and preview content before making claims.
- Normalize common PDF font-glyph artifacts when safe (`⻋` -> `车`, `⻚` -> `页`, `⻅` -> `见`) and remove embedded control characters.
- For large Markdown files, read/search targeted sections instead of pasting everything into chat.

## Safety

- Only process local files explicitly requested by the user or clearly in task scope.
- Do not send private document content to external APIs unless the user explicitly asks for an AI/model call that requires it.
- For exact numeric/table analysis, prefer structured tools such as Python/pandas after conversion when appropriate.
