# sad-marketplace

面向 Codex、Claude Code、CodeBuddy 和 OpenCode 的共享技能市场。

这个仓库把可复用的 `skills/` 和 `commands/` 组织成 marketplace pack，方便在不同 AI 编程工具中安装同一套能力。

## 技能包总览

| 技能包 | 描述 | Codex | Claude Code | CodeBuddy | OpenCode |
| --- | --- | :---: | :---: | :---: | :---: |
| starter-pack | 入门包，包含通用写作和发布检查工作流 | 支持 | 支持 | 支持 | 支持 |
| floating-island-hooks | 项目级 Floating Island 状态浮窗 hooks | 支持 | 支持 | 支持 | 支持 |
| svn-toolkit | SVN 工作流技能和常用命令集合 | 支持 | 支持 | 支持 | 支持 |
| gpt-image-2-gen | 使用 gpt-image-2 在项目内生成图片 | 支持 | 支持 | 支持 | 支持 |
| agnes-image | 使用 Agnes Image 2.1 Flash 生成或编辑图片 | 支持 | 支持 | 支持 | 支持 |
| agnes-video | 使用 Agnes Video V2.0 异步生成视频 | 支持 | 支持 | 支持 | 支持 |
| skill-creator | 创建或更新 agent skill 的辅助工具 | 支持 | 支持 | 支持 | 支持 |
| cb-hud | CodeBuddy 专属 HUD 状态栏 | 不支持 | 不支持 | 支持 | 不支持 |
| codebuddy-usage-report | CodeBuddy 专属本地用量统计报表，统计请求、Token、缓存率、积分和趋势 | 不支持 | 不支持 | 支持 | 不支持 |
| trellis-dashboard | 本地 Web Trellis 实时看板 | 支持 | 支持 | 支持 | 支持 |
| markitdown | 将 PDF、Office、HTML、图片、音频等转成 Markdown | 支持 | 支持 | 支持 | 支持 |
| android-adb | Android ADB 自动化、UI 层级分析和截图验证 | 支持 | 支持 | 支持 | 支持 |
| lanhu-xml-to-android | 蓝湖 WXML/WXSS 导出转 Android View XML 工作流 | 支持 | 支持 | 支持 | 支持 |
| ppt-master | 生成原生可编辑 PPTX | 支持 | 支持 | 支持 | 支持 |

## lanhu-xml-to-android

`lanhu-xml-to-android` 是一个工作流式技能，用来把蓝湖导出的 WXML/WXSS 或页面规格转换成 Android View XML，并尽量贴合目标 Android 项目的既有规范。

它的重点不是简单字符串转换，而是先检查项目，再生成结果：

1. 收集蓝湖导出的 WXML、WXSS、页面规格和目标 Android 模块。
2. 检查 Android 项目的 layout、values、drawable、style、命名和自定义 View 习惯。
3. 列出控件映射方案，例如 TextView、ImageView、ConstraintLayout，以及项目里可复用的自定义 View。
4. 让用户补齐 dpi、设计稿宽度、目标输出目录、是否使用某些自定义控件等关键选择。
5. 优先复用已有 colors、dimens、drawables、assets；复用不了的资源会在报告里说明应该加到哪里。
6. 先 dry-run 输出计划，再写入 Android XML、values 资源和 drawable shape。
7. 最终报告生成了哪些文件、复用了哪些资源、新增了哪些资源、还有哪些图片或字体等资产需要人工补充。

技能目录：`packs/lanhu-xml-to-android/skills/lanhu-xml-to-android`

主要脚本：`scripts/convert.py`

示例用法：

```bash
python scripts/convert.py \
  --project /path/to/android-project \
  --wxml /path/to/lanhu-page.wxml \
  --wxss /path/to/lanhu-page.wxss \
  --module app \
  --layout-name activity_lanhu_demo \
  --design-width 375 \
  --dpi 3 \
  --dry-run
```

确认计划后去掉 `--dry-run` 写入文件。

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

单独验证蓝湖转换技能：

```bash
python -m pytest packs/lanhu-xml-to-android/skills/lanhu-xml-to-android/scripts/test_convert.py
```

## 链接

- [VSLLM](https://vsllm.com/)

---

### codebuddy-usage-report

CodeBuddy 专属本地用量统计技能。它读取本机 `~/.codebuddy` 下的 traces 和 project JSONL 日志，生成一个自包含 HTML 报表。

- **技能：** `codebuddy-usage-report`
- 默认数据源：`~/.codebuddy/traces` 和 `~/.codebuddy/projects`
- 默认输出：当前目录的 `codebuddy-usage-report.html`
- 统计内容：请求次数、时间、输入/输出/总 Token、缓存读写、缓存率、积分、模型、会话、Agent、每日趋势、小时趋势和明细分页
- 趋势图支持动画、滚轮缩放、拖拽平移和鼠标悬停提示
- 指标口径可在积分和 Token 之间切换，默认按积分查看

常用命令：

```bash
node scripts/generate-codebuddy-usage-report.js --open
```

指定路径：

```bash
node scripts/generate-codebuddy-usage-report.js --traces <trace-dir> --projects <projects-dir> --out <report.html> --open
```
