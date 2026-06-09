---
name: codebuddy-usage-report
description: Generate a CodeBuddy-only local usage dashboard from ~/.codebuddy traces and project JSONL logs. Use when the user asks to inspect CodeBuddy requests, token usage, cache rate, credit usage, daily/hourly trends, grouped usage, or a paginated HTML usage report.
---

# CodeBuddy Usage Report

Run the bundled Node script to generate a self-contained local HTML report from CodeBuddy's local data under `~/.codebuddy`.

```bash
node scripts/generate-codebuddy-usage-report.js --open
```

By default the script reads:

- `~/.codebuddy/traces` for token and cache usage.
- `~/.codebuddy/projects` for request credit records.

The default output is `codebuddy-usage-report.html` in the current working directory. Use explicit paths when needed:

```bash
node scripts/generate-codebuddy-usage-report.js --traces <trace-dir> --projects <projects-dir> --out <report.html> --open
```

The generated dashboard is local-only and includes overview, animated trend charts, grouped stats, and a paginated request detail table. It can switch between credit and token metrics; credit is the default view.

If credits are missing, explain that the report can only show credits when CodeBuddy wrote `providerData.rawUsage.credit` into project JSONL logs.
