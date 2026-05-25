---
description: 卸载 CodeBuddy CB HUD 状态行配置
argument-hint: [项目路径]
allowed-tools: [Bash(node *), Read, Glob]
---

先定位已安装的插件脚本：

`<marketplace-root>/plugins/cb-hud/skills/cb-hud/scripts/cb-hud.js`

在当前项目或用户提供的项目路径中执行：

`node "<上述 cb-hud.js 路径>" uninstall --project <项目路径>`

执行后检查：

- `<项目路径>/.codebuddy/settings.json` 不再包含 CB HUD 的 `statusLine`
- `<项目路径>/.codebuddy/cb-hud/` 已被删除

用中文提示用户重启 CodeBuddy，让卸载后的状态生效。
