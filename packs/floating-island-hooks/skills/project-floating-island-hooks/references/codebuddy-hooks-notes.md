# CodeBuddy Hooks Notes

Source: local CodeBuddy docs route `/docs/cli/hooks` read on 2026-05-23.

- Hook settings paths: `~/.codebuddy/settings.json`, `<project>/.codebuddy/settings.json`, `<project>/.codebuddy/settings.local.json`.
- Settings merge across scopes. Hooks for the same event all run.
- Hook structure: `{"hooks":{"EventName":[{"matcher":"ToolPattern","hooks":[{"type":"command","command":"...","timeout":3}]}]}}`.
- `matcher` applies to `PreToolUse` and `PostToolUse`; some other events document event-specific matchers.
- Windows command hooks run under Git Bash, not PowerShell or cmd.
- Hook input is JSON on stdin with fields such as `session_id`, `cwd`, `hook_event_name`, and event-specific data.
- Relevant events:
- `SessionStart` matchers: `startup`, `resume`, `clear`, `compact`.
- `UserPromptSubmit`: user submitted a prompt, no matcher.
- `Notification` matchers include `permission_prompt`, `idle_prompt`, `auth_success`; `elicitation_dialog` is documented as not supported.
- `Stop`: main agent response completed, no matcher.
- `SessionEnd` matchers/reasons include `clear`, `logout`, `prompt_input_exit`, `other`.
