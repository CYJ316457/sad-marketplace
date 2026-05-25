---
description: 初始化 CodeBuddy CB HUD 状态行
argument-hint: [项目路径]
allowed-tools: [Bash(node *), Read, Glob]
---

先定位已安装的插件脚本：

`<marketplace-root>/plugins/cb-hud/skills/cb-hud/scripts/cb-hud.js`

在当前项目或用户提供的项目路径中执行：

`node "<上述 cb-hud.js 路径>" init --project <项目路径>`

执行后检查 `<项目路径>/.codebuddy/settings.json`，确认存在：

```json
{
  "statusLine": {
    "type": "command",
    "command": "node \".../cb-hud.js\" statusline",
    "padding": 0
  }
}
```

用中文提示用户重启 CodeBuddy，让状态行重新加载。
