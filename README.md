# sad-marketplace

Shared skill marketplace for Codex, Claude Code, and CodeBuddy.

Supports pack distribution for:
- `skills/`
- `commands/`

## Packs

| Pack | Description | Codex | Claude Code | CodeBuddy |
|------|-------------|:-----:|:-----------:|:---------:|
| cb-hud | CodeBuddy-only cat HUD with skill, tool, phase, duration, SVN, and activity tracking | - | - | ✓ |
| floating-island-hooks | Project-local Floating Island hooks | ✓ | ✓ | ✓ |
| gpt-image-2-gen | 使用 gpt-image-2 在项目内生成图片 | ✓ | ✓ | ✓ |
| starter-pack | Starter pack with two reusable workflow skills | ✓ | ✓ | ✓ |
| svn-toolkit | 通用 SVN 技能与命令集合 | ✓ | ✓ | ✓ |

## Commands

- `npm install`
- `npm test`
- `npm run build`
- `node dist/src/cli/index.js list --registry registry/index.json`
