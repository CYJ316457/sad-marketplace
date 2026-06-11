# sad-marketplace

面向 Codex、Claude Code、CodeBuddy 和 OpenCode 的共享技能市场。

这个仓库把可复用的 `skills/` 和 `commands/` 组织成 marketplace pack，方便在不同 AI 编程工具中安装同一套能力。

## 技能包总览

| 技能包 | 描述 | Codex | Claude Code | CodeBuddy | OpenCode |
| --- | --- | :---: | :---: | :---: | :---: |
| starter-pack | 入门包，包含通用写作和发布检查工作流 | ✓ | ✓ | ✓ | ✓ |
| floating-island-hooks | 项目级 Floating Island 状态浮窗 hooks | ✓ | ✓ | ✓ | ✓ |
| svn-toolkit | SVN 工作流技能和常用命令集合 | ✓ | ✓ | ✓ | ✓ |
| gpt-image-2-gen | 使用 gpt-image-2 在项目内生成图片 | ✓ | ✓ | ✓ | ✓ |
| agnes-image | 使用 Agnes Image 2.1 Flash 生成或编辑图片 | ✓ | ✓ | ✓ | ✓ |
| agnes-video | 使用 Agnes Video V2.0 异步生成视频 | ✓ | ✓ | ✓ | ✓ |
| skill-creator | 创建或更新 agent skill 的辅助工具 | ✓ | ✓ | ✓ | ✓ |
| cb-hud | CodeBuddy 专属 HUD 状态栏 | ✗ | ✗ | ✓ | ✗ |
| codebuddy-pet | CodeBuddy 专属桌宠，内置 ikunchick 资源并通过 hooks 显示状态气泡 | ✗ | ✗ | ✓ | ✗ |
| codebuddy-usage-report | CodeBuddy 专属本地用量统计报表，统计请求、Token、缓存率、积分和趋势 | ✗ | ✗ | ✓ | ✗ |
| trellis-dashboard | 本地 Web Trellis 实时看板 | ✓ | ✓ | ✓ | ✓ |
| markitdown | 将 PDF、Office、HTML、图片、音频等转成 Markdown | ✓ | ✓ | ✓ | ✓ |
| android-adb | Android ADB 自动化、UI 层级分析和截图验证 | ✓ | ✓ | ✓ | ✓ |
| android-build | Android 项目 Gradle 打包 debug APK 并安装运行到 ADB 设备，兼容多版本 Gradle | ✓ | ✓ | ✓ | ✓ |
| lanhu-to-android | 蓝湖 XML/WXML + CSS/WXSS → Android View XML，DPI 感知、交互式询问、自动校验 | ✓ | ✓ | ✓ | ✓ |
| ppt-master | 生成原生可编辑 PPTX | ✓ | ✓ | ✓ | ✓ |

## 安装路径

同一个 pack 会按平台安装到不同目录：

| 平台 | 全局安装路径 |
| --- | --- |
| Codex | `.codex/skills/<skill>` |
| Claude Code | `.claude/skills/<skill>` |
| OpenCode | `.opencode/skills/<skill>` |
| CodeBuddy | `.codebuddy/plugins/marketplaces/sad-marketplace/plugins/<pack>/skills/<skill>` |

项目级 Codex 安装会写入项目内 `.agents/skills/<skill>`。

## Marketplace 入口

CodeBuddy 通过下面的文件识别 marketplace：

```text
.codebuddy-plugin/marketplace.json
```

Claude Code 通过下面的文件识别 marketplace：

```text
.claude-plugin/marketplace.json
```

通用 registry 文件：

```text
registry/index.json
```

## 开发和验证

```bash
npm install
npm test
npm run typecheck
npm run build
node dist/src/cli/index.js list --registry registry/index.json
```

## 链接

- [VSLLM](https://vsllm.com/)

