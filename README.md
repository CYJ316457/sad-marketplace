# sad-marketplace

面向 Codex、Claude Code、CodeBuddy 和 OpenCode 的共享技能市场。

支持 `skills/` 和 `commands/` 的分发包分发。

## 技能包总览

| 技能包 | 描述 | Codex | Claude Code | CodeBuddy | OpenCode |
|--------|------|:-----:|:-----------:|:---------:|:--------:|
| android-adb | 通过 ADB 控制 Android 设备，支持 UI 层级分析和截图验证 | ✓ | ✓ | ✓ | ✓ |
| floating-island-hooks | 项目级浮窗状态助手，AI 工作时显示 busy/ask/idle | ✓ | ✓ | ✓ | ✓ |
| gpt-image-2-gen | 使用 gpt-image-2 在项目内生成图片 | ✓ | ✓ | ✓ | ✓ |
| markitdown | 将 PDF、Office、HTML、图片、音频等文档转为 Markdown 供 AI 阅读 | ✓ | ✓ | ✓ | ✓ |
| starter-pack | 入门包，包含两个通用工作流技能 | ✓ | ✓ | ✓ | ✓ |
| svn-toolkit | SVN 工作流技能，包含 15 个斜杠命令 | ✓ | ✓ | ✓ | ✓ |
| trellis-dashboard | 实时 Trellis 看板，本地 Web 服务 | ✓ | ✓ | ✓ | ✓ |
| cb-hud | CodeBuddy 专属猫咪状态栏 HUD | — | — | ✓ | — |

## 技能包详情

### android-adb

Android ADB 自动化技能，来自 SkillHub 的 **ADB Connection**（`staticai/android-adb`）。

- **技能：** `android-adb`
- **命令：** `ADB-Devices`、`ADB-Pair`、`ADB-Connect`、`ADB-Disconnect`、`ADB-Shell`、`ADB-Install`、`ADB-Launch`、`ADB-Packages`、`ADB-UI-Dump`、`ADB-Screenshot`、`ADB-Tap`、`ADB-Text`、`ADB-Keyevent`、`ADB-Swipe`、`ADB-Pull`、`ADB-Logcat`、`ADB-Screenrecord`、`ADB-Push`、`ADB-Clear-Data`、`ADB-Force-Stop`
- 命令文件名使用 Windows 安全的 `ADB-*`，命令文档标题统一显示为 `ADB: ...`
- 使用系统 `adb`、`uiautomator` 和 `screencap` 控制 Android 设备
- 支持 USB / Android 11+ 无线调试连接说明
- 覆盖常见操作：设备列表、配对/连接/断开、启动应用、安装 APK、package 查询、dump UI 层级、点击、输入、按键、滑动、截图、logcat、录屏、push/pull、清除应用数据、强制停止应用
- 所有截图、UI dump、日志和录屏建议保存到 `./adb-artifacts/`，避免覆盖项目文件

---

### floating-island-hooks

项目级浮窗应用，在 AI 助手工作期间显示 **busy / ask / idle** 三种状态。

- **技能：** `project-floating-island-hooks`
- **命令：** `Start-Floating-Island`
- 内置预编译 Windows x64 运行时，无需本地 npm 安装或 Electron 构建
- Hook 自动启动浮窗并发送状态更新
- 安装命令：`python scripts/install_codebuddy_hooks.py --project <路径> --platform codebuddy|claude|codex|all`

事件映射：

| 事件 | 浮窗状态 | 说明 |
|------|:--------:|------|
| `SessionStart` | idle | 默认/重置状态 |
| `UserPromptSubmit` | busy | 用户发送了消息 |
| `Notification`（permission/idle） | ask | 助手需要用户输入或授权 |
| `Stop` | idle | 回复完成 |

---

### gpt-image-2-gen

使用 gpt-image-2 API 生成图片，输出保存到项目目录内。

- **技能：** `gpt-image-2-gen`
- **命令：** `GPT-image-2-Gen`
- 需在项目根目录配置 `.gpt-image-2.env`，设置 `OPENAI_BASE_URL` 和 `OPENAI_API_KEY`
- 支持 `--size`（如 `1024x1536`）和 `--aspect-ratio`（如 `16:9`、`9:16`、`1:1`）
- 输出路径：`<project>/.generated-images/gpt-image-2/gpt-image-2-YYYYMMDD-HHMMSS.png`

---

### markitdown

将本地文档转换为 Markdown，供 AI 代理阅读和分析。基于 [microsoft/markitdown](https://github.com/microsoft/markitdown)。

- **技能：** `markitdown`
- **命令：** `MarkItDown-Convert`
- 支持格式：PDF、Office（Word/Excel/PPT）、HTML、图片、音频
- 自动安装缺失的 markitdown 可选依赖：`.pdf` → `markitdown[pdf]`、`.docx` → `markitdown[docx]`、`.pptx` → `markitdown[pptx]`、`.xls` → `markitdown[xls]`、`.xlsx` → `markitdown[xlsx]`
- 输出默认保存在源文件同目录，扩展名为 `.md`

---

### starter-pack

两个轻量工作流技能，适合日常使用。

| 技能 | 描述 |
|------|------|
| `writing-clearly` | 使用简短、精准的语言，偏好直接表述而非填充词 |
| `release-checklist` | 发布前确认：测试通过、文档与行为一致、回滚步骤已记录 |

---

### svn-toolkit

通用 Subversion 工作流技能，以斜杠命令形式暴露。支持中文触发词，如 `提交svn`、`查看svn log` 等。

- **技能：** `svn-workflow`
- **命令：**

| 命令 | 功能 |
|------|------|
| `SVN-add` | 将新文件纳入版本控制 |
| `SVN-blame` | 查看每行修改者 |
| `SVN-cleanup` | 清理锁定和中断的操作 |
| `SVN-commit` | 提交变更 |
| `SVN-delete` | 从版本控制中删除文件 |
| `SVN-diff` | 查看本地修改差异 |
| `SVN-info` | 查看工作副本信息 |
| `SVN-list` | 列出仓库路径 |
| `SVN-log` | 查看提交历史 |
| `SVN-resolve` | 解决冲突 |
| `SVN-revert` | 撤销本地修改 |
| `SVN-status` | 查看工作副本状态 |
| `SVN-switch` | 切换分支或路径 |
| `SVN-update` | 更新工作副本 |

---

### trellis-dashboard

本地 Web 服务，为 Trellis 仓库渲染实时看板。

- **技能：** `trellis-dashboard`
- **命令：**

| 命令 | 功能 |
|------|------|
| `Trellis-Dashboard-Init` | 初始化看板配置 |
| `Trellis-Dashboard-Start` | 启动看板服务 |
| `Trellis-Dashboard-Open` | 在浏览器中打开看板 |
| `Trellis-Dashboard-Stop` | 停止看板服务 |
| `Trellis-Dashboard-Install-Claude` | 安装 Claude Code 事件钩子 |
| `Trellis-Dashboard-Install-CodeBuddy` | 安装 CodeBuddy 事件钩子 |
| `Trellis-Dashboard-Install-OpenCode` | 安装 OpenCode 事件钩子 |

看板展示：活动任务、当前阶段、代理活动、渲染产物（PRD、研究文档、摘要）及事件流。

---

### cb-hud

CodeBuddy 专属状态栏 HUD，猫咪主题三行 ANSI 布局。

- **技能：** `cb-hud`
- **命令：**

| 命令 | 功能 |
|------|------|
| `CB-HUD-init` | 写入配置并安装工具追踪钩子 |
| `CB-HUD-show` | 重新启用状态栏 |
| `CB-HUD-hide` | 隐藏状态栏但保留配置 |
| `CB-HUD-uninstall` | 移除所有 CB HUD 配置和状态 |

展示信息：阶段、活动技能/工具、时长、模型、项目、会话、Git/SVN 状态、Token 用量、费用、变更行数。

## 市场检测

CodeBuddy 通过以下文件检测此仓库为市场：

```
.codebuddy-plugin/marketplace.json
```

各包的 marketplace 入口指向 `./packs/<包名>`，注册市场仓库后 CodeBuddy 可直接下载安装插件。

## 开发

```bash
npm install
npm test
npm run build
node dist/src/cli/index.js list --registry registry/index.json
```

## 链接

- [VSLLM](https://vsllm.com/)
