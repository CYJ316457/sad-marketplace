---
description: 显示并启用 CodeBuddy CB HUD 状态行
argument-hint: [项目路径]
allowed-tools: [Bash(node *), Read, Glob]
---

先定位已安装的插件脚本：

`<marketplace-root>/plugins/cb-hud/skills/cb-hud/scripts/cb-hud.js`

在当前项目或用户提供的项目路径中执行：

`node "<上述 cb-hud.js 路径>" show --project <项目路径>`

执行后读取 `<项目路径>/.codebuddy/settings.json`，确认 `statusLine.command` 指向 `cb-hud.js statusline`。

用中文提示用户重启 CodeBuddy，让状态行重新加载。
