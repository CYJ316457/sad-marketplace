---
description: 隐藏 CodeBuddy CB HUD 状态行但保留本地状态
argument-hint: [项目路径]
allowed-tools: [Bash(node *), Read, Glob]
---

先定位已安装的插件脚本：

`<marketplace-root>/plugins/cb-hud/skills/cb-hud/scripts/cb-hud.js`

在当前项目或用户提供的项目路径中执行：

`node "<上述 cb-hud.js 路径>" hide --project <项目路径>`

执行后读取 `<项目路径>/.codebuddy/settings.json`，确认 `statusLine` 已被移除。

用中文提示用户需要重启 CodeBuddy 才能看到隐藏效果。
