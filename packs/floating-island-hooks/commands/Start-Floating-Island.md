---
description: 启动当前项目内已安装的 Floating Island 悬浮窗，并返回实际启动脚本路径
argument-hint: [项目路径]
allowed-tools: [Bash(powershell *), Read, Glob]
---

优先定位当前项目里的悬浮窗启动脚本，按下面顺序检查：
- `<项目>/.codebuddy/floating-island/start-floating-island.cmd`
- `<项目>/.claude/floating-island/start-floating-island.cmd`
- `<项目>/.codex/floating-island/start-floating-island.cmd`
- `<项目>/.floating-island/start-floating-island.cmd`

如果用户提供了项目路径，就在该路径下检查；否则默认用当前工作目录。

找到脚本后执行：
`powershell -NoProfile -ExecutionPolicy Bypass -File "<对应的 start-floating-island.ps1>"`

输出要求：
- 用中文说明是否已启动
- 返回实际使用的悬浮窗目录
- 如果没找到启动脚本，明确提示用户先安装 `floating-island-hooks`
