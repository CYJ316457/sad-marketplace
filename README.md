# sad-marketplace

Shared skill marketplace for Codex, Claude Code, CodeBuddy, and OpenCode.

Supports pack distribution for:
- `skills/`
- `commands/`

## Packs

| Pack | Description | Codex | Claude Code | CodeBuddy | OpenCode |
|------|-------------|:-----:|:-----------:|:---------:|:--------:|
| cb-hud | CodeBuddy-only cat HUD with skill, tool, phase, duration, SVN, and activity tracking | - | - | ✓ | - |
| floating-island-hooks | Project-local Floating Island hooks | ✓ | ✓ | ✓ | ✓ |
| gpt-image-2-gen | 使用 gpt-image-2 在项目内生成图片 | ✓ | ✓ | ✓ | ✓ |
| markitdown | Convert local PDFs and documents to Markdown for AI reading | ✓ | ✓ | ✓ | ✓ |
| starter-pack | Starter pack with two reusable workflow skills | ✓ | ✓ | ✓ | ✓ |
| svn-toolkit | 通用 SVN 技能与命令集合 | ✓ | ✓ | ✓ | ✓ |
| trellis-dashboard | Realtime Trellis dashboard with a local web service | ✓ | ✓ | ✓ | ✓ |

## CodeBuddy marketplace detection

CodeBuddy can detect this repository as a marketplace through:

```text
.codebuddy-plugin/marketplace.json
```

The `markitdown` marketplace entry points to `./packs/markitdown`, so CodeBuddy can download/install it directly when the marketplace repository is registered.

## Commands

- `npm install`
- `npm test`
- `npm run build`
- `node dist/src/cli/index.js list --registry registry/index.json`

## 推广链接

- [VSLLM](https://vsllm.com/)
